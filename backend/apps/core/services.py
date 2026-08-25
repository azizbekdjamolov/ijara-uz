import contextlib
import logging

from django.core.cache import cache

from apps.core.models import SiteSetting

logger = logging.getLogger("apps.core")

SETTINGS_CACHE_KEY = "site_setting:{key}"
SETTINGS_CACHE_TTL = 300

# Platform-wide configurable defaults (overridable from Django admin).
DEFAULTS: dict[str, object] = {
    # Anti-spam: listing creation limits per day by trust tier.
    "listings.limit.new_user_per_day": 1,
    "listings.limit.phone_verified_per_day": 3,
    "listings.limit.profile_verified_per_day": 5,
    "listings.limit.trusted_per_day": 10,
    "listings.limit.business_per_day": 50,
    # Image limits per listing by trust tier.
    "listings.images.new_user": 10,
    "listings.images.verified_user": 20,
    "listings.images.business_user": 40,
    # Verification codes.
    "auth.verification_cooldown_seconds": 60,
    "auth.verification_max_attempts": 5,
    "auth.verification_code_ttl_minutes": 30,
    # Auth throttling (requests per minute for unauthenticated auth calls).
    "auth.login_attempts_per_minute": 10,
}


class SettingsService:
    """Reads site settings from cache, falling back to DB then code defaults."""

    @classmethod
    def get(cls, key: str, default=None):
        try:
            if key not in DEFAULTS and default is None:
                logger.warning("Unknown site setting requested: %s", key)
            cache_key = SETTINGS_CACHE_KEY.format(key=key)
            try:
                value = cache.get(cache_key)
                if value is not None:
                    return value
            except Exception as exc:
                logger.warning("Settings cache get xatolik (qulash emas): %s", exc)
            try:
                value = SiteSetting.objects.get(key=key).value
            except SiteSetting.DoesNotExist:
                value = DEFAULTS.get(key, default)
            except Exception as exc:
                logger.warning("Settings DB xatolik, default qaytariladi: %s key=%s", exc, key)
                return DEFAULTS.get(key, default)
            with contextlib.suppress(Exception):
                cache.set(cache_key, value, SETTINGS_CACHE_TTL)
            return value
        except Exception as exc:
            logger.exception("SettingsService.get kutilmagan xatolik: %s", exc)
            return DEFAULTS.get(key, default)

    @classmethod
    def set(cls, key: str, value, description: str = "") -> SiteSetting:
        obj, _ = SiteSetting.objects.update_or_create(
            key=key, defaults={"value": value, "description": description}
        )
        cache.set(SETTINGS_CACHE_KEY.format(key=key), value, SETTINGS_CACHE_TTL)
        return obj

    @classmethod
    def clear_cache(cls, key: str | None = None) -> None:
        if key:
            cache.delete(SETTINGS_CACHE_KEY.format(key=key))
        else:
            for k in DEFAULTS:
                cache.delete(SETTINGS_CACHE_KEY.format(key=k))
