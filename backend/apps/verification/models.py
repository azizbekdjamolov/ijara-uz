import uuid

from django.conf import settings
from django.db import models


class DocumentType(models.TextChoices):
    PASSPORT = "passport", "Pasport"
    PROPERTY_DOC = "property_doc", "Mulk hujjati"
    OWNERSHIP_CERT = "ownership_cert", "Egalik guvohnomasi"
    UTILITY_BILL = "utility_bill", "Kommunal to'lov kvitansiyasi"
    OTHER = "other", "Boshqa"


class VerificationDocumentStatus(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    REVIEWING = "reviewing", "Ko'rib chiqilmoqda"
    VERIFIED = "verified", "Tasdiqlangan"
    REJECTED = "rejected", "Rad etilgan"


class VerificationDocument(models.Model):
    """Owner identity/property documents. Stored privately, never served publicly."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="verification_documents"
    )
    listing = models.ForeignKey(
        "listings.Listing",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verification_documents",
    )
    doc_type = models.CharField(max_length=16, choices=DocumentType.choices)
    file = models.FileField(upload_to="private/verification/")
    status = models.CharField(
        max_length=12,
        choices=VerificationDocumentStatus.choices,
        default=VerificationDocumentStatus.PENDING,
        db_index=True,
    )
    extracted_data = models.JSONField(default=dict, blank=True)
    moderator_note = models.CharField(max_length=500, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_documents",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tasdiqlash hujjati"
        verbose_name_plural = "Tasdiqlash hujjatlari"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "status"])]

    def __str__(self) -> str:
        return f"{self.user_id} {self.doc_type} {self.status}"
