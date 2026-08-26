"""Telegram Mini App initData validation.

Telegram WebApp sends ``initData`` as a query-string-like signed payload.
We verify the HMAC-SHA256 signature with the bot token, exactly as documented
at https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app.
"""

import hashlib
import hmac
import time
import logging
from urllib.parse import parse_qsl

from django.conf import settings

logger = logging.getLogger("apps.telegram_bot")

MAX_INIT_DATA_AGE = 60 * 60 * 24  # 24 hours


def _bot_token() -> str:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN sozlanmagan.")
    return token


def validate_webapp_init_data(init_data: str) -> dict:
    """Validate ``initData`` from Telegram WebApp.

    Returns a dict with trusted fields:
        ``user_id``, ``username``, ``first_name``, ``last_name``, ``photo_url``.

    Raises ``ValueError`` on any validation failure.
    """
    if not init_data:
        raise ValueError("initData bo'sh.")

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise ValueError("initData hash topilmadi.")

    # Check freshness
    auth_date_str = parsed.get("auth_date")
    if not auth_date_str:
        raise ValueError("auth_date topilmadi.")
    try:
        auth_date = int(auth_date_str)
    except (TypeError, ValueError):
        raise ValueError("auth_date noto'g'ri formatda.")

    if abs(time.time() - auth_date) > MAX_INIT_DATA_AGE:
        raise ValueError("Telegram sessiya muddati o'tgan.")

    # Build check string (sorted key=value pairs, empty values excluded)
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed.items()) if v)

    # HMAC-SHA256 with bot_token as secret
    secret_key = hashlib.sha256(_bot_token().encode()).digest()
    expected = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, received_hash):
        raise ValueError("Noto'g'ri Telegram ma'lumotlari.")

    # Parse user JSON
    import json

    user_json = parsed.get("user")
    if not user_json:
        raise ValueError("Telegram user ma'lumotlari topilmadi.")

    try:
        user_data = json.loads(user_json)
    except (json.JSONDecodeError, TypeError):
        raise ValueError("Telegram user JSON noto'g'ri.")

    return {
        "user_id": int(user_data["id"]),
        "username": user_data.get("username", ""),
        "first_name": user_data.get("first_name", ""),
        "last_name": user_data.get("last_name", ""),
        "photo_url": user_data.get("photo_url", ""),
    }
