"""Publish listings stuck in non-final states (AI_CHECKING / PENDING_REVIEW / NEEDS_REVIEW).

Run manually or via the deploy startCommand so listings created before the
"publish immediately" change become visible. Keeps the recorded risk data.
"""

from django.core.management.base import BaseCommand

from apps.listings.models import Listing, ListingStatus
from apps.listings.services.listing_service import ListingService


class Command(BaseCommand):
    help = "Nashr bo'lmagan (ai_checking/pending_review/needs_review) e'lonlarni nashr qiladi."

    def handle(self, *args, **options):
        stuck = Listing.objects.filter(
            status__in=[
                ListingStatus.AI_CHECKING,
                ListingStatus.PENDING_REVIEW,
                ListingStatus.NEEDS_REVIEW,
            ]
        )
        total = stuck.count()
        published = 0
        for listing in stuck:
            try:
                ListingService.transition(
                    listing, ListingStatus.APPROVED, note="Qayta nashr (recovery)"
                )
                ListingService.transition(
                    listing, ListingStatus.PUBLISHED, note="Qayta nashr (recovery)"
                )
                published += 1
            except Exception as exc:  # noqa: BLE001
                self.stderr.write(f"{listing.id}: {exc}")
        self.stdout.write(
            self.style.SUCCESS(f"{published}/{total} ta e'lon nashr qilindi.")
        )
