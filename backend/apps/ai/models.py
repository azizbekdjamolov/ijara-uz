import uuid

from django.db import models


class AnalyzerType(models.TextChoices):
    IMAGE = "image", "Rasm"
    TEXT = "text", "Matn"
    PRICE = "price", "Narx"
    DOCUMENT = "document", "Hujjat"


class AIAnalysis(models.Model):
    """Structured result of one analyzer run. Raw AI payloads are never stored."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        "listings.Listing", on_delete=models.CASCADE, related_name="ai_analyses"
    )
    analyzer_type = models.CharField(max_length=16, choices=AnalyzerType.choices)
    provider = models.CharField(max_length=32, help_text="gemini | mock | rules")
    model = models.CharField(max_length=64, blank=True)
    score = models.FloatField(null=True, blank=True)
    result = models.JSONField(default=dict)
    confidence = models.FloatField(null=True, blank=True)
    reasons = models.JSONField(default=list, blank=True)
    raw_response_reference = models.CharField(
        max_length=255, blank=True, help_text="Object key if raw data was persisted"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "AI tahlili"
        verbose_name_plural = "AI tahlillari"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["listing", "analyzer_type"]),
            models.Index(fields=["provider", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.listing_id} {self.analyzer_type} {self.provider}"


class RiskLevel(models.TextChoices):
    LOW = "low", "Past xavf"
    MEDIUM = "medium", "O'rtacha xavf"
    HIGH = "high", "Yuqori xavf"


class RiskAssessment(models.Model):
    """Deterministic, reproducible risk score for a listing."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.OneToOneField(
        "listings.Listing", on_delete=models.CASCADE, related_name="risk"
    )
    score = models.PositiveSmallIntegerField(default=0)
    level = models.CharField(max_length=8, choices=RiskLevel.choices, default=RiskLevel.LOW)
    reasons = models.JSONField(default=list, blank=True)
    weights = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Xavf bahosi"
        verbose_name_plural = "Xavf baholari"
        ordering = ["-score"]

    def __str__(self) -> str:
        return f"{self.listing_id} {self.score} {self.level}"
