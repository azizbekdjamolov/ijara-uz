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

BOT_SITE_URL = getattr(settings, "TELEGRAM_BOT_DOMAIN", "https://ijara.uz").rstrip("/")

BOT_COMMANDS = {
    "/start": (
        "Salom! 👋 Ijara.uz botiga xush kelibsiz!\n\n"
        "Men sizga uy-joy ijarasi bo'yicha yordam beraman:\n\n"
        "🏠 E'lonlarni ko'rish\n"
        "🔍 Qidiruv\n"
        "📱 Ijara.uz dan foydalanish\n\n"
        f"Saytga o'tish: {BOT_SITE_URL}"
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
    telegram_id = message.get("from", {}).get("id")

    logger.info("[webhook] message from chat=%s text=%s", chat_id, text)

    from apps.telegram_bot.services import send_message
    from apps.telegram_bot.services.login_code import generate_login_code

    if text in ("/start", "/help"):
        if text == "/start" and telegram_id:
            code = generate_login_code(telegram_id)
            site_domain = getattr(settings, "TELEGRAM_BOT_DOMAIN", "https://ijara.uz").rstrip("/")
            mini_app_url = f"{site_domain}/telegram-app"
            reply = (
                f"Salom, {first_name}! 👋\n\n"
                "Ijara.uz — O'zbekistonda uy-joy ijarasi.\n\n"
                "Quyidagi tugmalar orqali foydalanishingiz mumkin:"
            )
            reply_markup = {
                "inline_keyboard": [
                    [{"text": "🏠 Ijara.uz ochish", "web_app": {"url": mini_app_url}}],
                    [{"text": "🔑 Kod orqali kirish", "callback_data": "login_code"}],
                    [{"text": "📋 Yordam", "callback_data": "help"}],
                ]
            }
        elif text == "/start":
            reply = BOT_COMMANDS["/start"]
            reply_markup = None
        else:
            reply = BOT_COMMANDS["/help"]
            reply_markup = None

        if first_name and text == "/help":
            reply = f"{first_name}, sizga qanday yordam bera olaman?\n\n" + reply

        from apps.telegram_bot.services import send_message as _send
        _send(chat_id, reply, reply_markup=reply_markup)
    elif text == "/login":
        if telegram_id:
            code = generate_login_code(telegram_id)
            site_domain = getattr(settings, "TELEGRAM_BOT_DOMAIN", "https://ijara.uz").rstrip("/")
            send_message(
                chat_id,
                f"🔑 Tasdiqlash kodi: <b>{code}</b>\n\n"
                f"Uni {site_domain}/login sahifasida kiriting.\n"
                "Kod 5 daqiqa ichida yaroqsiz bo'ladi.",
            )
        else:
            send_message(chat_id, "Xatolik yuz berdi.")
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


def _handle_callback(callback: dict) -> None:
    """Handle inline keyboard callback queries."""
    from apps.telegram_bot.services import send_message, _post
    from apps.telegram_bot.services.login_code import generate_login_code

    chat_id = callback["message"]["chat"]["id"]
    data = callback.get("data", "")
    telegram_id = callback.get("from", {}).get("id")

    # Answer the callback to remove loading state
    try:
        _post("answerCallbackQuery", json={"callback_query_id": callback["id"]})
    except Exception:
        pass

    logger.info("[webhook] callback from chat=%s data=%s", chat_id, data)

    if data == "login_code" and telegram_id:
        code = generate_login_code(telegram_id)
        send_message(
            chat_id,
            f"🔑 Tasdiqlash kodi: <b>{code}</b>\n\n"
            "Saytda \"Kod orqali kirish\" ni bosing va kodni kiriting.\n"
            "Kod 5 daiqqa ichida yaroqsiz bo'ladi.",
        )
    elif data == "help":
        send_message(chat_id, BOT_COMMANDS["/help"])


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
        callback = update.get("callback_query")
        if message:
            try:
                _handle_message(message)
            except Exception as exc:
                logger.exception("[webhook] xabarni qayta ishlashda xatolik: %s", exc)
        if callback:
            try:
                _handle_callback(callback)
            except Exception as exc:
                logger.exception("[webhook] callback qayta ishlashda xatolik: %s", exc)

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


# ─── One-time login code verification ──────────────────────────────────────


class VerifyLoginCodeView(APIView):
    """Verify a one-time code sent by the Telegram bot.

    POST /api/v1/auth/telegram/verify-code/
    Body: { "code": "123456" }
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthAnonRateThrottle]

    def post(self, request):
        code = (request.data.get("code") or "").strip()
        if not code or len(code) != 6 or not code.isdigit():
            return Response(
                {"message": "Noto'g'ri kod formati. 6 ta raqam kiriting."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.telegram_bot.services.login_code import verify_login_code

        telegram_id = verify_login_code(code)
        if telegram_id is None:
            return Response(
                {"message": "Kod noto'g'ri yoki muddati o'tgan."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            from apps.accounts.services.telegram_service import get_or_create_telegram_user

            user = get_or_create_telegram_user(telegram_id=telegram_id)

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
            logger.exception("[verify-code] xatolik: %s", exc)
            return Response(
                {"message": "Tizimga kirishda xatolik."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
