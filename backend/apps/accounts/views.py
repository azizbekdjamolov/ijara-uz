import logging

from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import (
    VerificationChannel,
    VerificationPurpose,
)
from apps.accounts.serializers import (
    ChangeRoleSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
    VerificationCodeSerializer,
)
from apps.accounts.services.verification_service import (
    VerificationCooldownError,
    VerificationService,
    VerificationServiceError,
)
from apps.core.throttles import AuthAnonRateThrottle

logger = logging.getLogger("apps.accounts")

User = get_user_model()

UZ_ERROR_MESSAGES = {
    "credentials": "Telefon raqam yoki parol noto'g'ri.",
    "inactive": "Akkaunt faol emas.",
    "banned": "Akkaunt bloklangan.",
    "cooldown": "Kodni qayta so'rash uchun biroz kuting.",
}


class RegisterView(generics.CreateAPIView):
    """Create an account and send a verification code to the phone."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        try:
            VerificationService.create_and_send(
                user=user,
                channel=VerificationChannel.PHONE,
                purpose=VerificationPurpose.REGISTRATION,
            )
        except VerificationServiceError as exc:
            logger.warning("register: code not sent for %s: %s", user.phone, exc)

        return Response(
            {
                "user": UserSerializer(user).data,
                "message": "Ro'yxatdan o'tdingiz. Telefonni tasdiqlash kodi yuborildi.",
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """Authenticate by phone or email, returning JWT access/refresh tokens."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"].strip()
        password = serializer.validated_data["password"]

        user = authenticate(request, username=identifier, password=password)

        if user is None:
            return Response(
                {"message": UZ_ERROR_MESSAGES["credentials"]},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"message": UZ_ERROR_MESSAGES["inactive"]},
                status=status.HTTP_403_FORBIDDEN,
            )
        if user.is_banned:
            return Response(
                {"message": UZ_ERROR_MESSAGES["banned"]},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class _VerifyCodeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    channel: str = ""
    purpose: str = VerificationPurpose.REGISTRATION

    def post(self, request):
        serializer = VerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            VerificationService.verify_code(
                user=request.user,
                channel=self.channel,
                purpose=self.purpose,
                code=serializer.validated_data["code"],
            )
        except VerificationServiceError as exc:
            return Response(
                {"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "user": UserSerializer(request.user).data,
                "message": f"{'Telefon' if self.channel == 'phone' else 'Email'} tasdiqlandi.",
            }
        )


class VerifyPhoneView(_VerifyCodeView):
    channel = VerificationChannel.PHONE


class VerifyEmailView(_VerifyCodeView):
    channel = VerificationChannel.EMAIL


class ResendVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channel = serializer.validated_data["channel"]

        if channel == VerificationChannel.PHONE and request.user.is_phone_verified:
            return Response(
                {"message": "Telefon allaqachon tasdiqlangan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if channel == VerificationChannel.EMAIL and request.user.is_email_verified:
            return Response(
                {"message": "Email allaqachon tasdiqlangan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            VerificationService.create_and_send(
                user=request.user,
                channel=channel,
                purpose=VerificationPurpose.REGISTRATION,
            )
        except VerificationCooldownError as exc:
            return Response(
                {"message": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        except VerificationServiceError as exc:
            return Response(
                {"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response({"message": "Tasdiqlash kodi yuborildi."})


class MeView(generics.RetrieveUpdateAPIView):
    """Current user profile (retrieve + partial update)."""

    queryset = User.objects.select_related("profile").all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangeRoleView(APIView):
    """Moderator-only endpoint to switch a user between tenant/owner roles."""

    permission_classes = [permissions.IsAuthenticated]

    def _check_permission(self, user):
        if not user.is_moderator():
            self.permission_denied(
                self.request, message="Boshqa foydalanuvchi rolini o'zgartirish uchun ruxsat yo'q."
            )

    def post(self, request, user_id):
        self._check_permission(request.user)
        serializer = ChangeRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            target = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"message": "Foydalanuvchi topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        target.role = serializer.validated_data["role"]
        target.save(update_fields=["role"])
        return Response(
            {"message": "Rol yangilandi.", "user": UserSerializer(target).data}
        )
