"""Set a user as admin by phone number.

Run: python manage.py set_first_admin +998999999999
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import UserRole

User = get_user_model()


class Command(BaseCommand):
    help = "Set a user as admin by phone number"

    def add_arguments(self, parser):
        parser.add_argument("phone", type=str, help="Phone number in +998XXXXXXXXX format")

    def handle(self, *args, **options):
        phone = options["phone"]
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Foydalanuvchi topilmadi: {phone}"))
            return

        user.role = UserRole.ADMIN
        user.is_staff = True
        user.save(update_fields=["role", "is_staff"])
        self.stdout.write(
            self.style.SUCCESS(f"{phone} ({user.profile.full_name if hasattr(user, 'profile') else ''}) admin qilindi.")
        )
