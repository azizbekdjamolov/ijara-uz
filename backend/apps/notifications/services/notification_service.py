"""Notification service: in-app first, email behind the same interface."""

import logging

from django.core.mail import send_mail
from django.utils import timezone

from apps.notifications.models import Notification, NotificationType

logger = logging.getLogger("apps.notifications")


class NotificationService:
    @classmethod
    def create(cls, *, user, type_: str, title: str, body: str = "", data: dict | None = None) -> Notification:
        return Notification.objects.create(
            user=user, type=type_, title=title, body=body, data=data or {}
        )

    @classmethod
    def listing_status(cls, listing, *, title: str, body: str, data: dict | None = None) -> Notification:
        notification = cls.create(
            user=listing.owner,
            type_=listing.status,
            title=title,
            body=body,
            data={"listing_id": str(listing.id), **(data or {})},
        )
        try:
            send_mail(
                subject=f"Ijara.uz — {title}",
                message=body,
                from_email=None,
                recipient_list=[listing.owner.email] if listing.owner.email else [],
                fail_silently=True,
            )
        except Exception:
            logger.warning("email notification failed for %s", listing.owner_id)
        return notification

    @classmethod
    def listing_published(cls, listing) -> Notification:
        from apps.listings.models import ListingStatus

        if listing.status == ListingStatus.PUBLISHED:
            return cls.listing_status(
                listing,
                title="E'loningiz tasdiqlandi",
                body="E'loningiz tekshiruvdan o'tdi va saytda e'lon qilindi.",
            )
        if listing.status == ListingStatus.NEEDS_REVIEW:
            return cls.listing_status(
                listing,
                title="E'loningiz qo'shimcha tekshiruvda",
                body="Xavfsizlik tizimi e'loningizni qo'shimcha tekshiruvga yo'naltirdi. Moderator yaqin orada ko'rib chiqadi.",
            )
        return cls.listing_status(
            listing,
            title="E'loningiz tekshirilmoqda",
            body="E'loningiz AI va xavfsizlik tizimi tomonidan tekshirilmoqda.",
        )

    @classmethod
    def listing_rejected(cls, listing, note: str = "") -> Notification:
        return cls.listing_status(
            listing,
            title="E'lon rad etildi",
            body=f"E'loningiz rad etildi. {note}".strip(),
            data={"moderation_note": note},
        )

    @classmethod
    def new_message(cls, *, user, conversation, sender_name: str, text: str) -> Notification:
        return cls.create(
            user=user,
            type_=NotificationType.NEW_MESSAGE,
            title="Yangi xabar",
            body=f"{sender_name}: {text[:120]}",
            data={"conversation_id": str(conversation.id)},
        )

    @classmethod
    def reservation_request(cls, *, reservation) -> Notification:
        listing = reservation.listing
        try:
            owner_name = str(listing.owner.profile.full_name or listing.owner.phone or "")
        except Exception:
            owner_name = ""
        return cls.create(
            user=reservation.candidate,
            type_=NotificationType.RESERVATION_REQUEST,
            title="Uy band qilish so'rovi",
            body=f"{owner_name}: \"{listing.title}\" uyni sizga band qilmoqchi. Rozimisiz?",
            data={
                "reservation_id": str(reservation.id),
                "listing_id": str(listing.id),
                "conversation_id": str(reservation.conversation_id),
                "action": "reservation_request",
            },
        )

    @classmethod
    def reservation_confirmed(cls, *, reservation) -> Notification:
        listing = reservation.listing
        return cls.create(
            user=reservation.initiator,
            type_=NotificationType.RESERVATION_CONFIRMED,
            title="Uy band qilindi",
            body=f"\"{listing.title}\" uy endi band deb belgilandi.",
            data={"listing_id": str(listing.id), "reservation_id": str(reservation.id)},
        )

    @classmethod
    def reservation_declined(cls, *, reservation) -> Notification:
        listing = reservation.listing
        return cls.create(
            user=reservation.initiator,
            type_=NotificationType.RESERVATION_DECLINED,
            title="Band qilish rad etildi",
            body=f"\"{listing.title}\" uchun band qilish so'rovi rad etildi.",
            data={"listing_id": str(listing.id), "reservation_id": str(reservation.id)},
        )

    @classmethod
    def reservation_superseded(cls, *, reservation) -> Notification:
        listing = reservation.listing
        return cls.create(
            user=reservation.candidate,
            type_=NotificationType.RESERVATION_SUPERSEDED,
            title="Band qilish bekor qilindi",
            body=f"\"{listing.title}\" uy boshqa kishi tomonidan band qilindi.",
            data={"listing_id": str(listing.id), "reservation_id": str(reservation.id)},
        )

    @classmethod
    def mark_all_read(cls, user) -> int:
        return Notification.objects.filter(user=user, is_read=False).update(
            is_read=True, read_at=timezone.now()
        )
