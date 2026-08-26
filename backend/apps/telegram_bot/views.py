"""Telegram Mini App login endpoint + webhook handler."""

import hashlib
import hmac
import json
import logging

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse, HttpResponseForbidden
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import User, UserRole, Profile
from apps.accounts.serializers import UserSerializer
from apps.core.throttles import AuthAnonRateThrottle
from apps.telegram_bot.webapp import validate_webapp_init_data

logger = logging.getLogger("apps.telegram_bot")


# ─── Webhook handler ──────────────────────────────────────────────────────

BOT_COMMANDS = {
    "/start": (
        "Salom! 👋 Ijara.uz botiga xush kelibsiz!\n\n"
        "Men sizga uy-joy ijarasi bo'yicha yordam beraman:\n\n"
        "🏠 E'lonlarni ko'rish\n"
        "🔍 Qidiruv\n"
        "📱 Ijara.uz dan foydalanish\n\n"
        "Saytga o'tish: https://ijara-frontend.onrender.com"
    ),
    "/help": (
        "Ijara.uz Bot Yordam 📋\n\n"
        "Bu bot orqali siz:\n"
        "• Yangi e'lonlardan xabardor bo'lasiz\n"
        "• Sevimli e'lonlarni kuzatasiz\n"
        "• Ijara.uz saytiga o'tasiz\n\n"
        "Savollaringiz bo'lsa, support@ijara.uz ga yozing."
    ),
}


def _bot_token() -> str:
    return getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""


def _verify_webhook(request_body: bytes) -> bool:
    """Optional: verify secret_token if WEBHOOK_SECRET is set."""
    secret = getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")
    if not secret:
        return True
    token = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    return hmac.compare_digest(token, secret)


def _handle_message(message: dict) -> None:
    """Process a single incoming Telegram message."""
    chat_id = message["chat"]["id"]
    text = (message.get("text") or "").strip()
    first_name = message.get("from", {}).get("first_name", "")

    logger.info("[webhook] message from chat=%s text=%s", chat_id, text)

    from apps.telegram_bot.services import send_message

    if text in BOT_COMMANDS:
        reply = BOT_COMMANDS[text]
        if first_name:
            reply = f"{first_name}, salom!\n\n" + reply
        send_message(chat_id, reply)
    elif text.startswith("/"):
        send_message(
            chat_id,
            "Noma'lum buyruq. /help yoki /start ni sinab ko'ring.",
        )
    else:
        send_message(
            chat_id,
            "Men faqat buyruqlarni tushunaman. /start yoki /help ni bosing.",
        )


@method_decorator(csrf_exempt, name="dispatch")
class TelegramWebhookView(View):
    """Receive updates from Telegram via webhook."""

    def post(self, request):
        if not _verify_webhook(request.body):
            return HttpResponseForbidden("Invalid token")

        try:
            update = json.loads(request.body)
        except (json.JSONDecodeError, ValueError):
            return HttpResponse("bad json", status=400)

        message = update.get("message")
        if message:
            try:
                _handle_message(message)
            except Exception as exc:
                logger.exception("[webhook] xabarni qayta ishlashda xatolik: %s", exc)

        return HttpResponse("ok")


# ─── Mini App login ────────────────────────────────────────────────────────


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
