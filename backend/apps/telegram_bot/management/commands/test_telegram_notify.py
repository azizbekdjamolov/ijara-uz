"""Send a test listing notification to the configured Telegram channel.

Usage:  python manage.py test_telegram_notify <listing_id>
"""

from django.core.management.base import BaseCommand

from apps.tasks import notify_listing_published


class Command(BaseCommand):
    help = "Send a test Telegram notification for a listing"

    def add_arguments(self, parser):
        parser.add_argument("listing_id", type=str, help="UUID of the listing to notify about")

    def handle(self, *args, **options):
        listing_id = options["listing_id"]
        self.stdout.write(f"Yuborilmoqda... listing={listing_id}")
        result = notify_listing_published(listing_id)
        self.stdout.write(self.style.SUCCESS(f"Natija: {result}"))
