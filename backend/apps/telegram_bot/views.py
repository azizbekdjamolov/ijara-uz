"""Telegram Mini App login endpoint.

POST /api/v1/auth/telegram/webapp-login/
Body: { "initData": "<Telegram WebApp initData string>" }

Validates the signed initData, finds or creates the user, returns JWT tokens.
"""

import logging

from django.db import transaction
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole, Profile
from apps.accounts.serializers import UserSerializer
from apps.core.throttles import AuthAnonRateThrottle
from apps.telegram_bot.webapp import validate_webapp_init_data

logger = logging.getLogger("apps.telegram_bot")


class WebAppLoginView(APIView):
    """Authenticate via Telegram Mini App initData (automatic, no user interaction)."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        init_data = request.data.get("initData", "")
        if not init_data:
            return Response(
                {"message": "initData talab qilinadi."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            trusted = validate_webapp_init_data(init_data)
        except ValueError as exc:
            return Response(
                {"message": str(exc)},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as exc:
            logger.exception("Telegram WebApp initData tekshirishda xatolik: %s", exc)
            return Response(
                {"message": "Telegram ma'lumotlarini tekshirishda xatolik."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        telegram_id = trusted["user_id"]
        username = trusted.get("username", "")
        first_name = trusted.get("first_name", "")
        last_name = trusted.get("last_name", "")
        photo_url = trusted.get("photo_url", "")
        full_name = f"{first_name} {last_name}".strip() or "Telegram foydalanuvchi"

        try:
            with transaction.atomic():
                user = User.objects.filter(telegram_id=telegram_id).first()
                if user is not None:
                    # Update profile info if changed
                    changed = False
                    if username and user.telegram_username != username:
                        user.telegram_username = username
                        changed = True
                    if photo_url and user.telegram_photo_url != photo_url:
                        user.telegram_photo_url = photo_url
                        changed = True
                    if full_name and not user.profile.full_name:
                        user.profile.full_name = full_name
                        user.profile.save(update_fields=["full_name", "updated_at"])
                    if changed:
                        user.save(update_fields=["telegram_username", "telegram_photo_url"])
                else:
                    user = User(
                        phone=None,
                        telegram_id=telegram_id,
                        telegram_username=username,
                        telegram_photo_url=photo_url,
                        role=UserRole.TENANT,
                    )
                    user.set_unusable_password()
                    user.save()
                    Profile.objects.update_or_create(
                        user=user, defaults={"full_name": full_name}
                    )

            if user.is_banned:
                return Response(
                    {"message": "Akkaunt bloklangan."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            refresh = RefreshToken.for_user(user)
            return Response({
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            })

        except Exception as exc:
            logger.exception("Telegram WebApp login xatolik: %s", exc)
            return Response(
                {"message": "Tizimga kirishda xatolik."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
