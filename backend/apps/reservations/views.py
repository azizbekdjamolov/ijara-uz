from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import Conversation
from apps.reservations.models import Reservation, ReservationStatus
from apps.reservations.serializers import ReservationSerializer, ReservationCreateSerializer
from apps.reservations.services import ReservationService, ReservationServiceError


class CreateReservationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ReservationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = get_object_or_404(
            Conversation.objects.select_related("listing", "tenant", "owner"),
            pk=serializer.validated_data["conversation_id"],
        )
        if request.user.id not in (conversation.tenant_id, conversation.owner_id):
            return Response({"message": "Suhbat ishtirokchisi emassiz."}, status=status.HTTP_403_FORBIDDEN)
        try:
            reservation = ReservationService.create(conversation=conversation, initiator=request.user)
        except ReservationServiceError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)


class ReservationActionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk, action):
        reservation = get_object_or_404(Reservation, pk=pk)
        if request.user.id not in (reservation.initiator_id, reservation.candidate_id):
            return Response({"message": "Ruxsat yo'q."}, status=status.HTTP_403_FORBIDDEN)
        try:
            if action == "approve":
                reservation = ReservationService.approve(reservation, request.user)
            elif action == "decline":
                reservation = ReservationService.decline(reservation, request.user)
            elif action == "cancel":
                reservation = ReservationService.cancel(reservation, request.user)
            else:
                return Response({"message": "Noma'lum amal."}, status=status.HTTP_400_BAD_REQUEST)
        except ReservationServiceError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ReservationSerializer(reservation).data)


class ReservationByConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversation_id = request.query_params.get("conversation_id")
        if not conversation_id:
            return Response({"message": "conversation_id kerak."}, status=status.HTTP_400_BAD_REQUEST)
        reservation = (
            Reservation.objects.filter(
                conversation_id=conversation_id,
                status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            )
            .filter(initiator=request.user) | Reservation.objects.filter(
                conversation_id=conversation_id,
                status__in=[ReservationStatus.PENDING, ReservationStatus.CONFIRMED],
            ).filter(candidate=request.user)
        ).order_by("-created_at").first()
        if reservation is None:
            return Response({"reservation": None})
        return Response({"reservation": ReservationSerializer(reservation).data})
