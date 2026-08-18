import uuid

from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class PropertyType(models.TextChoices):
    APARTMENT = "apartment", "Kvartira"
    HOUSE = "house", "Uy"
    ROOM = "room", "Xona"
    OFFICE = "office", "Ofis"
    COMMERCIAL = "commercial", "Tijorat"


class LocationAccuracy(models.TextChoices):
    EXACT = "exact", "Aniq manzil"
    APPROXIMATE = "approximate", "Taxminiy joylashuv"


class Amenity(models.Model):
    key = models.SlugField(max_length=64, unique=True)
    label_uz = models.CharField(max_length=120)
    icon = models.CharField(max_length=64, blank=True)

    class Meta:
        verbose_name = "Qulaylik"
        verbose_name_plural = "Qulayliklar"
        ordering = ["key"]

    def __str__(self) -> str:
        return self.label_uz


class Property(TimeStampedModel):
    """Physical attributes of a property (independent of its marketplace listing)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="properties",
    )
    property_type = models.CharField(
        max_length=16, choices=PropertyType.choices, default=PropertyType.APARTMENT
    )
    rooms = models.PositiveSmallIntegerField(default=1)
    area = models.FloatField(help_text="Umumiy maydon, m²")
    floor = models.PositiveSmallIntegerField(null=True, blank=True)
    total_floors = models.PositiveSmallIntegerField(null=True, blank=True)
    furnished = models.BooleanField(default=False)
    has_parking = models.BooleanField(default=False)
    has_elevator = models.BooleanField(default=False)
    has_ac = models.BooleanField(default=False)
    has_internet = models.BooleanField(default=False)
    family_ok = models.BooleanField(default=True)
    students_ok = models.BooleanField(default=True)
    min_rental_months = models.PositiveSmallIntegerField(default=1)
    deposit = models.PositiveBigIntegerField(null=True, blank=True, help_text="Kafolat (so'm)")
    description = models.TextField(max_length=5000, blank=True)

    city = models.CharField(max_length=64, default="Toshkent", db_index=True)
    district = models.CharField(max_length=64, db_index=True)
    address_line = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_accuracy = models.CharField(
        max_length=16, choices=LocationAccuracy.choices, default=LocationAccuracy.EXACT
    )
    amenities = models.ManyToManyField(Amenity, blank=True, related_name="properties")

    class Meta:
        verbose_name = "Mulk"
        verbose_name_plural = "Mulklar"
        indexes = [
            models.Index(fields=["city", "district"]),
            models.Index(fields=["property_type", "rooms"]),
        ]

    def __str__(self) -> str:
        return f"{self.property_type} {self.rooms}xona {self.area}m² {self.district}"


class ListingStatus(models.TextChoices):
    DRAFT = "draft", "Qoralama"
    PENDING_REVIEW = "pending_review", "Ko'rib chiqilmoqda"
    AI_CHECKING = "ai_checking", "AI tekshirilmoqda"
    NEEDS_REVIEW = "needs_review", "Qo'shimcha tekshiruv talab qilinadi"
    APPROVED = "approved", "Tasdiqlangan"
    PUBLISHED = "published", "E'lon qilingan"
    PAUSED = "paused", "To'xtatilgan"
    REJECTED = "rejected", "Rad etilgan"
    EXPIRED = "expired", "Muddati o'tgan"
    RENTED = "rented", "Ijaraga berilgan"
    DELETED = "deleted", "O'chirilgan"


class Listing(TimeStampedModel):
    """Marketplace entity: price, status, lifecycle. Property holds physical facts."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
        db_index=True,
    )
    prop = models.OneToOneField(
        Property, on_delete=models.CASCADE, related_name="listing"
    )
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=255, unique=True, db_index=True, blank=True)
    price = models.PositiveBigIntegerField(help_text="Oylik ijara narxi (so'm)")
    currency = models.CharField(max_length=8, default="UZS")
    status = models.CharField(
        max_length=24, choices=ListingStatus.choices, default=ListingStatus.DRAFT, db_index=True
    )
    views = models.PositiveIntegerField(default=0)
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    moderation_note = models.CharField(max_length=500, blank=True)
    auto_renew = models.BooleanField(default=True, help_text="Muddati tugaganda avtomatik yangilash")

    class Meta:
        verbose_name = "E'lon"
        verbose_name_plural = "E'lonlar"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["price"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} — {self.price} so'm"

    @property
    def is_public(self) -> bool:
        return self.status == ListingStatus.PUBLISHED


class ListingImage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="listings/%Y/%m/")
    thumb = models.ImageField(upload_to="listings/thumbs/%Y/%m/", null=True, blank=True)
    phash = models.CharField(max_length=64, db_index=True, blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "E'lon rasmi"
        verbose_name_plural = "E'lon rasmlari"
        ordering = ["order", "created_at"]

    def __str__(self) -> str:
        return f"{self.listing_id} img {self.order}"


class Favorite(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites"
    )
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="favorites"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Saqlangan e'lon"
        verbose_name_plural = "Saqlangan e'lonlar"
        constraints = [
            models.UniqueConstraint(fields=["user", "listing"], name="unique_favorite")
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.user_id} -> {self.listing_id}"


class ReportReason(models.TextChoices):
    FAKE_LISTING = "fake_listing", "Soxta e'lon"
    NOT_AVAILABLE = "not_available", "Mavjud emas"
    MISLEADING_IMAGES = "misleading_images", "Chalg'ituvchi rasmlar"
    SUSPICIOUS_PRICE = "suspicious_price", "Shubhali narx"
    SCAM = "scam", "Firibgarlik"
    INAPPROPRIATE = "inappropriate", "Nojo'ya mazmun"
    OTHER = "other", "Boshqa"


class ReportStatus(models.TextChoices):
    NEW = "new", "Yangi"
    IN_REVIEW = "in_review", "Ko'rib chiqilmoqda"
    RESOLVED = "resolved", "Hal qilingan"
    DISMISSED = "dismissed", "Rad etilgan"


class Report(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports"
    )
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="reports", null=True, blank=True
    )
    conversation = models.ForeignKey(
        "chat.Conversation",
        on_delete=models.CASCADE,
        related_name="reports",
        null=True,
        blank=True,
    )
    reason = models.CharField(max_length=24, choices=ReportReason.choices)
    description = models.TextField(max_length=2000, blank=True)
    status = models.CharField(
        max_length=12, choices=ReportStatus.choices, default=ReportStatus.NEW, db_index=True
    )
    resolution_note = models.CharField(max_length=500, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_reports",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Shikoyat"
        verbose_name_plural = "Shikoyatlar"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.reason} {self.listing_id}"


class ListingStatusHistory(models.Model):
    listing = models.ForeignKey(
        Listing, on_delete=models.CASCADE, related_name="status_history"
    )
    from_status = models.CharField(max_length=24, blank=True)
    to_status = models.CharField(max_length=24)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="listing_status_changes",
    )
    note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "E'lon holati tarixi"
        verbose_name_plural = "E'lon holati tarixlari"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.from_status} -> {self.to_status}"
