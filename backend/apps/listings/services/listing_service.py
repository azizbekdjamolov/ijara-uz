"""Listing business logic. Views and serializers stay thin."""

import logging
from datetime import timedelta

from django.core.cache import cache
from django.db import transaction
from django.utils import text, timezone

from apps.accounts.models import TrustTier
from apps.ai.models import AIAnalysis, RiskAssessment
from apps.core.models import AuditLog
from apps.core.services import SettingsService
from apps.listings.models import (
    Listing,
    ListingImage,
    ListingStatus,
    ListingStatusHistory,
    Property,
)

logger = logging.getLogger("apps.listings")

COOLDOWN_KEY = "listing_cooldown:{user_id}"


class ListingLimitError(Exception):
    pass


class InvalidStatusTransition(Exception):
    pass


class ListingNotFound(Exception):
    pass


class ListingService:
    # в”Ђв”Ђ Status machine в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    VALID_TRANSITIONS: dict[str, set[str]] = {
        ListingStatus.DRAFT: {
            ListingStatus.PENDING_REVIEW,
            ListingStatus.DELETED,
        },
        ListingStatus.PENDING_REVIEW: {
            ListingStatus.AI_CHECKING,
            ListingStatus.NEEDS_REVIEW,
            ListingStatus.REJECTED,
            ListingStatus.DELETED,
        },
        ListingStatus.AI_CHECKING: {
            ListingStatus.APPROVED,
            ListingStatus.NEEDS_REVIEW,
            ListingStatus.REJECTED,
            ListingStatus.PENDING_REVIEW,
            ListingStatus.DELETED,
        },
        ListingStatus.NEEDS_REVIEW: {
            ListingStatus.APPROVED,
            ListingStatus.REJECTED,
            ListingStatus.AI_CHECKING,
            ListingStatus.PAUSED,
            ListingStatus.DELETED,
        },
        ListingStatus.APPROVED: {
            ListingStatus.PUBLISHED,
            ListingStatus.NEEDS_REVIEW,
            ListingStatus.PAUSED,
            ListingStatus.REJECTED,
            ListingStatus.DELETED,
        },
        ListingStatus.PUBLISHED: {
            ListingStatus.PAUSED,
            ListingStatus.RESERVED,
            ListingStatus.RENTED,
            ListingStatus.EXPIRED,
            ListingStatus.DELETED,
            ListingStatus.NEEDS_REVIEW,
        },
        ListingStatus.PAUSED: {
            ListingStatus.PUBLISHED,
            ListingStatus.DELETED,
        },
        ListingStatus.REJECTED: {
            ListingStatus.PENDING_REVIEW,
            ListingStatus.DELETED,
        },
        ListingStatus.EXPIRED: {
            ListingStatus.PUBLISHED,
            ListingStatus.DELETED,
        },
        ListingStatus.RESERVED: {
            ListingStatus.PUBLISHED,
            ListingStatus.RENTED,
            ListingStatus.DELETED,
        },
        ListingStatus.RENTED: {
            ListingStatus.PUBLISHED,
            ListingStatus.DELETED,
        },
        ListingStatus.DELETED: set(),
    }

    @classmethod
    def can_transition(cls, current: str, target: str) -> bool:
        return target in cls.VALID_TRANSITIONS.get(current, set())

    @classmethod
    def transition(cls, listing: Listing, target: str, *, actor=None, note: str = "") -> Listing:
        if listing.status == target:
            return listing
        if not cls.can_transition(listing.status, target):
            raise InvalidStatusTransition(
                f"{listing.status} -> {target} ruxsat etilmagan o'tish"
            )
        from_status = listing.status
        listing.status = target
        if target == ListingStatus.PUBLISHED:
            listing.published_at = timezone.now()
            listing.expires_at = timezone.now() + timedelta(days=30)
        if target in (ListingStatus.REJECTED, ListingStatus.PAUSED):
            listing.published_at = None
        if note:
            listing.moderation_note = note[:500]
        listing.save(update_fields=["status", "published_at", "expires_at", "moderation_note", "updated_at"])
        ListingStatusHistory.objects.create(
            listing=listing,
            from_status=from_status,
            to_status=target,
            changed_by=actor,
            note=note,
        )
        AuditLog.record(
            action="listing_status_change",
            actor=actor,
            target_type="Listing",
            target_id=listing.id,
            details={"from": from_status, "to": target},
        )
        logger.info("listing %s: %s -> %s", listing.id, from_status, target)
        return listing

    # в”Ђв”Ђ Limits (anti-spam) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    @classmethod
    def daily_limit_for(cls, user) -> int:
        tier = user.profile.trust_tier
        key = {
            TrustTier.NEW_USER: "listings.limit.new_user_per_day",
            TrustTier.PHONE_VERIFIED: "listings.limit.phone_verified_per_day",
            TrustTier.PROFILE_VERIFIED: "listings.limit.profile_verified_per_day",
            TrustTier.TRUSTED: "listings.limit.trusted_per_day",
            TrustTier.BUSINESS: "listings.limit.business_per_day",
        }.get(tier, "listings.limit.new_user_per_day")
        return int(SettingsService.get(key, 1))

    @classmethod
    def image_limit_for(cls, user) -> int:
        tier = user.profile.trust_tier
        key = {
            TrustTier.NEW_USER: "listings.images.new_user",
            TrustTier.PHONE_VERIFIED: "listings.images.verified_user",
            TrustTier.TRUSTED: "listings.images.business_user",
            TrustTier.BUSINESS: "listings.images.business_user",
        }.get(tier, "listings.images.new_user")
        return int(SettingsService.get(key, 10))

    @classmethod
    def check_limits(cls, user, *, ip_address: str | None = None) -> None:
        today_start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        today_count = user.listings.filter(
            created_at__gte=today_start,
            status__in=[
                ListingStatus.PENDING_REVIEW,
                ListingStatus.AI_CHECKING,
                ListingStatus.NEEDS_REVIEW,
                ListingStatus.APPROVED,
                ListingStatus.PUBLISHED,
                ListingStatus.PAUSED,
            ],
        ).count()
        limit = cls.daily_limit_for(user)
        if today_count >= limit:
            raise ListingLimitError(
                f"Kunlik e'lon limiti tugadi ({limit} ta). Ertaga qayta urinib ko'ring."
            )

        cooldown_minutes = int(SettingsService.get("listings.cooldown_minutes", 5))
        if cooldown_minutes:
            cache_key = COOLDOWN_KEY.format(user_id=user.id)
            until = cache.get(cache_key)
            if until and until > timezone.now().timestamp():
                remaining = int(until - timezone.now().timestamp())
                raise ListingLimitError(
                    f"Keyingi e'lon {remaining // 60 + 1} daqiqadan so'ng joylanishi mumkin."
                )

        if ip_address:
            ip_key = f"listing_ip:{ip_address}"
            ip_hourly = int(SettingsService.get("listings.ip_limit_per_hour", 15))
            current = cache.get(ip_key) or 0
            if current >= ip_hourly:
                raise ListingLimitError("Bu IP manzildan soatiga e'lonlar limiti oshib ketdi.")
            cache.set(ip_key, current + 1, timeout=3600)

        if cooldown_minutes:
            cache.set(
                cache_key,
                timezone.now().timestamp() + cooldown_minutes * 60,
                timeout=cooldown_minutes * 60,
            )

    # в”Ђв”Ђ Create в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    @classmethod
    @transaction.atomic
    def create(cls, *, owner, data: dict, images: list | None = None, ip_address: str | None = None) -> Listing:
        cls.check_limits(owner, ip_address=ip_address)

        property_data = data.pop("property", {})
        amenities = property_data.pop("amenities", None)
        property_obj = Property.objects.create(owner=owner, **property_data)
        if amenities:
            property_obj.amenities.set(amenities)

        listing = Listing.objects.create(
            owner=owner,
            prop=property_obj,
            title=data.pop("title"),
            price=data.pop("price"),
            currency=data.get("currency", "UZS"),
            status=ListingStatus.DRAFT,
        )
        if images:
            cls.add_images(listing, images, owner)

        listing.slug = f"{listing.id}"
        listing.save(update_fields=["slug"])

        cls.transition(listing, ListingStatus.PENDING_REVIEW, actor=owner)
        return listing

    @classmethod
    def add_images(cls, listing: Listing, images: list, user) -> list[ListingImage]:
        from apps.listings.services.image_service import make_thumb

        limit = cls.image_limit_for(user)
        existing = listing.images.count()
        allowed = limit - existing
        if allowed <= 0:
            raise ListingLimitError(f"Rasm limiti tugadi ({limit} ta).")
        created: list[ListingImage] = []
        order = existing
        for img in images[:allowed]:
            if img.size > int(SettingsService.get("listings.image_max_bytes", 8 * 1024 * 1024)):
                raise ListingLimitError("Rasm hajmi 8 MB dan oshmasligi kerak.")
            thumb = make_thumb(img)
            instance = ListingImage.objects.create(
                listing=listing,
                image=img,
                thumb=thumb,
                order=order,
                is_primary=(order == 0),
            )
            order += 1
            created.append(instance)
        return created

    # в”Ђв”Ђ AI pipeline в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
    @classmethod
    def run_ai_pipeline(cls, listing: Listing) -> Listing:
        """Rule checks -> AI gateway (text+images) -> price stats -> risk engine.

        If external AI is down the rules provider still produces results, so the
        platform keeps working; if everything fails the listing stays queued.
        """
        from apps.ai.analyzers.image import build_image_payload, compute_phash
        from apps.ai.analyzers.price import analyze_price
        from apps.ai.analyzers.text import build_text_payload, rule_scan
        from apps.ai.gateway import gateway
        from apps.ai.risk_engine import RiskEngine

        with transaction.atomic():
            listing.status = ListingStatus.AI_CHECKING
            listing.save(update_fields=["status", "updated_at"])
            ListingStatusHistory.objects.create(
                listing=listing, from_status=ListingStatus.PENDING_REVIEW,
                to_status=ListingStatus.AI_CHECKING,
            )

            # 1. deterministic image facts (phash generation)
            for img in listing.images.all():
                if not img.phash and img.image:
                    img.phash = compute_phash(img.image)
                    img.save(update_fields=["phash"])
            image_payload = build_image_payload(listing)

            # 2. rule-based text scan
            text_flags, text_reasons, text_score = rule_scan(listing)

            # 3. price stats (real market data)
            price_result = analyze_price(listing)
            AIAnalysis.objects.create(
                listing=listing, analyzer_type="price", provider="stats", model="db-median",
                score=price_result.get("anomaly_score", 0),
                result=price_result, reasons=price_result.get("notes", []),
            )

            # 4. AI gateway (primary or fallback provider)
            ai_ok = True
            text_analysis = gateway.analyze("text", build_text_payload(listing))
            if text_analysis is not None:
                merged_flags = list(dict.fromkeys(text_flags + text_analysis.result.get("flags", [])))
                merged_reasons = list(dict.fromkeys(text_reasons + text_analysis.reasons))
                AIAnalysis.objects.create(
                    listing=listing, analyzer_type="text", provider=text_analysis.provider,
                    model=text_analysis.model, score=max(text_score, text_analysis.score or 0),
                    result={"flags": merged_flags, "confidence": text_analysis.confidence,
                            "reasons": merged_reasons},
                    confidence=text_analysis.confidence, reasons=merged_reasons,
                )
            else:
                ai_ok = False

            image_analysis = gateway.analyze("image", image_payload)
            if image_analysis is not None:
                merged_flags = list(dict.fromkeys(
                    image_analysis.result.get("flags", [])
                    + (["duplicate_images"] if image_payload["duplicate_image_ids"] else [])
                ))
                merged_reasons = list(dict.fromkeys(
                    image_analysis.reasons + image_payload.get("issues", [])
                ))
                AIAnalysis.objects.create(
                    listing=listing, analyzer_type="image", provider=image_analysis.provider,
                    model=image_analysis.model, score=image_analysis.score,
                    result={"flags": merged_flags, "confidence": image_analysis.confidence,
                            "reasons": merged_reasons},
                    confidence=image_analysis.confidence, reasons=merged_reasons,
                )
            else:
                ai_ok = False

            # 5. risk engine (deterministic, uses all analyses)
            assessment = RiskEngine.assess(listing)
            RiskAssessment.objects.update_or_create(
                listing=listing,
                defaults={
                    "score": int(assessment["score"]),
                    "level": assessment["level"],
                    "reasons": assessment["reasons"],
                    "weights": assessment["weights"],
                },
            )

            # Barcha e'lonlar darhol nashr qilinadi. Xavf darajasi saqlanadi va
            # yuqori xavfli e'lonlar keyinroq admin/moderator tomonidan ko'rib
            # chiqilishi uchun xabar qilinadi.
            if assessment["level"] != "low":
                try:
                    from django.contrib.auth import get_user_model

                    User = get_user_model()
                    for moderator in User.objects.filter(
                        role__in=["moderator", "admin"], is_active=True
                    ):
                        NotificationService.create(
                            user=moderator,
                            type_="report_update",
                            title="Yangi e'lon: yuqori xavf",
                            body=f"'{listing.title}' e'lonida yuqori xavf aniqlandi.",
                            data={"listing_id": str(listing.id)},
                        )
                except Exception:
                    logger.warning("notify review failed for %s", listing.id)

            cls.transition(listing, ListingStatus.APPROVED, note="Xavf tekshiruvi yakunlandi")
            cls.transition(listing, ListingStatus.PUBLISHED, note="Avtomatik e'lon qilindi")
            return listing

    @classmethod
    def expire_overdue(cls) -> int:
        expired = Listing.objects.filter(
            status=ListingStatus.PUBLISHED, expires_at__lt=timezone.now()
        )
        count = 0
        for listing in expired:
            try:
                if listing.auto_renew:
                    listing.expires_at = timezone.now() + timedelta(days=30)
                    listing.save(update_fields=["expires_at"])
                else:
                    cls.transition(listing, ListingStatus.EXPIRED)
                count += 1
            except InvalidStatusTransition:
                continue
        return count

    @classmethod
    def recompute_slug(cls, listing: Listing) -> str:
        district = listing.prop.district
        slug_base = text.slugify(f"{district}-{listing.title}")
        listing.slug = f"{slug_base}-{listing.id}"
        listing.save(update_fields=["slug"])
        return listing.slug
