import uuid

from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    LISTING_APPROVED = "listing_approved", "E'lon tasdiqlandi"
    LISTING_REJECTED = "listing_rejected", "E'lon rad etildi"
    LISTING_REVIEW = "listing_review", "E'lon tekshiruvda"
    NEW_MATCH = "new_match", "Yangi mos e'lon"
    PRICE_CHANGED = "price_changed", "Narx o'zgardi"
    NEW_MESSAGE = "new_message", "Yangi xabar"
    REPORT_UPDATE = "report_update", "Shikoyat holati"
    VERIFICATION_RESULT = "verification_result", "Tasdiqlash natijasi"
    SYSTEM = "system", "Tizim xabari"


class Notification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    type = models.CharField(max_length=24, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(max_length=1000, blank=True)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Bildirishnoma"
        verbose_name_plural = "Bildirishnomalar"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read", "-created_at"])]

    def __str__(self) -> str:
        return f"{self.user_id} {self.type}"
