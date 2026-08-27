"""Reservation business logic."""

from django.utils import timezone

from apps.listings.models import Listing, ListingStatus
from apps.chat.services.chat_service import ChatServiceError
from apps.listings.services.listing_service import ListingService
from apps.notifications.services.notification_service import NotificationService
from apps.reservations.models import Reservation, ReservationStatus


class ReservationServiceError(Exception):
    pass


class ReservationService:
    @classmethod
    def create(cls, *, conversation, initiator) -> Reservation:
        """Owner of the conversation's listing reserves it for the chat partner."""
        listing = conversation.listing
        if initiator.id != listing.owner_id:
            raise ReservationServiceError("Faqat e'lon egasi band qilishi mumkin.")
        if listing.status == ListingStatus.RESERVED:
            raise ReservationServiceError("E'lon allaqachon band qilingan.")
        if listing.status == ListingStatus.RENTED:
            raise ReservationServiceError("E'lon allaqachon ijaraga berilgan.")

        candidate = conversation.tenant if initiator.id == conversation.owner_id else conversation.owner
        if candidate.id == initiator.id:
            raise ReservationServiceError("O'zingizga band qila olmaysiz.")

        # One active reservation per (listing, candidate)
        existing = Reservation.objects.filter(
            listing=listing, candidate=candidate,
            status=ReservationStatus.PENDING,
        ).first()
        if existing:
            return existing

        reservation = Reservation.objects.create(
            listing=listing,
            conversation=conversation,
            initiator=initiator,
            candidate=candidate,
            status=ReservationStatus.PENDING,
        )
        NotificationService.reservation_request(reservation=reservation)
        return reservation

    @classmethod
    def _ensure_candidate(cls, reservation: Reservation, user) -> None:
        if user.id != reservation.candidate_id:
            raise ReservationServiceError("Faqat e'lon so'ralgan odam rozilik bera oladi.")

    @classmethod
    def approve(cls, reservation: Reservation, user) -> Reservation:
        cls._ensure_candidate(reservation, user)
        if reservation.status != ReservationStatus.PENDING:
            raise ReservationServiceError("So'rov allaqachon yakunlangan.")
        reservation.status = ReservationStatus.CONFIRMED
        reservation.responded_at = timezone.now()
        reservation.save(update_fields=["status", "responded_at", "updated_at"])
        try:
            ListingService.transition(
                reservation.listing,
                ListingStatus.RESERVED,
                actor=user,
                note="Band qilish tasdiqlandi",
            )
        except ChatServiceError as exc:
            reservation.status = ReservationStatus.DECLINED
            reservation.save(update_fields=["status", "updated_at"])
            raise ReservationServiceError(str(exc))
        # Close any other pending requests for the same listing
        other = Reservation.objects.filter(
            listing=reservation.listing, status=ReservationStatus.PENDING
        ).exclude(id=reservation.id)
        for r in other:
            r.status = ReservationStatus.DECLINED
            r.responded_at = timezone.now()
            r.save(update_fields=["status", "responded_at", "updated_at"])
            try:
                NotificationService.reservation_superseded(reservation=r)
            except Exception:
                pass
        NotificationService.reservation_confirmed(reservation=reservation)
        return reservation

    @classmethod
    def decline(cls, reservation: Reservation, user) -> Reservation:
        cls._ensure_candidate(reservation, user)
        if reservation.status != ReservationStatus.PENDING:
            raise ReservationServiceError("So'rov allaqachon yakunlangan.")
        reservation.status = ReservationStatus.DECLINED
        reservation.responded_at = timezone.now()
        reservation.save(update_fields=["status", "responded_at", "updated_at"])
        NotificationService.reservation_declined(reservation=reservation)
        return reservation

    @classmethod
    def cancel(cls, reservation: Reservation, user) -> Reservation:
        if user.id != reservation.initiator_id:
            raise ReservationServiceError("Faqat boshlovchi bekor qilishi mumkin.")
        if reservation.status != ReservationStatus.PENDING:
            raise ReservationServiceError("Faqat kutilayotgan so'rov bekor qilinadi.")
        reservation.status = ReservationStatus.CANCELLED
        reservation.responded_at = timezone.now()
        reservation.save(update_fields=["status", "responded_at", "updated_at"])
        return reservation
