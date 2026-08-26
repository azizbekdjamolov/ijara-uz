"""Set the Telegram bot menu commands.

Usage:  python manage.py setup_telegram_bot
"""

from django.core.management.base import BaseCommand

from apps.telegram_bot.services import set_my_commands


class Command(BaseCommand):
    help = "Set Telegram bot menu commands (/start, /help)"

    def handle(self, *args, **options):
        commands = [
            {"command": "start", "description": "Ijara.uz ni ishga tushirish"},
            {"command": "help", "description": "Yordam"},
        ]
        set_my_commands(commands)
        self.stdout.write(self.style.SUCCESS("Bot buyruqlari muvaffaqiyatli o'rnatildi."))
