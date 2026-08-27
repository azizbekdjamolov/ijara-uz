"""Reservation (band qilish) model.

A reservation ties a listing to an interested party (the chat partner). The
listing only becomes publicly "Band" (reserved) once the candidate gives
consent; until then it stays "Bo'sh" (published / available).
"""

import uuid

from django.db import models

from apps.listings.models import Listing
from apps.chat.models import Conversation


class ReservationStatus(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    CONFIRMED = "confirmed", "Tasdiqlandi"
    DECLINED = "declined", "Rad etildi"
    CANCELLED = "cancelled", "Bekor qilindi"


class Reservation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="reservations"
    )
    conversation = models.ForeignKey(
        Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name="reservations"
    )
    initiator = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="reservations_initiated"
    )
    candidate = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="reservations_received"
    )
    status = models.CharField(
        max_length=16, choices=ReservationStatus.choices, default=ReservationStatus.PENDING
    )
    note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Band qilish so'rovi"
        verbose_name_plural = "Band qilish so'rovlari"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing", "status"]),
            models.Index(fields=["candidate", "status"]),
        ]

    def __str__(self) -> str:
        return f"Reservation {self.listing_id} -> {self.candidate_id} ({self.status})"
