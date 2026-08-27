"""Configure the Telegram bot: menu commands + webhook.

Usage:  python manage.py setup_telegram_bot
"""

import logging

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.telegram_bot.services import (
    set_my_commands,
    set_my_description,
    set_my_short_description,
    set_webhook,
)

logger = logging.getLogger("apps.telegram_bot")


class Command(BaseCommand):
    help = "Set Telegram bot menu commands and register the webhook"

    def handle(self, *args, **options):
        commands = [
            {"command": "start", "description": "Ijara.uz ni ishga tushirish"},
            {"command": "help", "description": "Yordam"},
        ]
        try:
            set_my_commands(commands)
            self.stdout.write(self.style.SUCCESS("Bot buyruqlari muvaffaqiyatli o'rnatildi."))
        except Exception as exc:
            logger.warning("Bot buyruqlarini o'rnatib bo'lmadi: %s", exc)
            self.stdout.write(self.style.WARNING(f"Bot buyruqlarini o'rnatib bo'lmadi: {exc}"))

        try:
            set_my_description(
                "Ijara.uz — O'zbekistonda kvartira va xonalar ijarasi boti. "
                "E'lonlarni qidirish va ko'rish, shuningdek o'z e'loningizni joylash mumkin."
            )
            set_my_short_description("Ijara.uz — uy-joy ijarasi bo'yicha e'lonlar")
            self.stdout.write(self.style.SUCCESS("Bot tavsifi muvaffaqiyatli o'rnatildi."))
        except Exception as exc:
            logger.warning("Bot tavsifini o'rnatib bo'lmadi: %s", exc)
            self.stdout.write(self.style.WARNING(f"Bot tavsifini o'rnatib bo'lmadi: {exc}"))

        webhook_url = getattr(settings, "TELEGRAM_WEBHOOK_URL", "")
        if not webhook_url:
            self.stdout.write(
                self.style.WARNING(
                    "TELEGRAM_WEBHOOK_URL sozlanmagan — webhook o'rnatilmadi. "
                    "Bot faqat /start va /help buyruqlariga javob beradi."
                )
            )
            return

        secret = getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")
        try:
            set_webhook(webhook_url, secret_token=secret or None)
            self.stdout.write(
                self.style.SUCCESS(f"Webhook muvaffaqiyatli ulandi: {webhook_url}")
            )
        except Exception as exc:
            logger.warning("Webhook ni o'rnatib bo'lmadi: %s", exc)
            self.stdout.write(
                self.style.WARNING(
                    f"Webhook o'rnatilmadi ({exc}). Bot yangilanishlarni qabul qila olmaydi."
                )
            )
