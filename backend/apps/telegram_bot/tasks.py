"""Celery tasks for Telegram bot notifications."""

import logging

from celery import shared_task

logger = logging.getLogger("apps.telegram_bot")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_listing_published(self, listing_id: str) -> None:
    """Send a listing to the Telegram channel when it becomes published.

    Reads the Listing (and related Property) from the same database the site
    uses — no separate bot DB.
    """
    from django.conf import settings

    from apps.listings.models import Listing, ListingStatus

    channel_id = getattr(settings, "TELEGRAM_CHANNEL_ID", "")
    bot_domain = getattr(settings, "TELEGRAM_BOT_DOMAIN", "https://ijara.uz")

    if not channel_id:
        logger.debug("TELEGRAM_CHANNEL_ID sozlanmagan — xabar yuborilmaydi.")
        return

    try:
        listing = (
            Listing.objects.select_related("prop", "owner", "owner__profile")
            .prefetch_related("images")
            .get(pk=listing_id)
        )
    except Listing.DoesNotExist:
        logger.warning("Listing %s topilmadi.", listing_id)
        return

    if listing.status != ListingStatus.PUBLISHED:
        return

    prop = listing.prop
    primary_img = listing.images.filter(is_primary=True).first() or listing.images.first()
    listing_url = f"{bot_domain}/elon/{listing.slug}"

    property_types = {
        "apartment": "Kvartira",
        "house": "Uy",
        "room": "Xona",
        "office": "Ofis",
        "commercial": "Tijorat",
    }
    type_label = property_types.get(prop.property_type, prop.property_type)

    lines = [
        f"<b>{_escape(listing.title)}</b>",
        "",
        f"\U0001f3e0 {_escape(type_label)} \u00b7 {prop.rooms} xona \u00b7 {prop.area} m\u00b2",
        f"\U0001f4cd {_escape(prop.district)}{', ' + _escape(prop.address_line) if prop.address_line else ''}",
        f"\U0001f4b0 <b>{_format_price(listing.price)} so'm</b>/oy",
    ]
    if prop.floor and prop.total_floors:
        lines.append(f"\U0001f3e2 {prop.floor}/{prop.total_floors}-qavat")

    amenities = []
    if prop.furnished:
        amenities.append("Mebelli")
    if prop.has_internet:
        amenities.append("Internet")
    if prop.has_ac:
        amenities.append("Konditsioner")
    if prop.has_parking:
        amenities.append("Avtoturargoh")
    if prop.has_elevator:
        amenities.append("Lift")
    if amenities:
        lines.append("")
        lines.append("\u2728 " + " \u00b7 ".join(amenities))

    text = "\n".join(lines)

    from apps.telegram_bot.services import send_photo, send_message

    try:
        if primary_img and primary_img.image:
            img_url = _build_image_url(primary_img.image.url, bot_domain)
            send_photo(
                channel_id,
                img_url,
                caption=text,
                reply_markup={
                    "inline_keyboard": [[{"text": "Batafsil \u2192", "url": listing_url}]]
                },
            )
        else:
            send_message(
                channel_id,
                text,
                reply_markup={
                    "inline_keyboard": [[{"text": "Batafsil \u2192", "url": listing_url}]]
                },
            )
        logger.info("Telegram kanalga yuborildi: listing=%s", listing_id)
    except Exception as exc:
        logger.exception("Telegram xabar yuborishda xatolik listing=%s: %s", listing_id, exc)
        raise self.retry(exc=exc)


def _format_price(price: int) -> str:
    """Format price with thousand separators: 1500000 -> '1 500 000'."""
    return f"{price:,}".replace(",", " ")


def _escape(text: str) -> str:
    """Escape HTML special chars for Telegram parse_mode=HTML."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def _build_image_url(path: str, base: str) -> str:
    """Ensure the image URL is absolute."""
    if path.startswith("http"):
        return path
    base = base.rstrip("/")
    return f"{base}/{path.lstrip('/')}"
