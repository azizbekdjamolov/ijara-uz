"""Price analysis: real market statistics from the database, not AI guesses.

Compares a listing against district medians and per-mВІ rates of recently
published listings. An anomaly raises risk, it is never proof of fraud.
"""

import logging
import statistics
from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.db.models import ExpressionWrapper, F, FloatField
from django.utils import timezone

logger = logging.getLogger("apps.ai")

STATS_CACHE_KEY = "price_stats:{district}"
STATS_CACHE_TTL = 60 * 60 * 6  # 6 hours


def district_stats(district: str) -> dict[str, Any]:
    """Median price and median price/m² for a district (published, last 90 days)."""
    cache_key = STATS_CACHE_KEY.format(district=district)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    from apps.listings.models import Listing, ListingStatus

    cutoff = timezone.now() - timedelta(days=90)
    qs = Listing.objects.filter(
        status=ListingStatus.PUBLISHED,
        prop__district=district,
        published_at__gte=cutoff,
    )
    stats: dict[str, Any] = {"district": district, "count": 0}
    if qs.exists():
        prices = list(qs.values_list("price", flat=True))
        per_m2 = list(
            qs.annotate(
                pps=ExpressionWrapper(F("price") / F("prop__area"), output_field=FloatField())
            ).values_list("pps", flat=True)
        )
        stats = {
            "district": district,
            "count": len(prices),
            "median_price": int(statistics.median(prices)),
            "avg_price": int(statistics.mean(prices)),
            "median_per_m2": int(statistics.median(per_m2)) if per_m2 else 0,
        }
    cache.set(cache_key, stats, STATS_CACHE_TTL)
    return stats


def analyze_price(listing) -> dict[str, Any]:
    from apps.core.services import SettingsService

    stats = district_stats(listing.prop.district)
    result: dict[str, Any] = {
        "district": stats["district"],
        "comparables": stats["count"],
        "median_price": stats.get("median_price", 0),
        "listing_price": listing.price,
        "anomaly": False,
        "anomaly_score": 0,
        "notes": [],
    }
    if stats.get("count", 0) < 5:
        result["notes"].append("Bu tuman bo'yicha yetarli ma'lumot yo'q")
        return result

    median = stats.get("median_price", 0)
    if median and listing.price < median:
        ratio = listing.price / median
        threshold = float(SettingsService.get("risk.price_below_median_ratio", 0.6))
        if ratio < threshold:
            deviation = (1 - ratio) * 100
            result["anomaly"] = True
            result["anomaly_score"] = min(50.0, deviation * 0.8)
            result["notes"].append(
                f"Narx tuman medianasidan {int(deviation)}% past"
            )
    return result
