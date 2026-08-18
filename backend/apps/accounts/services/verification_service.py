import hashlib
import logging
import secrets

from django.conf import settings
from django.core.cache import cache
from django.core.mail import send_mail
from django.utils import timezone

from apps.accounts.models import (
    User,
    Verification,
    VerificationChannel,
    VerificationStatus,
)
from apps.accounts.services.sms import get_sms_provider
from apps.accounts.services.user_service import UserService
from apps.core.models import AuditLog
from apps.core.services import SettingsService

logger = logging.getLogger("apps.accounts")

CODE_CACHE_KEY = "verification_cooldown:{user_id}:{channel}"


class VerificationServiceError(Exception):
    pass


class VerificationCooldownError(VerificationServiceError):
    pass


class VerificationAttemptsExceeded(VerificationServiceError):
    pass


class VerificationCodeInvalid(VerificationServiceError):
    pass


class VerificationExpired(VerificationServiceError):
    pass


class VerificationService:
    """Handles email/SMS one-time codes. Codes are stored hashed, never in plain text."""

    @classmethod
    def generate_code(cls) -> str:
        return f"{secrets.randbelow(1_000_000):06d}"

    @classmethod
    def _hash(cls, code: str) -> str:
        return hashlib.sha256(code.encode()).hexdigest()

    @classmethod
    def _cooldown_seconds(cls, user_id, channel: str) -> int:
        cached = cache.get(CODE_CACHE_KEY.format(user_id=user_id, channel=channel))
        return int(cached or 0)

    @classmethod
    def create_and_send(cls, *, user: User, channel: str, purpose: str) -> Verification:
        if user.is_banned:
            raise VerificationServiceError("Akkaunt bloklangan.")

        if channel == VerificationChannel.PHONE and user.is_phone_verified:
            raise VerificationServiceError("Telefon allaqachon tasdiqlangan.")
        if channel == VerificationChannel.EMAIL and user.is_email_verified:
            raise VerificationServiceError("Email allaqachon tasdiqlangan.")
        if channel == VerificationChannel.EMAIL and not user.email:
            raise VerificationServiceError("Email ko'rsatilmagan.")

        cooldown = cls._cooldown_seconds(user.id, channel)
        if cooldown:
            raise VerificationCooldownError(
                f"Yangi kod {cooldown} soniyadan so'ng yuboriladi."
            )

        code = cls.generate_code()
        ttl_minutes = SettingsService.get("auth.verification_code_ttl_minutes", 30)

        # Invalidate previous pending codes for the same user/channel/purpose.
        Verification.objects.filter(
            user=user, channel=channel, purpose=purpose, status=VerificationStatus.PENDING
        ).update(status=VerificationStatus.REVOKED)

        verification = Verification.objects.create(
            user=user,
            channel=channel,
            purpose=purpose,
            code_hash=cls._hash(code),
            expires_at=timezone.now() + timezone.timedelta(minutes=ttl_minutes),
        )

        cls._send(user=user, channel=channel, code=code)

        cooldown_seconds = SettingsService.get("auth.verification_cooldown_seconds", 60)
        cache.set(
            CODE_CACHE_KEY.format(user_id=user.id, channel=channel),
            cooldown_seconds,
            timeout=cooldown_seconds,
        )

        AuditLog.record(
            action="verification_code_sent",
            actor=user,
            target_type="Verification",
            target_id=verification.id,
            details={"channel": channel, "purpose": purpose},
        )
        return verification

    @classmethod
    def _send(cls, *, user: User, channel: str, code: str) -> None:
        message = f"Ijara.uz tasdiqlash kodingiz: {code}"
        if channel == VerificationChannel.EMAIL:
            send_mail(
                subject="Ijara.uz — tasdiqlash kodi",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
            )
        elif channel == VerificationChannel.PHONE:
            get_sms_provider().send(user.phone, message)
        else:
            raise VerificationServiceError(f"Noma'lum kanal: {channel}")

    @classmethod
    def verify_code(cls, *, user: User, channel: str, purpose: str, code: str) -> Verification:
        verification = (
            Verification.objects.filter(
                user=user, channel=channel, purpose=purpose, status=VerificationStatus.PENDING
            )
            .order_by("-created_at")
            .first()
        )
        if verification is None:
            raise VerificationCodeInvalid("Kod topilmadi yoki bekor qilingan.")

        if verification.is_expired:
            verification.status = VerificationStatus.EXPIRED
            verification.save(update_fields=["status"])
            raise VerificationExpired("Kod muddati o'tgan. Yangi kod so'rang.")

        max_attempts = SettingsService.get("auth.verification_max_attempts", 5)
        if verification.attempts >= max_attempts:
            verification.status = VerificationStatus.EXPIRED
            verification.save(update_fields=["status"])
            raise VerificationAttemptsExceeded(
                "Ko'p urinishlar. Yangi kod so'rang."
            )

        if verification.code_hash != cls._hash(code):
            verification.attempts += 1
            verification.save(update_fields=["attempts"])
            raise VerificationCodeInvalid("Noto'g'ri kod.")

        verification.status = VerificationStatus.VERIFIED
        verification.verified_at = timezone.now()
        verification.save(update_fields=["status", "verified_at"])

        if channel == VerificationChannel.PHONE:
            user.is_phone_verified = True
        elif channel == VerificationChannel.EMAIL:
            user.is_email_verified = True
        user.save(update_fields=["is_phone_verified", "is_email_verified"])
        UserService.recompute_trust_tier(user)

        AuditLog.record(
            action="verification_code_verified",
            actor=user,
            target_type="Verification",
            target_id=verification.id,
            details={"channel": channel, "purpose": purpose},
        )
        return verification
