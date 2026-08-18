"""Rule-based text screening. Produces the same schema the AI providers use."""

import re
from typing import Any

from apps.ai.providers.mock import (
    PROHIBITED_MARKERS,
    SCAM_TEXT_MARKERS,
    SPAM_MARKERS,
    URGENCY_MARKERS,
)

_PHONE_LIKE = re.compile(r"\+998\s?\d{3}[\s-]?\d{2}[\s-]?\d{2}[\s-]?\d{2}")
_CARD_LIKE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b")


def build_text_payload(listing) -> dict[str, Any]:
    prop = listing.prop
    return {
        "title": listing.title,
        "description": prop.description,
        "district": prop.district,
        "price": listing.price,
        "rooms": prop.rooms,
    }


def rule_scan(listing) -> tuple[list[str], list[str], float]:
    """Deterministic first pass. AI output is merged on top of this, never replaces it."""
    lowered = f"{listing.title} {listing.prop.description}".lower()
    flags: list[str] = []
    reasons: list[str] = []

    payment_hits = [m for m in SCAM_TEXT_MARKERS if m in lowered]
    if payment_hits:
        flags.append("suspicious_payment_request")
        reasons.append("To'lov talab qiluvchi iboralar: " + ", ".join(payment_hits[:3]))
    urgency_hits = [m for m in URGENCY_MARKERS if m in lowered]
    if len(urgency_hits) >= 2:
        flags.append("urgency_language")
        reasons.append("Shoshilinchlikni kuchaytiruvchi iboralar")
    prohibited = [m for m in PROHIBITED_MARKERS if m in lowered]
    if prohibited:
        flags.append("prohibited_content")
        reasons.append("Ta'qiqlangan mazmun: " + ", ".join(prohibited[:3]))
    if any(m in lowered for m in SPAM_MARKERS):
        flags.append("spam")
        reasons.append("Spam kontakt ko'rinishlari aniqlangan")
    if _CARD_LIKE.search(lowered) or _PHONE_LIKE.search(lowered):
        flags.append("suspicious_contact")
        reasons.append("E'lon matnida karta/telefon raqam ko'rsatilgan")

    score = min(100.0, len(flags) * 25)
    return flags, reasons, score
