from rest_framework import serializers

from apps.reservations.models import Reservation, ReservationStatus


class ReservationSerializer(serializers.ModelSerializer):
    listing_id = serializers.UUIDField(source="listing.id", read_only=True)
    listing_title = serializers.CharField(source="listing.title", read_only=True)
    listing_slug = serializers.SlugField(source="listing.slug", read_only=True)
    conversation_id = serializers.UUIDField(source="conversation.id", read_only=True)
    initiator_id = serializers.UUIDField(source="initiator.id", read_only=True)
    candidate_id = serializers.UUIDField(source="candidate.id", read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "id",
            "listing_id",
            "listing_title",
            "listing_slug",
            "conversation_id",
            "initiator_id",
            "candidate_id",
            "status",
            "note",
            "created_at",
            "responded_at",
        )
        read_only_fields = fields


class ReservationCreateSerializer(serializers.Serializer):
    conversation_id = serializers.UUIDField()
