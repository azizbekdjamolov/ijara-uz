"""Async AI analysis with retries, exponential backoff and provider fallback.

Critical rule: if AI is unavailable the listing stays AI_CHECKING and the
periodic task re-queues it. Rejecting listings because AI is down is forbidden.
"""

import logging

from celery import shared_task

logger = logging.getLogger("apps.ai")


@shared_task(
    bind=True,
    max_retries=5,
    default_retry_delay=30,
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    acks_late=True,
)
def analyze_listing_task(self, listing_id: str) -> str:
    from apps.listings.models import Listing
    from apps.listings.services.listing_service import ListingService

    try:
        listing = Listing.objects.select_related("prop", "owner", "owner__profile").get(
            id=listing_id
        )
    except Listing.DoesNotExist:
        return "listing_not_found"

    if listing.status not in ("ai_checking", "pending_review"):
        return f"skip:{listing.status}"

    listing = ListingService.run_ai_pipeline(listing)

    from apps.notifications.services.notification_service import NotificationService

    NotificationService.listing_published(listing)
    return f"done:{listing.status}"


@shared_task
def expire_listings_task() -> int:
    from apps.listings.services.listing_service import ListingService

    return ListingService.expire_overdue()


@shared_task
def requeue_stuck_listings_task() -> int:
    """Re-queue AI_CHECKING listings that could not be analyzed (AI was down)."""
    from apps.listings.models import Listing

    stuck = Listing.objects.filter(status="ai_checking")
    count = 0
    for listing in stuck:
        analyze_listing_task.delay(str(listing.id))
        count += 1
    if count:
        logger.info("requeued %s stuck listings", count)
    return count


@shared_task
def process_document_task(document_id: str) -> str:
    from apps.ai.analyzers.document import analyze_document
    from apps.verification.models import VerificationDocument

    try:
        doc = VerificationDocument.objects.get(id=document_id)
    except VerificationDocument.DoesNotExist:
        return "document_not_found"
    analyze_document(doc)
    return "document_processed"
