"""Telegram Bot API service — thin wrapper around Bot HTTP API.

Uses ``requests`` (already in requirements.txt) to call the Telegram Bot API
directly. No third-party Telegram libraries are required.
"""

import logging

import requests
from django.conf import settings

logger = logging.getLogger("apps.telegram_bot")

TELEGRAM_API = "https://api.telegram.org"
_TIMEOUT = 10  # seconds


def _token() -> str:
    token = getattr(settings, "TELEGRAM_BOT_TOKEN", "") or ""
    if not token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN sozlanmagan.")
    return token


def _post(method: str, **kwargs) -> dict:
    """POST to a Bot API *method*. Returns the ``result`` field on success."""
    url = f"{TELEGRAM_API}/bot{_token()}/{method}"
    resp = requests.post(url, timeout=_TIMEOUT, **kwargs)
    data = resp.json()
    if not data.get("ok"):
        logger.error("Telegram API %s failed: %s", method, data)
        raise RuntimeError(data.get("description", "Telegram API xatosi"))
    return data.get("result", {})


# ── Public helpers ────────────────────────────────────────────────────


def send_message(chat_id: int | str, text: str, *, parse_mode: str = "HTML", reply_markup: dict | None = None) -> dict:
    """Send a plain-text (or HTML) message to *chat_id*."""
    payload: dict = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return _post("sendMessage", json=payload)


def send_photo(
    chat_id: int | str,
    photo: str,
    *,
    caption: str = "",
    parse_mode: str = "HTML",
    reply_markup: dict | None = None,
) -> dict:
    """Send a photo (URL or file_id) with an optional caption."""
    payload: dict = {"chat_id": chat_id, "photo": photo, "parse_mode": parse_mode}
    if caption:
        payload["caption"] = caption
    if reply_markup:
        payload["reply_markup"] = reply_markup
    return _post("sendPhoto", json=payload)


def set_my_commands(commands: list[dict]) -> dict:
    """Set the bot's menu commands (e.g. ``/start``, ``/yangiliklar``)."""
    return _post("setMyCommands", json={"commands": commands})


def set_my_description(description: str = "", *, language_code: str | None = None) -> dict:
    """Set the bot's long description (removes the default placeholder text)."""
    payload: dict = {"description": description}
    if language_code:
        payload["language_code"] = language_code
    return _post("setMyDescription", json=payload)


def set_my_short_description(short_description: str = "", *, language_code: str | None = None) -> dict:
    """Set the bot's short description (shown in the chat header)."""
    payload: dict = {"short_description": short_description}
    if language_code:
        payload["language_code"] = language_code
    return _post("setMyShortDescription", json=payload)


def set_webhook(url: str, *, secret_token: str | None = None) -> dict:
    """Register a webhook URL with Telegram.

    The *secret_token* (if provided) is sent by Telegram in the
    ``X-Telegram-Bot-Api-Secret-Token`` header and must be verified on our side.
    """
    payload: dict = {
        "url": url,
        "allowed_updates": ["message", "callback_query", "web_app_data"],
        "drop_pending_updates": True,
    }
    if secret_token:
        payload["secret_token"] = secret_token
    return _post("setWebhook", json=payload)
