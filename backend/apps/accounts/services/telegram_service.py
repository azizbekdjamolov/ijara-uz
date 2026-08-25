"""Telegram Login Widget authentication.

The widget sends the user's profile data plus a signed `hash`. We verify the
signature with the bot token (HMAC-SHA256 per Telegram's documented algorithm)
before trusting any field, then find-or-create a user linked to telegram_id.
"""

import hashlib
import hmac
import logging

from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from apps.accounts.models import User, UserRole

logger = logging.getLogger("apps.accounts")

MAX_AUTH_AGE_SECONDS = 60 * 60 * 24  # 24h — Telegram widget auth_date


class TelegramAuthError(Exception):
    pass


class TelegramAuthDataSerializer(serializers.Serializer):
    """Fields the Telegram Login Widget passes to us."""

    id = serializers.IntegerField()
    first_name = serializers.CharField(required=False, allow_blank=True, default="")
    last_name = serializers.CharField(required=False, allow_blank=True, default="")
    username = serializers.CharField(required=False, allow_blank=True, default="")
    photo_url = serializers.CharField(required=False, allow_blank=True, default="")
    auth_date = serializers.IntegerField()
    hash = serializers.CharField()


def _bot_token() -> str:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""
    if not token:
        raise TelegramAuthError("Telegram bot sozlanmagan.")
    return token


def validate_telegram_data(data: dict) -> dict:
    """Verify the widget signature and auth freshness. Returns trusted fields."""
    import time

    serializer = TelegramAuthDataSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    fields = serializer.validated_data

    auth_date = int(fields["auth_date"])
    if abs(time.time() - auth_date) > MAX_AUTH_AGE_SECONDS:
        raise TelegramAuthError("Telegram sessiya muddati o'tgan.")

    received_hash = fields.pop("hash")

    # The signature covers exactly the fields the widget sent (empty/absent
    # optional fields are excluded from the check string).
    raw_fields = {k: v for k, v in data.items() if k != "hash" and str(v) != ""}
    check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(raw_fields.items())
    )
    secret_key = hashlib.sha256(_bot_token().encode()).digest()
    expected_hash = hmac.new(
        secret_key, check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise TelegramAuthError("Telegram ma'lumotlari tasdiqlanmadi.")

    return {
        "telegram_id": int(fields["id"]),
        "telegram_username": fields.get("username", "") or "",
        "telegram_photo_url": fields.get("photo_url", "") or "",
        "full_name": f"{fields.get('first_name', '')} {fields.get('last_name', '')}".strip()
        or "Telegram foydalanuvchi",
    }


@transaction.atomic
def get_or_create_telegram_user(*, telegram_id: int, telegram_username: str = "", telegram_photo_url: str = "", full_name: str = "") -> User:
    user = User.objects.filter(telegram_id=telegram_id).first()
    if user is not None:
        changed = False
        if telegram_username and user.telegram_username != telegram_username:
            user.telegram_username = telegram_username
            changed = True
        if telegram_photo_url and user.telegram_photo_url != telegram_photo_url:
            user.telegram_photo_url = telegram_photo_url
            changed = True
        if full_name and not user.profile.full_name:
            user.profile.full_name = full_name
            user.profile.save(update_fields=["full_name", "updated_at"])
        if changed:
            user.save(update_fields=["telegram_username", "telegram_photo_url"])
        return user

    user = User(
        phone=None,
        telegram_id=telegram_id,
        telegram_username=telegram_username,
        telegram_photo_url=telegram_photo_url,
        role=UserRole.TENANT,
    )
    user.set_unusable_password()
    user.save()
    from apps.accounts.models import Profile

    Profile.objects.update_or_create(user=user, defaults={"full_name": full_name})
    return user
