"""One-time login code service for Telegram bot login fallback.

Generates a 6-digit code, stores it in Django cache (Redis in prod),
and associates it with a Telegram user ID. The user then enters the
code on the website to get JWT tokens.
"""

import logging
import random
import string

from django.core.cache import cache

logger = logging.getLogger("apps.telegram_bot")

CODE_TTL = 300  # 5 minutes
CACHE_PREFIX = "tg_login_code:"


def generate_login_code(telegram_id: int) -> str:
    """Generate a 6-digit code, store it, return the code string."""
    code = "".join(random.choices(string.digits, k=6))
    cache.set(f"{CACHE_PREFIX}{code}", telegram_id, CODE_TTL)
    logger.info("[login-code] generated code for telegram_id=%s", telegram_id)
    return code


def verify_login_code(code: str) -> int | None:
    """Verify a code. Returns the telegram_id if valid, else None."""
    key = f"{CACHE_PREFIX}{code.strip()}"
    telegram_id = cache.get(key)
    if telegram_id is not None:
        cache.delete(key)  # one-time use
        logger.info("[login-code] verified code for telegram_id=%s", telegram_id)
    return telegram_id
