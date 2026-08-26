"""Reject demo/test listings that were auto-published by seed_demo.

Identifies test data by:
  1. Listings owned by demo users (+99890100000X, +99890010000X)
  2. Listings with nonsensical titles (only alphanumeric, no Cyrillic/Latin words)
  3. Listings with absurd prices (> 50M so'm)

Run: python manage.py cleanup_demo_data [--dry-run]
"""

import re

from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.listings.models import Listing, ListingStatus


DEMO_PHONE_PATTERN = re.compile(r"^\+99890[01]\d{7}$")
GARBAGE_TITLE = re.compile(r"^[a-zA-Z0-9]{3,}$")
MAX_PRICE = 50_000_000


class Command(BaseCommand):
    help = "Reject test/demo listings with garbage data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be rejected without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        demo_owner_qs = Q(owner__phone__regex=r"^\+99890[01]\d{7}$")
        garbage_title_qs = Q(title__regex=r"^[a-zA-Z0-9]{3,}$")
        high_price_qs = Q(price__gt=MAX_PRICE)

        qs = Listing.objects.filter(
            status__in=[
                ListingStatus.PUBLISHED,
                ListingStatus.APPROVED,
                ListingStatus.PENDING_REVIEW,
            ]
        ).filter(demo_owner_qs | garbage_title_qs | high_price_qs)

        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.SUCCESS("Test e'lonlar topilmadi."))
            return

        if dry_run:
            self.stdout.write(f"Qurilgan e'lonlar soni: {count}")
            for listing in qs[:20]:
                self.stdout.write(
                    f"  [{listing.status}] {listing.title!r} — "
                    f"{listing.price:,} so'm — {listing.owner.phone}"
                )
            if count > 20:
                self.stdout.write(f"  ... va yana {count - 20} ta")
            return

        updated = qs.update(status=ListingStatus.REJECTED)
        self.stdout.write(
            self.style.SUCCESS(f"{updated} ta test e'lon 'rejected' holatiga o'tkazildi.")
        )
