import uuid

from django.conf import settings
from django.db import models


class ListingEventType(models.TextChoices):
    VIEW = "view", "Ko'rish"
    CONTACT = "contact", "Aloqa"
    FAVORITE = "favorite", "Saqlash"


class ListingEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing", on_delete=models.CASCADE, related_name="events"
    )
    event_type = models.CharField(max_length=12, choices=ListingEventType.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="listing_events",
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "E'lon hodisasi"
        verbose_name_plural = "E'lon hodisalari"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing", "event_type", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} {self.listing_id}"
