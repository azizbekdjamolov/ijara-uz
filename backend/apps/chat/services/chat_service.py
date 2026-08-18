"""Chat business logic. MVP uses REST + polling; WebSocket can be added later."""

import logging

from django.db import transaction
from django.utils import timezone

from apps.chat.models import Conversation, Message
from apps.listings.models import Listing

logger = logging.getLogger("apps.chat")


class ChatServiceError(Exception):
    pass


class ChatService:
    @classmethod
    def get_or_create(cls, *, tenant, listing: Listing) -> Conversation:
        if tenant.id == listing.owner_id:
            raise ChatServiceError("O'z e'loningizga yozolmaysiz.")
        conversation, _ = Conversation.objects.get_or_create(
            listing=listing,
            tenant=tenant,
            defaults={"owner": listing.owner},
        )
        return conversation

    @classmethod
    def send(cls, *, conversation: Conversation, sender, text: str = "", image=None) -> Message:
        if conversation.blocked_by is not None:
            raise ChatServiceError("Suhbat bloklangan.")
        message = Message.objects.create(
            conversation=conversation, sender=sender, text=text, image=image
        )
        with transaction.atomic():
            other_unread = "owner_unread" if sender.id == conversation.tenant_id else "tenant_unread"
            setattr(conversation, other_unread, getattr(conversation, other_unread) + 1)
            conversation.save(
                update_fields=[other_unread, "updated_at"],
            )
        if sender.id == conversation.tenant_id:
            recipient = conversation.owner
        else:
            recipient = conversation.tenant
        from apps.notifications.services.notification_service import NotificationService

        NotificationService.new_message(
            user=recipient,
            conversation=conversation,
            sender_name=str(sender.profile.full_name or sender.phone),
            text=text,
        )
        return message

    @classmethod
    def mark_read(cls, conversation: Conversation, user) -> None:
        if user.id == conversation.tenant_id:
            conversation.tenant_unread = 0
        else:
            conversation.owner_unread = 0
        conversation.save(update_fields=["tenant_unread", "owner_unread"])
        Message.objects.filter(
            conversation=conversation, is_read=False
        ).exclude(sender=user).update(is_read=True, read_at=timezone.now())

    @classmethod
    def block(cls, conversation: Conversation, user) -> None:
        if user.id not in (conversation.tenant_id, conversation.owner_id):
            raise ChatServiceError("Ruxsat yo'q.")
        conversation.blocked_by = user
        conversation.save(update_fields=["blocked_by"])

    @classmethod
    def unblock(cls, conversation: Conversation, user) -> None:
        if conversation.blocked_by_id != user.id:
            raise ChatServiceError("Faqat bloklagan foydalanuvchi bekor qilishi mumkin.")
        conversation.blocked_by = None
        conversation.save(update_fields=["blocked_by"])
