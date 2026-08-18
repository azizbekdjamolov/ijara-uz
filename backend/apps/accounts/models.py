import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone

from apps.accounts.managers import UserManager

PHONE_VALIDATOR = RegexValidator(
    regex=r"^\+998\d{9}$",
    message="Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak.",
)


class UserRole(models.TextChoices):
    TENANT = "tenant", "Ijarachi"
    OWNER = "owner", "Uy egasi"
    MODERATOR = "moderator", "Moderator"
    ADMIN = "admin", "Administrator"


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(
        max_length=13, unique=True, validators=[PHONE_VALIDATOR], db_index=True
    )
    email = models.EmailField(unique=True, null=True, blank=True, db_index=True)
    role = models.CharField(
        max_length=16, choices=UserRole.choices, default=UserRole.TENANT
    )
    is_phone_verified = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    is_profile_verified = models.BooleanField(
        default=False,
        help_text="Moderator tomonidan shaxs/mulk hujjatlari tekshirilgan.",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "phone"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.phone

    def is_moderator(self) -> bool:
        return self.role in (UserRole.MODERATOR, UserRole.ADMIN)

    def is_owner(self) -> bool:
        return self.role == UserRole.OWNER


class TrustTier(models.TextChoices):
    NEW_USER = "new_user", "Yangi foydalanuvchi"
    PHONE_VERIFIED = "phone_verified", "Telefon tasdiqlangan"
    PROFILE_VERIFIED = "profile_verified", "Profil tasdiqlangan"
    TRUSTED = "trusted", "Ishonchli foydalanuvchi"
    BUSINESS = "business", "Biznes"

    @property
    def rank(self) -> int:
        return list(self).index(self)


class Profile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile", primary_key=True
    )
    full_name = models.CharField(max_length=120, blank=True)
    bio = models.TextField(blank=True, max_length=1000)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    city = models.CharField(max_length=64, blank=True)
    trust_tier = models.CharField(
        max_length=24, choices=TrustTier.choices, default=TrustTier.NEW_USER
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Profil"
        verbose_name_plural = "Profillar"

    def __str__(self) -> str:
        return self.full_name or self.user.phone


class VerificationChannel(models.TextChoices):
    EMAIL = "email", "Email"
    PHONE = "phone", "Telefon"


class VerificationPurpose(models.TextChoices):
    REGISTRATION = "registration", "Ro'yxatdan o'tish"
    PASSWORD_RESET = "password_reset", "Parolni tiklash"


class VerificationStatus(models.TextChoices):
    PENDING = "pending", "Kutilmoqda"
    VERIFIED = "verified", "Tasdiqlangan"
    EXPIRED = "expired", "Muddati o'tgan"
    REVOKED = "revoked", "Bekor qilingan"


class Verification(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="verifications"
    )
    channel = models.CharField(max_length=8, choices=VerificationChannel.choices)
    purpose = models.CharField(
        max_length=16, choices=VerificationPurpose.choices
    )
    code_hash = models.CharField(max_length=64, db_index=True)
    status = models.CharField(
        max_length=8, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    attempts = models.PositiveSmallIntegerField(default=0)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Tasdiqlash"
        verbose_name_plural = "Tasdiqlashlar"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "channel", "purpose", "status"])]

    def __str__(self) -> str:
        return f"{self.user} {self.channel} {self.purpose} {self.status}"

    @property
    def is_expired(self) -> bool:
        return self.status == VerificationStatus.PENDING and self.expires_at < timezone.now()
