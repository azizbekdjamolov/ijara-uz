"""Image analysis: real duplicate detection via perceptual hashing (Pillow).

AI may add semantic checks on top later; duplicates here are deterministic facts.
"""

import io
import logging
from typing import Any

from PIL import Image, ImageOps, ImageStat

logger = logging.getLogger("apps.ai")

HASH_SIZE = 8  # 64-bit phash


def _phash(image: Image.Image) -> str:
    """dHash (difference hash) — fast, rotation/scale tolerant, deterministic."""
    gray = ImageOps.grayscale(image)
    resized = gray.resize((HASH_SIZE + 1, HASH_SIZE))
    pixels = list(resized.getdata())
    bits: list[str] = []
    for row in range(HASH_SIZE):
        base = row * (HASH_SIZE + 1)
        bits.extend(
            "1" if pixels[base + col] < pixels[base + col + 1] else "0"
            for col in range(HASH_SIZE)
        )
    return "".join(bits)


def compute_phash(image_file) -> str:
    data = image_file.read()
    image_file.seek(0)
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
        return _phash(img)
    except Exception:
        logger.warning("phash failed for %s", getattr(image_file, "name", "?"))
        return ""


def _quality_issues(image_file) -> tuple[bool, str | None]:
    """Cheap quality heuristics. Never claims perfect detection."""
    try:
        data = image_file.read()
        image_file.seek(0)
        img = Image.open(io.BytesIO(data))
        img.load()
    except Exception:
        return True, "Rasm o'qib bo'lmadi"
    w, h = img.size
    if w < 320 or h < 240:
        return True, "Rasm juda kichik"
    if w / h > 3.2 or h / w > 3.2:
        return True, "G'ayritabiiy nisbat"
    gray = ImageOps.grayscale(img)
    stat = ImageStat.Stat(gray)
    if stat.stddev[0] < 4:
        return True, "Rasm bir xil rang (ehtimol bo'sh)"
    return False, None


def build_image_payload(listing) -> dict[str, Any]:
    """Assemble deterministic facts for the gateway."""
    images = list(listing.images.all().order_by("order"))
    payload: dict[str, Any] = {
        "image_count": len(images),
        "duplicate_image_ids": [],
        "repeated_across_listings": 0,
        "has_irrelevant": False,
        "low_quality_count": 0,
        "issues": [],
    }
    if not images:
        return payload

    seen_within: dict[str, list[str]] = {}
    for img in images:
        if img.phash:
            seen_within.setdefault(img.phash, []).append(str(img.id))
    for ids in seen_within.values():
        if len(ids) > 1:
            payload["duplicate_image_ids"].extend(ids[1:])
            payload["issues"].append(f"Takroriy rasm: {len(ids)} nusxa")

    our_hashes = [img.phash for img in images if img.phash]
    if our_hashes:
        from apps.listings.models import ListingImage

        repeated = (
            ListingImage.objects.exclude(listing=listing)
            .filter(phash__in=our_hashes)
            .values_list("phash", flat=True)
            .distinct()
            .count()
        )
        payload["repeated_across_listings"] = repeated
        if repeated:
            payload["issues"].append(f"{repeated} ta rasm boshqa e'lonlarda ham bor")

    for img in images:
        if img.image:
            bad, reason = _quality_issues(img.image)
            if bad:
                payload["low_quality_count"] += 1
                payload["issues"].append(f"{img.order}: {reason}")

    return payload
