import contextlib
import logging

from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, serializers, status
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
    PublicProfileSerializer,
    RegisterCompleteSerializer,
    RegisterSerializer,
    ResendVerificationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    VerificationCodeSerializer,
)
from apps.accounts.services.telegram_service import (
    TelegramAuthError,
    get_or_create_telegram_user,
    validate_telegram_data,
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
    """Create an account and send a verification code to the phone.

    IMPORTANT: Does NOT return JWT tokens. User must verify phone with
    6-digit code before being considered logged in.
    """

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def create(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()
        except Exception as exc:
            logger.exception("register: serializer save xatolik: %s", exc)
            raise

        # OTP yuborish
        verification = None
        try:
            verification = VerificationService.create_and_send(
                user=user,
                channel=VerificationChannel.PHONE,
                purpose=VerificationPurpose.REGISTRATION,
            )
            logger.info(
                "register: OTP yuborildi phone=%s verification_id=%s channel=phone",
                user.phone,
                verification.id if verification else "??",
            )
        except VerificationServiceError as exc:
            logger.warning("register: code not sent for %s: %s", user.phone, exc)
        except Exception as exc:
            logger.exception("register: kutilmagan xatolik phone=%s err=%s", getattr(user, "phone", "?"), exc)

        try:
            data: dict = {
                "user": UserSerializer(user).data,
                "phone": user.phone,
                "message": "Ro'yxatdan o'tdingiz. Telefonni tasdiqlash kodi yuborildi.",
            }
        except Exception as exc:
            logger.exception("register: response tayyorlashda xatolik: %s", exc)
            return Response({"message": "Ro'yxatdan o'tdingiz, lekin javob tayyorlashda xatolik.", "phone": getattr(user, "phone", "")}, status=status.HTTP_201_CREATED)

        from django.conf import settings as dj_settings

        if getattr(dj_settings, "DEBUG", False) and verification is not None:
            debug_code = getattr(verification, "debug_code", None)
            if debug_code:
                data["debug_code"] = debug_code

        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Authenticate by phone or email, returning JWT access/refresh tokens."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            identifier = serializer.validated_data["identifier"].strip()
            password = serializer.validated_data["password"]
        except Exception as exc:
            logger.warning("login: validation xatolik: %s", exc)
            raise

        try:
            user = authenticate(request, username=identifier, password=password)
        except Exception as exc:
            logger.exception("login: authenticate kutilmagan xatolik: %s", exc)
            return Response({"message": "Xatolik yuz berdi, qayta urinib ko'ring"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

        try:
            refresh = RefreshToken.for_user(user)
        except Exception as exc:
            logger.exception("login: token yaratishda xatolik user=%s: %s", getattr(user, "id", "?"), exc)
            return Response({"message": "Token yaratishda xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        try:
            user_data = UserSerializer(user).data
        except Exception as exc:
            logger.exception("login: user serialize xatolik: %s", exc)
            user_data = {"id": str(user.id), "phone": getattr(user, "phone", "")}
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": user_data,
            }
        )


class TelegramLoginView(APIView):
    """Authenticate with a verified Telegram Login Widget payload."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        try:
            trusted = validate_telegram_data(request.data)
            user = get_or_create_telegram_user(**trusted)
        except TelegramAuthError as exc:
            return Response(
                {"message": str(exc)}, status=status.HTTP_401_UNAUTHORIZED
            )
        except serializers.ValidationError as exc:
            return Response(
                {"message": "Telegram ma'lumotlari noto'g'ri.", "details": exc.detail},
                status=status.HTTP_400_BAD_REQUEST,
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
    """
    2-bosqich: OTP tasdiqlash.
    Faqat telefonni tasdiqlaydi, token BERMAYDI (spec: token faqat parol dan keyin).
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]
    channel: str = ""
    purpose: str = VerificationPurpose.REGISTRATION

    def _resolve_user(self, request):
        # Authenticated request -> use that user (code-only body keeps working)
        if request.user and request.user.is_authenticated:
            return request.user
        # Unauthenticated (registration flow) -> require phone/email in body
        if self.channel == VerificationChannel.PHONE:
            phone = (
                request.data.get("phone")
                or request.data.get("identifier")
                or request.data.get("phone_number")
            )
            if not phone or not isinstance(phone, str):
                return None
            phone = phone.strip()
            try:
                return User.objects.get(phone=phone)
            except User.DoesNotExist:
                return None
        else:
            email = request.data.get("email") or request.data.get("identifier")
            if not email or not isinstance(email, str):
                return None
            email = email.strip()
            try:
                return User.objects.get(email=email)
            except User.DoesNotExist:
                return None

    def post(self, request):
        serializer = VerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = self._resolve_user(request)
        if user is None:
            # Keep 401 for unauthenticated without phone to preserve old behavior/tests
            if not (request.user and request.user.is_authenticated):
                return Response(
                    {"message": "Avval telefon raqamingizni kiriting."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            return Response(
                {"message": "Foydalanuvchi topilmadi."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if user.is_banned:
            return Response(
                {"message": UZ_ERROR_MESSAGES["banned"]},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            VerificationService.verify_code(
                user=user,
                channel=self.channel,
                purpose=self.purpose,
                code=serializer.validated_data["code"],
            )
        except VerificationServiceError as exc:
            return Response(
                {"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        logger.info("[verify] OTP tasdiqlandi: user=%s phone=%s channel=%s", user.id, getattr(user, "phone", ""), self.channel)
        # IMPORTANT: Token bermaymiz, faqat tasdiqlash
        return Response(
            {
                "user": UserSerializer(user).data,
                "phone": getattr(user, "phone", ""),
                "is_phone_verified": user.is_phone_verified,
                "message": f"{'Telefon' if self.channel == 'phone' else 'Email'} tasdiqlandi. Endi parolni kiriting.",
            }
        )


class VerifyPhoneView(_VerifyCodeView):
    channel = VerificationChannel.PHONE


class VerifyEmailView(_VerifyCodeView):
    channel = VerificationChannel.EMAIL


class RegisterCompleteView(APIView):
    """
    3-4 bosqich: OTP tasdiqlangandan keyin parolni o'rnatish va JWT berish.
    Spec bo'yicha: telefon → OTP → parol → token
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        serializer = RegisterCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        password = serializer.validated_data["password"]

        # Telefon tasdiqlanganligini tekshirish
        if not user.is_phone_verified:
            return Response(
                {"message": "Telefon hali tasdiqlanmagan. Avval OTP ni tasdiqlang."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Password ni o'rnatish
        user.set_password(password)
        user.save(update_fields=["password"])
        logger.info("[register/complete] parol o'rnatildi: user=%s phone=%s", user.id, user.phone)

        # Trust tier update (agar hali bo'lmasa)
        from apps.accounts.services.user_service import UserService
        with contextlib.suppress(Exception):
            UserService.recompute_trust_tier(user)

        # Endi JWT beramiz
        refresh = RefreshToken.for_user(user)
        logger.info("[register/complete] token berildi: user=%s", user.id)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "message": "Parol o'rnatildi. Tizimga kirildi.",
            }
        )


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def _resolve_user(self, request, channel: str):
        if request.user and request.user.is_authenticated:
            return request.user
        # Unauthenticated resend (registration flow before login)
        if channel == VerificationChannel.PHONE:
            phone = (
                request.data.get("phone")
                or request.data.get("identifier")
                or request.data.get("phone_number")
            )
            if not phone or not isinstance(phone, str):
                return None
            try:
                return User.objects.get(phone=phone.strip())
            except User.DoesNotExist:
                return None
        else:
            email = request.data.get("email") or request.data.get("identifier")
            if not email or not isinstance(email, str):
                return None
            try:
                return User.objects.get(email=email.strip())
            except User.DoesNotExist:
                return None

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        channel = serializer.validated_data["channel"]

        user = self._resolve_user(request, channel)
        if user is None:
            return Response(
                {"message": "Avval telefon raqamingizni kiriting."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if channel == VerificationChannel.PHONE and user.is_phone_verified:
            return Response(
                {"message": "Telefon allaqachon tasdiqlangan."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if channel == VerificationChannel.EMAIL and user.is_email_verified:
            return Response(
                {"message": "Email allaqachon tasdiqlangan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            VerificationService.create_and_send(
                user=user,
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
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(UserSerializer(instance).data)


class PublicProfileView(generics.RetrieveAPIView):
    """Public profile of any user (read-only)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = PublicProfileSerializer

    def get_object(self):
        user_id = self.kwargs["user_id"]
        return User.objects.select_related("profile").get(pk=user_id)


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
