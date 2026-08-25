from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import Conversation
from apps.chat.serializers import (
    ConversationSerializer,
    MessageCreateSerializer,
    MessageSerializer,
)
from apps.chat.services.chat_service import ChatService, ChatServiceError
from apps.listings.models import Listing


class IsConversationParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.id in (obj.tenant_id, obj.owner_id)


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            Conversation.objects.select_related(
                "listing", "tenant", "tenant__profile", "owner", "owner__profile"
            )
            .filter(tenant=user)
            .union(
                Conversation.objects.select_related(
                    "listing", "tenant", "tenant__profile", "owner", "owner__profile"
                ).filter(owner=user)
            )
            .order_by("-updated_at")
        )

    def create(self, request, *args, **kwargs):
        listing = get_object_or_404(
            Listing.objects.select_related("owner"), pk=request.data.get("listing_id")
        )
        try:
            conversation = ChatService.get_or_create(tenant=request.user, listing=listing)
        except ChatServiceError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationMessagesView(APIView):
    """REST polling chat (MVP). 'after' returns only new messages."""

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        after = request.query_params.get("after")
        qs = conversation.messages.select_related("sender", "sender__profile")
        if after:
            qs = qs.filter(id__gt=after)
        serializer = MessageSerializer(qs, many=True, context={"request": request})
        ChatService.mark_read(conversation, request.user)
        return Response(serializer.data)


class MessageCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            message = ChatService.send(
                conversation=conversation,
                sender=request.user,
                text=serializer.validated_data.get("text", ""),
                image=serializer.validated_data.get("image"),
            )
        except ChatServiceError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class UnreadCountView(APIView):
    """Total unread messages across all conversations of the current user."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        from django.db.models import Sum, Value, IntegerField
        from django.db.models.functions import Coalesce

        tenant_agg = Conversation.objects.filter(tenant=user).aggregate(
            total=Coalesce(Sum("tenant_unread"), Value(0), output_field=IntegerField())
        )
        owner_agg = Conversation.objects.filter(owner=user).aggregate(
            total=Coalesce(Sum("owner_unread"), Value(0), output_field=IntegerField())
        )
        return Response({"count": (tenant_agg["total"] or 0) + (owner_agg["total"] or 0)})


class ConversationActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def post(self, request, pk, action):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        try:
            if action == "block":
                ChatService.block(conversation, request.user)
            elif action == "unblock":
                ChatService.unblock(conversation, request.user)
            else:
                return Response({"message": "Noma'lum amal."}, status=status.HTTP_400_BAD_REQUEST)
        except ChatServiceError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Bajarildi."})
