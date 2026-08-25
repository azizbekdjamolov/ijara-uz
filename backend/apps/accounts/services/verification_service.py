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
        try:
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
        except VerificationServiceError:
            raise
        except Exception as exc:
            logger.exception("[OTP] create_and_send dastlabki tekshiruvda kutilmagan xatolik: %s", exc)
            raise VerificationServiceError(f"Xatolik: {exc}") from exc

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
        # Transient attr: faqat DEBUG rejimida javobda qaytariladi (dev test uchun)
        verification.debug_code = code
        logger.info(
            "[OTP] Verification saqlandi: user=%s phone=%s channel=%s purpose=%s id=%s expires=%s ttl=%s min",
            user.id,
            getattr(user, "phone", ""),
            channel,
            purpose,
            verification.id,
            verification.expires_at,
            ttl_minutes,
        )
        # Verify DB save
        try:
            check = Verification.objects.filter(id=verification.id).exists()
            logger.debug("[OTP] DB tekshiruvi: exists=%s id=%s", check, verification.id)
        except Exception as e:
            logger.warning("[OTP] DB tekshiruv xatolik: %s", e)

        try:
            cls._send(user=user, channel=channel, code=code)
            logger.info("[OTP] _send muvaffaqiyatli: user=%s channel=%s", user.id, channel)
        except Exception as exc:
            logger.exception("[OTP] _send xatolik: user=%s phone=%s channel=%s err=%s", user.id, getattr(user, "phone", ""), channel, exc)
            # Invalidate verification on send failure? Keep for retry via resend, but log
            raise VerificationServiceError(f"SMS/Email yuborishda xatolik: {exc}") from exc

        try:
            cooldown_seconds = SettingsService.get("auth.verification_cooldown_seconds", 60)
        except Exception:
            cooldown_seconds = 60
        try:
            cache.set(
                CODE_CACHE_KEY.format(user_id=user.id, channel=channel),
                cooldown_seconds,
                timeout=cooldown_seconds,
            )
        except Exception as exc:
            logger.warning("[OTP] cache set xatolik (qulash emas): %s", exc)

        try:
            AuditLog.record(
                action="verification_code_sent",
                actor=user,
                target_type="Verification",
                target_id=verification.id,
                details={"channel": channel, "purpose": purpose},
            )
        except Exception as exc:
            logger.warning("[OTP] AuditLog xatolik (qulash emas): %s", exc)
        return verification

    @classmethod
    def _send(cls, *, user: User, channel: str, code: str) -> None:
        message = f"Ijara.uz tasdiqlash kodingiz: {code}"
        logger.info("[OTP] _send chaqirildi: user=%s phone=%s channel=%s code_len=%s", user.id, getattr(user, "phone", ""), channel, len(code))
        if channel == VerificationChannel.EMAIL:
            logger.info("[OTP] Email yuborish: to=%s", user.email)
            try:
                send_mail(
                    subject="Ijara.uz — tasdiqlash kodi",
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                )
                logger.info("[OTP] Email yuborildi: to=%s", user.email)
            except Exception as exc:
                logger.exception("[OTP] Email yuborishda xatolik: %s", exc)
                raise
        elif channel == VerificationChannel.PHONE:
            provider_name = getattr(settings, "SMS_PROVIDER", "console")
            logger.info("[OTP] SMS yuborish: phone=%s provider=%s base_url=%s", user.phone, provider_name, getattr(settings, "ESKIZ_BASE_URL", "https://notify.eskiz.uz"))
            try:
                provider = get_sms_provider()
                logger.debug("[OTP] provider instance=%s", provider.__class__.__name__)
                provider.send(user.phone, message)
                logger.info("[OTP] SMS provider.send muvaffaqiyatli tugadi: phone=%s", user.phone)
            except Exception as exc:
                logger.exception("[OTP] SMS provider.send xatolik: phone=%s err=%s", user.phone, exc)
                raise
        else:
            logger.error("[OTP] Noma'lum kanal: %s", channel)
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

        try:
            verification.status = VerificationStatus.VERIFIED
            verification.verified_at = timezone.now()
            verification.save(update_fields=["status", "verified_at"])
        except Exception as exc:
            logger.exception("[OTP] verification save xatolik: %s", exc)
            raise VerificationServiceError("Kod tasdiqlashda xatolik") from exc

        try:
            if channel == VerificationChannel.PHONE:
                user.is_phone_verified = True
            elif channel == VerificationChannel.EMAIL:
                user.is_email_verified = True
            user.save(update_fields=["is_phone_verified", "is_email_verified"])
        except Exception as exc:
            logger.exception("[OTP] user verify save xatolik: %s", exc)
            raise VerificationServiceError("Foydalanuvchi yangilashda xatolik") from exc
        try:
            UserService.recompute_trust_tier(user)
        except Exception as exc:
            logger.warning("[OTP] trust tier xatolik (qulash emas): %s", exc)

        try:
            AuditLog.record(
                action="verification_code_verified",
                actor=user,
                target_type="Verification",
                target_id=verification.id,
                details={"channel": channel, "purpose": purpose},
            )
        except Exception as exc:
            logger.warning("[OTP] AuditLog verify xatolik (qulash emas): %s", exc)
        return verification
