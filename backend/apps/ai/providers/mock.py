"""Deterministic fallback provider used when no AI key is configured.

This is NOT fake AI: it is a transparent rule-based implementation of the
same output schema. Providers always identify themselves in AIAnalysis rows.
"""

import hashlib
from typing import Any

from apps.ai.providers.base import AIAnalysisResult, BaseAIProvider

SCAM_TEXT_MARKERS: list[str] = [
    "oldindan to'lov",
    "oldindan tolov",
    "avans bering",
    "avans to'lang",
    "100% to'lang",
    "to'liq to'lov",
    "hisobga pul o'tkazing",
    "payme orqali",
    "click orqali",
    "karta raqamiga",
    "karta raqam",
    "zudlik bilan to'lang",
    "faqat bugun",
    "faqat bugun narx",
    "shoshiling",
    "cheklangan taklif",
    "vaqt tugayapti",
    "kechiktirmang",
    "darhol javob bering",
    "oxirgi kun",
]

URGENCY_MARKERS: list[str] = [
    "zudlik bilan",
    "shoshilinch",
    "faqat bugun",
    "cheklangan",
    "oxirgi",
    "kechiktirmang",
    "darhol",
]

PROHIBITED_MARKERS: list[str] = [
    "qimor",
    "tamaki",
    "spirtli",
    "narkotik",
    "qurol",
    "fohish",
]

SPAM_MARKERS: list[str] = ["@telegram", "telegram:", "instagram.com", "www.", "http://", "https://"]


def _text_flags(text: str) -> tuple[list[str], list[str], float]:
    lowered = text.lower()
    flags: list[str] = []
    reasons: list[str] = []
    if any(m in lowered for m in SCAM_TEXT_MARKERS):
        flags.append("suspicious_payment_request")
        reasons.append("To'lov talab qiluvchi iboralar aniqlangan")
    if sum(1 for m in URGENCY_MARKERS if m in lowered) >= 2:
        flags.append("urgency_language")
        reasons.append("Bosim o'tkazuvchi shoshilinchlik iboralari")
    if any(m in lowered for m in PROHIBITED_MARKERS):
        flags.append("prohibited_content")
        reasons.append("Ta'qiqlangan mazmun")
    if any(m in lowered for m in SPAM_MARKERS):
        flags.append("spam")
        reasons.append("Spam kontakt ko'rinishlari")
    score = min(100, len(flags) * 25)
    return flags, reasons, score


class MockProvider(BaseAIProvider):
    """Rule-based provider exposing the exact same contract as Gemini."""

    name = "rules"
    model = "rules-v1"

    def analyze(self, analyzer_type: str, payload: dict[str, Any]) -> AIAnalysisResult:
        flags: list[str] = []
        reasons: list[str] = []
        score = 0.0

        if analyzer_type == "text":
            flags, reasons, score = _text_flags(payload.get("text", ""))
        elif analyzer_type == "image":
            duplicate_ids = payload.get("duplicate_image_ids", [])
            if len(duplicate_ids) > 0:
                flags.append("duplicate_images")
                reasons.append(f"{len(duplicate_ids)} ta takroriy rasm")
                score += 30
            repeated = payload.get("repeated_across_listings", 0)
            if repeated:
                flags.append("duplicate_images")
                reasons.append("Rasm boshqa e'lonlarda ham ishlatilgan")
                score += 20
            if payload.get("has_irrelevant", False):
                flags.append("irrelevant_images")
                reasons.append("Mulkka oid bo'lmagan rasm")
                score += 25
            if payload.get("low_quality_count", 0):
                flags.append("low_quality_images")
                reasons.append("Sifatsiz rasmlar")
                score += 10
        elif analyzer_type == "price":
            if payload.get("anomaly"):
                flags.append("price_anomaly")
                reasons.append("Narx tuman bo'yicha o'rtachadan sezilarli past")
                score += payload.get("anomaly_score", 30)
        elif analyzer_type == "document":
            flags.append("no_flags")
            reasons.append("Hujjat metadata ajratib olindi")

        return AIAnalysisResult(
            provider=self.name,
            model=self.model,
            score=min(100.0, score),
            result={"flags": flags, "confidence": 0.95, "reasons": reasons},
            confidence=0.95,
            reasons=reasons,
        )


def fingerprint(payload: dict[str, Any]) -> str:
    """Stable fingerprint so identical payloads are not re-analyzed by the fallback."""
    raw = json_dumps(payload)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def json_dumps(payload: dict[str, Any]) -> str:
    import json

    return json.dumps(payload, sort_keys=True, ensure_ascii=False)
