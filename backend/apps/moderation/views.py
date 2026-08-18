"""Moderator dashboard API: queues, actions, user suspension."""

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.models import RiskLevel
from apps.listings.models import Listing, ListingStatus, Report, ReportStatus
from apps.listings.serializers import ListingDetailSerializer, ReportCreateSerializer
from apps.listings.services.listing_service import (
    InvalidStatusTransition,
    ListingService,
)
from apps.notifications.services.notification_service import NotificationService
from apps.verification.models import VerificationDocument, VerificationDocumentStatus
from apps.verification.serializers import VerificationDocumentSerializer

User = get_user_model()


class IsModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_moderator()


def _annotate_listings(qs):
    return qs.select_related("prop", "owner", "owner__profile", "risk").annotate(
        reports_count=Count("reports", distinct=True)
    )


class ModerationQueueView(generics.ListAPIView):
    """Pending / needs-review / high-risk listings for moderators."""

    permission_classes = [IsModerator]
    serializer_class = ListingDetailSerializer

    def get_queryset(self):
        section = self.request.query_params.get("section", "pending")
        qs = Listing.objects.exclude(status__in=[ListingStatus.DELETED, ListingStatus.DRAFT])
        if section == "high_risk":
            qs = qs.filter(
                status=ListingStatus.NEEDS_REVIEW,
                risk__level=RiskLevel.HIGH,
            )
        elif section == "reports":
            qs = qs.filter(reports__status=ReportStatus.NEW).distinct()
        elif section == "ai_checking":
            qs = qs.filter(status=ListingStatus.AI_CHECKING)
        else:
            qs = qs.filter(status=ListingStatus.NEEDS_REVIEW)
        return _annotate_listings(qs).order_by("-created_at")


class ModerationListingDetailView(generics.RetrieveAPIView):
    """Full picture for a moderator: listing, risk, analyses, reports, history."""

    permission_classes = [IsModerator]
    serializer_class = ListingDetailSerializer

    def get_queryset(self):
        return _annotate_listings(Listing.objects.all())

    def retrieve(self, request, *args, **kwargs):
        listing = self.get_object()
        data = self.get_serializer(listing).data
        data["risk"] = (
            {
                "score": listing.risk.score,
                "level": listing.risk.level,
                "reasons": listing.risk.reasons,
            }
            if getattr(listing, "risk", None)
            else None
        )
        data["analyses"] = [
            {
                "analyzer_type": a.analyzer_type,
                "provider": a.provider,
                "model": a.model,
                "score": a.score,
                "confidence": a.confidence,
                "reasons": a.reasons,
            }
            for a in listing.ai_analyses.all()
        ]
        data["reports"] = ReportCreateSerializer(
            listing.reports.all(), many=True, context={"request": request}
        ).data
        return Response(data)


class ModeratorListingActionView(APIView):
    """approve / reject / request-verification / pause / unpause / publish."""

    permission_classes = [IsModerator]

    def _get_listing(self, pk):
        return get_object_or_404(Listing.objects.select_related("prop", "owner"), pk=pk)

    def _transition(self, request, listing, target, note=""):
        try:
            ListingService.transition(listing, target, actor=request.user, note=note)
        except InvalidStatusTransition as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"status": listing.status, "message": "Bajarildi."})

    def post(self, request, pk, action):
        listing = self._get_listing(pk)
        note = request.data.get("note", "")
        if action == "approve":
            result = self._transition(request, listing, ListingStatus.APPROVED, note)
            if result.status_code == 200:
                ListingService.transition(listing, ListingStatus.PUBLISHED, actor=request.user)
                NotificationService.listing_published(listing)
            return result
        if action == "reject":
            result = self._transition(request, listing, ListingStatus.REJECTED, note)
            if result.status_code == 200:
                NotificationService.listing_rejected(listing, note)
            return result
        if action == "request_verification":
            result = self._transition(
                request, listing, ListingStatus.NEEDS_REVIEW, "Hujjat tasdiqlashi so'raldi"
            )
            if result.status_code == 200:
                NotificationService.create(
                    user=listing.owner,
                    type_="verification_result",
                    title="Hujjat tasdiqlashi so'raldi",
                    body="Moderator e'loningiz uchun qo'shimcha tasdiqlash hujjatini so'radi.",
                    data={"listing_id": str(listing.id)},
                )
            return result
        if action == "pause":
            return self._transition(request, listing, ListingStatus.PAUSED, note)
        if action == "publish":
            return self._transition(request, listing, ListingStatus.PUBLISHED, note)
        return Response({"message": "Noma'lum amal."}, status=status.HTTP_400_BAD_REQUEST)


class ModerationReportListView(generics.ListAPIView):
    permission_classes = [IsModerator]
    serializer_class = ReportCreateSerializer

    def get_queryset(self):
        status_filter = self.request.query_params.get("status", "new")
        return Report.objects.select_related("reporter", "listing").filter(
            status=status_filter
        ).order_by("-created_at")


class ModerationReportActionView(APIView):
    permission_classes = [IsModerator]

    def post(self, request, pk, action):
        report = get_object_or_404(Report, pk=pk)
        if action == "resolve":
            report.status = ReportStatus.RESOLVED
        elif action == "dismiss":
            report.status = ReportStatus.DISMISSED
        else:
            return Response({"message": "Noma'lum amal."}, status=status.HTTP_400_BAD_REQUEST)
        report.resolved_by = request.user
        report.resolution_note = request.data.get("note", "")[:500]
        report.resolved_at = timezone.now()
        report.save()
        NotificationService.create(
            user=report.reporter,
            type_="report_update",
            title="Shikoyat holati yangilandi",
            body=f"Shikoyatingiz: {report.get_reason_display()} вЂ” {report.get_status_display().lower()}.",
            data={"report_id": str(report.id)},
        )
        return Response({"message": "Bajarildi."})


class VerificationRequestsView(generics.ListAPIView):
    permission_classes = [IsModerator]
    serializer_class = VerificationDocumentSerializer

    def get_queryset(self):
        return VerificationDocument.objects.select_related("user", "user__profile").filter(
            status__in=[
                VerificationDocumentStatus.PENDING,
                VerificationDocumentStatus.REVIEWING,
            ]
        ).order_by("-created_at")


class VerificationDocumentActionView(APIView):
    permission_classes = [IsModerator]

    def post(self, request, pk, action):
        document = get_object_or_404(
            VerificationDocument.objects.select_related("user", "user__profile"), pk=pk
        )
        if action == "approve":
            document.status = VerificationDocumentStatus.VERIFIED
            document.reviewed_by = request.user
            document.reviewed_at = timezone.now()
            document.moderator_note = request.data.get("note", "")[:500]
            document.save()
            user = document.user
            user.is_profile_verified = True
            user.save(update_fields=["is_profile_verified"])
            from apps.accounts.services.user_service import UserService

            UserService.recompute_trust_tier(user)
            NotificationService.create(
                user=user,
                type_="verification_result",
                title="Profil tasdiqlandi",
                body="Hujjatlaringiz tekshirildi va profilingiz tasdiqlangan maqomga o'tkazildi.",
            )
            return Response({"message": "Hujjat tasdiqlandi."})
        if action == "reject":
            document.status = VerificationDocumentStatus.REJECTED
            document.reviewed_by = request.user
            document.reviewed_at = timezone.now()
            document.moderator_note = request.data.get("note", "")[:500]
            document.save()
            NotificationService.create(
                user=document.user,
                type_="verification_result",
                title="Hujjat rad etildi",
                body=f"Hujjat qayta ko'rib chiqildi: {document.moderator_note}",
            )
            return Response({"message": "Hujjat rad etildi."})
        return Response({"message": "Noma'lum amal."}, status=status.HTTP_400_BAD_REQUEST)


class SuspendUserView(APIView):
    permission_classes = [IsModerator]

    def post(self, request, user_id, action):
        user = get_object_or_404(User, pk=user_id)
        if user.id == request.user.id:
            return Response({"message": "O'zingizni bloklay olmaysiz."}, status=status.HTTP_400_BAD_REQUEST)
        if action == "suspend":
            user.is_banned = True
            user.save(update_fields=["is_banned"])
            Listing.objects.filter(owner=user).exclude(
                status__in=[ListingStatus.DELETED, ListingStatus.DRAFT]
            ).update(status=ListingStatus.PAUSED)
            return Response({"message": "Foydalanuvchi bloklandi.", "banned": True})
        if action == "unsuspend":
            user.is_banned = False
            user.save(update_fields=["is_banned"])
            return Response({"message": "Foydalanuvchi faollashtirildi.", "banned": False})
        return Response({"message": "Noma'lum amal."}, status=status.HTTP_400_BAD_REQUEST)


class SuspendedUsersView(generics.ListAPIView):
    permission_classes = [IsModerator]

    def get_queryset(self):
        return User.objects.filter(is_banned=True).order_by("-date_joined")

    def list(self, request, *args, **kwargs):
        users = self.get_queryset()[:100]
        return Response(
            [
                {
                    "id": str(u.id),
                    "phone": u.phone,
                    "full_name": u.profile.full_name,
                    "role": u.role,
                    "date_joined": u.date_joined,
                }
                for u in users
            ]
        )


class ModerationStatsView(APIView):
    permission_classes = [IsModerator]

    def get(self, request):
        return Response(
            {
                "needs_review": Listing.objects.filter(status=ListingStatus.NEEDS_REVIEW).count(),
                "high_risk": Listing.objects.filter(
                    status=ListingStatus.NEEDS_REVIEW, risk__level=RiskLevel.HIGH
                ).count(),
                "ai_checking": Listing.objects.filter(status=ListingStatus.AI_CHECKING).count(),
                "open_reports": Report.objects.filter(status=ReportStatus.NEW).count(),
                "verification_requests": VerificationDocument.objects.filter(
                    status__in=[
                        VerificationDocumentStatus.PENDING,
                        VerificationDocumentStatus.REVIEWING,
                    ]
                ).count(),
                "suspended_users": User.objects.filter(is_banned=True).count(),
            }
        )
