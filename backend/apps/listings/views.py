import logging

from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.models import ListingEvent, ListingEventType
from apps.listings.models import Listing, ListingImage, ListingStatus, Report
from apps.listings.serializers import (
    ListingDetailSerializer,
    ListingImageSerializer,
    ListingSummarySerializer,
    ListingWriteSerializer,
    ReportCreateSerializer,
)
from apps.listings.services.listing_service import ListingLimitError, ListingService

logger = logging.getLogger("apps.listings")


class IsOwnerOrModerator(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_moderator() or obj.owner_id == request.user.id


class IsModerator(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_moderator()


class ListingListCreateView(generics.ListCreateAPIView):
    """Create listing (draft) or list own listings."""

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ListingSummarySerializer
        return ListingWriteSerializer

    def get_queryset(self):
        user = self.request.user
        return (
            Listing.objects.select_related("prop", "owner", "owner__profile", "risk")
            .filter(owner=user)
            .exclude(status=ListingStatus.DELETED)
            .prefetch_related("images", "favorites")
            .order_by("-created_at")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ListingLimitError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ListingDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrModerator]

    def get_queryset(self):
        return Listing.objects.select_related("prop", "owner", "owner__profile", "risk").all()

    def get_serializer_class(self):
        if self.request.method == "GET" and not self.request.user.is_authenticated:
            return ListingDetailSerializer
        return ListingWriteSerializer if self.request.method in ("PUT", "PATCH") else ListingDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        listing = self.get_object()
        if request.user.is_authenticated:
            ListingEvent.objects.create(
                listing=listing,
                event_type=ListingEventType.VIEW,
                user=request.user,
                ip_address=request.META.get("REMOTE_ADDR"),
            )
        Listing.objects.filter(id=listing.id).update(views=F("views") + 1)
        serializer = self.get_serializer(listing)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        listing = self.get_object()
        ListingService.transition(
            listing, ListingStatus.DELETED, actor=request.user, note="Foydalanuvchi o'chirdi"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicListingView(generics.RetrieveAPIView):
    """Public SEO-friendly detail for any published listing.

    Owners can always view their own listings regardless of status.
    """

    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    serializer_class = ListingDetailSerializer

    def get_queryset(self):
        qs = Listing.objects.select_related(
            "prop", "owner", "owner__profile", "risk"
        )
        if self.request.user.is_authenticated:
            from django.db.models import Q
            return qs.filter(
                Q(status=ListingStatus.PUBLISHED) | Q(owner=self.request.user)
            )
        return qs.filter(status=ListingStatus.PUBLISHED)


class MyListingListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = ListingDetailSerializer

    def get_queryset(self):
        user_id = self.request.query_params.get("user_id")
        qs = (
            Listing.objects.select_related("prop", "owner", "owner__profile", "risk")
            .exclude(status=ListingStatus.DELETED)
            .prefetch_related("images", "favorites", "ai_analyses")
        )
        if user_id:
            qs = qs.filter(owner_id=user_id, status=ListingStatus.PUBLISHED)
        else:
            if not self.request.user.is_authenticated:
                return qs.none()
            qs = qs.filter(owner=self.request.user)
        return qs


class ListingImagesView(generics.GenericAPIView):
    """Multipart image upload for a listing (wizard step 3)."""

    permission_classes = [permissions.IsAuthenticated, IsOwnerOrModerator]
    parser_classes = [MultiPartParser, FormParser]
    queryset = Listing.objects.all()

    def post(self, request, pk):
        listing = self.get_object()
        images = request.FILES.getlist("images")
        if not images:
            return Response({"message": "Rasm tanlanmagan."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            created = ListingService.add_images(listing, images, request.user)
        except ListingLimitError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer = ListingImageSerializer(created, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ListingImageDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrModerator]

    def get_queryset(self):
        return ListingImage.objects.filter(listing_id=self.kwargs["pk"])

    def destroy(self, request, *args, **kwargs):
        img = self.get_object()
        if img.is_primary:
            next_primary = (
                img.listing.images.exclude(id=img.id).order_by("order").first()
            )
            if next_primary:
                next_primary.is_primary = True
                next_primary.save(update_fields=["is_primary"])
        img.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublishListingView(APIView):
    """Trigger the AI/rule verification pipeline."""

    permission_classes = [permissions.IsAuthenticated, IsOwnerOrModerator]

    def post(self, request, pk):
        listing = get_object_or_404(
            Listing.objects.select_related("prop", "owner", "owner__profile")
            .prefetch_related("images", "ai_analyses", "reports", "verification_documents"),
            pk=pk,
        )
        if listing.owner_id != request.user.id and not request.user.is_moderator():
            return Response({"message": "Ruxsat yo'q."}, status=status.HTTP_403_FORBIDDEN)
        if listing.status not in (ListingStatus.DRAFT, ListingStatus.PENDING_REVIEW, ListingStatus.NEEDS_REVIEW):
            return Response(
                {"message": "Bu holatdan e'lon joylash mumkin emas."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not listing.images.exists():
            return Response({"message": "Kamida bitta rasm yuklang."}, status=status.HTTP_400_BAD_REQUEST)

        ListingService.transition(listing, ListingStatus.PENDING_REVIEW, actor=request.user)

        try:
            listing = ListingService.run_ai_pipeline(listing)
            from apps.notifications.services.notification_service import NotificationService
            NotificationService.listing_published(listing)
            return Response(
                {"message": "E'lon tekshirildi.", "status": listing.status},
                status=status.HTTP_200_OK,
            )
        except Exception:
            logger.exception("AI pipeline failed synchronously, falling back to Celery")
            from apps.ai.tasks import analyze_listing_task
            analyze_listing_task.delay(str(listing.id))
            return Response(
                {"message": "E'lon tekshirilmoqda...", "status": listing.status},
                status=status.HTTP_202_ACCEPTED,
            )


class FavoriteListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ListingSummarySerializer

    def get_queryset(self):
        return (
            Listing.objects.select_related("prop", "owner", "owner__profile", "risk")
            .filter(favorites__user=self.request.user, status=ListingStatus.PUBLISHED)
            .prefetch_related("images", "favorites")
        )


class FavoriteToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        listing = get_object_or_404(Listing, pk=pk)
        favorite, created = listing.favorites.get_or_create(user=request.user)
        if created:
            ListingEvent.objects.create(
                listing=listing, event_type=ListingEventType.FAVORITE, user=request.user
            )
            return Response({"saved": True}, status=status.HTTP_201_CREATED)
        favorite.delete()
        return Response({"saved": False})


class ReportCreateView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReportCreateSerializer

    AUTO_REVIEW_REPORT_THRESHOLD = 3

    def perform_create(self, serializer):
        report = serializer.save(reporter=self.request.user)
        self._maybe_flag_listing(report.listing)

    def _maybe_flag_listing(self, listing) -> None:
        """3+ yangi shikoyat bo'lsa e'lonni qayta tekshiruvga o'tkaz."""
        from django.contrib.auth import get_user_model
        from apps.listings.models import ListingStatus
        from apps.listings.services.listing_service import ListingService, InvalidStatusTransition
        from apps.notifications.services.notification_service import NotificationService

        new_reports = listing.reports.filter(status="new").count()
        if new_reports < self.AUTO_REVIEW_REPORT_THRESHOLD:
            return
        if not ListingService.can_transition(listing.status, ListingStatus.NEEDS_REVIEW):
            return
        try:
            ListingService.transition(
                listing,
                ListingStatus.NEEDS_REVIEW,
                note=f"{new_reports} ta shikoyat tushdi — avtomatik qayta tekshiruv",
            )
        except InvalidStatusTransition:
            return
        User = get_user_model()
        for moderator in User.objects.filter(
            role__in=["moderator", "admin"], is_active=True
        ):
            NotificationService.create(
                user=moderator,
                type_="report_update",
                title="E'lon shikoyatlar soni bo'yicha bayroqlandi",
                body=(
                    f"'{listing.title}' e'loniga {new_reports} ta shikoyat tushdi "
                    "va qayta tekshiruv navbatiga o'tkazildi."
                ),
                data={"listing_id": str(listing.id)},
            )


class ReportListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReportCreateSerializer

    def get_queryset(self):
        return Report.objects.filter(reporter=self.request.user).order_by("-created_at")
