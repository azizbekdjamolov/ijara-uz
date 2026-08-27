"""Promote a user to admin.

The owner logs in via Telegram (no phone), so this supports promoting by
telegram id / username / phone. All arguments are optional: with none given
it is a no-op (safe to call from the deploy startCommand).

Run:
    python manage.py set_first_admin --telegram-id 123456789
    python manage.py set_first_admin --telegram-username ijaralaruz_bot
    python manage.py set_first_admin --phone +998999999999
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Foydalanuvchini admin qilish (telefon, telegram id yoki username bo'yicha)."

    def add_arguments(self, parser):
        parser.add_argument("--phone", type=str, default=None)
        parser.add_argument("--telegram-id", type=str, default=None)
        parser.add_argument("--telegram-username", type=str, default=None)

    def _find(self, options):
        if options["phone"]:
            return User.objects.filter(phone=options["phone"]).first()
        if options["telegram_id"]:
            try:
                tid = int(options["telegram_id"])
            except (TypeError, ValueError):
                self.stderr.write(self.style.ERROR("Telegram id raqam bo'lishi kerak."))
                return None
            return User.objects.filter(telegram_id=tid).first()
        if options["telegram_username"]:
            return User.objects.filter(
                telegram_username=options["telegram_username"].lstrip("@")
            ).first()
        return None

    def handle(self, *args, **options):
        user = self._find(options)
        if user is None:
            if not (options["phone"] or options["telegram_id"] or options["telegram_username"]):
                self.stdout.write("Admin belgilanmadi (argumentlar yo'q).")
            else:
                self.stdout.write(self.style.ERROR("Foydalanuvchi topilmadi."))
            return

        user.role = UserRole.ADMIN
        user.is_staff = True
        user.save(update_fields=["role", "is_staff"])
        self.stdout.write(
            self.style.SUCCESS(
                f"{user.telegram_username or user.phone or user.id} admin qilindi."
            )
        )
