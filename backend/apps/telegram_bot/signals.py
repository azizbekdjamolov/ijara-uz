"""Django signals — notify Telegram when a listing becomes published."""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.listings.models import Listing, ListingStatus

logger = logging.getLogger("apps.telegram_bot")


@receiver(pre_save, sender=Listing)
def _capture_previous_status(sender, instance, **kwargs):
    """Snapshot the current status before save so post_save can detect changes."""
    if instance.pk:
        try:
            old = sender.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
            instance._previous_status = old
        except Exception:
            instance._previous_status = None
    else:
        instance._previous_status = None


@receiver(post_save, sender=Listing)
def _on_listing_published(sender, instance, created, **kwargs):
    """Fire a Celery task when a listing transitions to PUBLISHED."""
    old_status = getattr(instance, "_previous_status", None)
    if instance.status == ListingStatus.PUBLISHED and old_status != ListingStatus.PUBLISHED:
        try:
            from apps.telegram_bot.tasks import notify_listing_published

            notify_listing_published.apply_async(args=[str(instance.pk)])
            logger.info("Scheduled Telegram notification for listing %s", instance.pk)
        except Exception:
            logger.exception("Failed to schedule Telegram notification for listing %s", instance.pk)
