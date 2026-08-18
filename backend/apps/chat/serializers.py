from rest_framework import serializers

from apps.chat.models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source="sender.id", read_only=True)
    sender_name = serializers.CharField(source="sender.profile.full_name", read_only=True)

    class Meta:
        model = Message
        fields = ("id", "sender_id", "sender_name", "text", "image", "is_read", "created_at")
        read_only_fields = fields


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("text", "image")

    def validate_text(self, value):
        if not value and not self.initial_data.get("image"):
            raise serializers.ValidationError("Xabar matni yoki rasmi kerak.")
        return value


class ConversationSerializer(serializers.ModelSerializer):
    listing = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread = serializers.SerializerMethodField()
    listing_id = serializers.UUIDField(source="listing.id", read_only=True)

    class Meta:
        model = Conversation
        fields = (
            "id",
            "listing_id",
            "listing",
            "other_user",
            "last_message",
            "unread",
            "blocked_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_listing(self, obj):
        listing = getattr(obj, "prefetched_listing", None) or obj.listing
        return {
            "id": str(listing.id),
            "slug": listing.slug,
            "title": listing.title,
            "price": listing.price,
        }

    def get_other_user(self, obj):
        user = self.context["request"].user
        other = obj.owner if user.id == obj.tenant_id else obj.tenant
        return {
            "id": str(other.id),
            "full_name": other.profile.full_name or other.phone,
            "is_phone_verified": other.is_phone_verified,
            "is_profile_verified": other.is_profile_verified,
        }

    def get_last_message(self, obj):
        message = getattr(obj, "prefetched_last_message", None)
        if message is None:
            message = obj.messages.order_by("-created_at").first()
        if message is None:
            return None
        return {
            "text": message.text[:80],
            "sender_id": str(message.sender_id),
            "created_at": message.created_at,
            "is_read": message.is_read,
            "has_image": bool(message.image),
        }

    def get_unread(self, obj):
        user = self.context["request"].user
        if user.id == obj.tenant_id:
            return obj.tenant_unread
        if user.id == obj.owner_id:
            return obj.owner_unread
        return 0
