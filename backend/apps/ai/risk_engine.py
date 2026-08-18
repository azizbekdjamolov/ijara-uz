"""Deterministic risk scoring with configurable weights.

Every weight and threshold lives in SiteSetting (admin-configurable). The
engine is reproducible: same inputs -> same score.
"""

import logging
from datetime import timedelta
from typing import Any

from django.db.models import Count
from django.utils import timezone

from apps.core.services import SettingsService

logger = logging.getLogger("apps.ai")

DEFAULT_WEIGHTS: dict[str, float] = {
    "account_age_hours_lt_24": 10,
    "phone_not_verified": 5,
    "profile_not_verified": 8,
    "duplicate_image_within_listing": 25,
    "image_repeated_across_listings": 20,
    "irrelevant_images": 25,
    "price_anomaly": 20,
    "text_risk_score": 0.5,  # multiplier
    "open_reports_per_listing": 15,
    "previous_rejected_listings": 10,
    "document_mismatch": 25,
}

DEFAULT_THRESHOLDS: dict[str, int] = {
    "low_max": 20,
    "medium_max": 50,
}

LEVEL_NAMES = {0: "low", 1: "medium", 2: "high"}


class RiskEngine:
    @staticmethod
    def _weights() -> dict[str, float]:
        base = dict(DEFAULT_WEIGHTS)
        for key in DEFAULT_WEIGHTS:
            stored = SettingsService.get(f"risk.weights.{key}")
            if stored is not None:
                try:
                    base[key] = float(stored)
                except (TypeError, ValueError):
                    logger.warning("invalid weight for %s: %r", key, stored)
        return base

    @classmethod
    def thresholds(cls) -> dict[str, int]:
        return {
            "low_max": int(SettingsService.get("risk.threshold.low_max", DEFAULT_THRESHOLDS["low_max"])),
            "medium_max": int(
                SettingsService.get("risk.threshold.medium_max", DEFAULT_THRESHOLDS["medium_max"])
            ),
        }

    @classmethod
    def level_for_score(cls, score: float) -> str:
        t = cls.thresholds()
        if score <= t["low_max"]:
            return "low"
        if score <= t["medium_max"]:
            return "medium"
        return "high"

    @classmethod
    def assess(cls, listing) -> dict[str, Any]:
        """Compute risk from real facts only. Returns score, level, reasons, weights."""
        w = cls._weights()
        user = listing.owner
        reasons: list[str] = []
        score = 0.0

        account_age = timezone.now() - user.date_joined
        if account_age < timedelta(hours=24):
            score += w["account_age_hours_lt_24"]
            reasons.append("Akkaunt 24 soatdan yoshroq")

        if not user.is_phone_verified:
            score += w["phone_not_verified"]
            reasons.append("Telefon tasdiqlanmagan")

        if not user.is_profile_verified:
            score += w["profile_not_verified"]
            reasons.append("Profil hujjatlari tasdiqlanmagan")

        dup_within = (
            listing.images.exclude(phash="")
            .values("phash")
            .annotate(c=Count("id"))
            .filter(c__gt=1)
            .count()
        )
        if dup_within:
            score += w["duplicate_image_within_listing"]
            reasons.append("E'lon ichida takroriy rasmlar")

        analyses = {a.analyzer_type: a for a in listing.ai_analyses.all()}
        image = analyses.get("image")
        if image:
            if image.result.get("repeated_across_listings"):
                score += w["image_repeated_across_listings"]
                reasons.append("Rasmlar boshqa e'lonlarda ham ishlatilgan")
            if "irrelevant_images" in image.result.get("flags", []):
                score += w["irrelevant_images"]
                reasons.append("Mulkka oid bo'lmagan rasmlar")

        price = analyses.get("price")
        if price and price.result.get("anomaly"):
            score += min(w["price_anomaly"], price.result.get("anomaly_score", w["price_anomaly"]))
            reasons.append("Narx tuman o'rtachasidan past")

        text = analyses.get("text")
        if text and text.score:
            score += min(30.0, text.score * w["text_risk_score"])
            reasons.extend(text.reasons[:3])

        open_reports = listing.reports.filter(status__in=("new", "in_review")).count()
        if open_reports:
            score += min(30.0, open_reports * w["open_reports_per_listing"])
            reasons.append(f"{open_reports} ta ochiq shikoyat")

        rejected_count = user.listings.filter(status="rejected").count()
        if rejected_count:
            score += min(30.0, rejected_count * w["previous_rejected_listings"])
            reasons.append(f"{rejected_count} ta avval rad etilgan e'lon")

        docs = listing.verification_documents.exclude(status="verified").exclude(status="pending")
        if docs.exists():
            score += w["document_mismatch"]
            reasons.append("Tasdiqlash hujjati rad etilgan")

        score = round(min(100.0, score), 1)
        return {
            "score": score,
            "level": cls.level_for_score(score),
            "reasons": reasons[:8],
            "weights": w,
        }
