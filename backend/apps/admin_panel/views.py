from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Listing, ListingStatus
from apps.listings.serializers import ListingDetailSerializer

User = get_user_model()


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "admin"
            and not request.user.is_banned
        )


class AdminStatsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({
            "total_users": User.objects.count(),
            "total_listings": Listing.objects.exclude(status=ListingStatus.DELETED).count(),
            "pending_review": Listing.objects.filter(status=ListingStatus.PENDING_REVIEW).count(),
            "needs_review": Listing.objects.filter(status=ListingStatus.NEEDS_REVIEW).count(),
            "published": Listing.objects.filter(status=ListingStatus.PUBLISHED).count(),
            "banned_users": User.objects.filter(is_banned=True).count(),
            "admin_count": User.objects.filter(role="admin").count(),
        })


class AdminModerationQueueView(generics.ListAPIView):
    """Listings pending review — admin can approve or reject."""

    permission_classes = [IsAdmin]
    serializer_class = ListingDetailSerializer

    def get_queryset(self):
        return (
            Listing.objects.select_related("prop", "owner", "owner__profile", "risk")
            .filter(
                status__in=[ListingStatus.PENDING_REVIEW, ListingStatus.NEEDS_REVIEW]
            )
            .prefetch_related("images", "favorites", "ai_analyses")
            .order_by("-created_at")
        )


class AdminUserListView(generics.ListAPIView):
    """All users with search and role filter."""

    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = User.objects.select_related("profile").annotate(
            active_listings=Count(
                "listings",
                filter=Q(listings__status=ListingStatus.PUBLISHED),
            )
        )
        search = self.request.query_params.get("search", "").strip()
        role = self.request.query_params.get("role", "").strip()
        if search:
            qs = qs.filter(
                Q(phone__icontains=search)
                | Q(profile__full_name__icontains=search)
                | Q(email__icontains=search)
            )
        if role:
            qs = qs.filter(role=role)
        return qs.order_by("-date_joined")

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(self._serialize(page))
        return Response(self._serialize(qs[:100]))

    def _serialize(self, users):
        return [
            {
                "id": str(u.id),
                "phone": u.phone,
                "email": u.email,
                "full_name": u.profile.full_name if hasattr(u, "profile") else "",
                "role": u.role,
                "is_banned": u.is_banned,
                "is_phone_verified": u.is_phone_verified,
                "is_profile_verified": u.is_profile_verified,
                "date_joined": u.date_joined.isoformat() if u.date_joined else None,
                "active_listings": getattr(u, "active_listings", 0),
            }
            for u in users
        ]


class AdminToggleAdminView(APIView):
    """Grant or revoke admin role for a user."""

    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        target = User.objects.select_related("profile").filter(pk=user_id).first()
        if not target:
            return Response({"message": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return Response(
                {"message": "O'zingizning admin huquqingizni o'zgartira olmaysiz."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if target.is_banned:
            return Response(
                {"message": "Blokkangan foydalanuvchiga admin huquqi berib bo'lmaydi."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.accounts.models import UserRole

        if target.role == UserRole.ADMIN:
            target.role = UserRole.TENANT
            target.save(update_fields=["role"])
            message = "Admin huquqi olindi."
        else:
            target.role = UserRole.ADMIN
            target.save(update_fields=["role"])
            message = "Admin qilindi."
            from apps.notifications.services.notification_service import NotificationService

            NotificationService.create(
                user=target,
                type_="admin_assignment",
                title="Siz admin bo'ldingiz!",
                body="Tabriklaymiz! Endi sizda admin huquqlari bor. Admin panelga kirishingiz mumkin.",
            )
        return Response({"status": target.role, "message": message})


class AdminToggleBanView(APIView):
    """Ban or unban a user."""

    permission_classes = [IsAdmin]

    def post(self, request, user_id):
        target = User.objects.filter(pk=user_id).first()
        if not target:
            return Response({"message": "Foydalanuvchi topilmadi."}, status=status.HTTP_404_NOT_FOUND)
        if target.id == request.user.id:
            return Response(
                {"message": "O'zingizni bloklay olmaysiz."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        target.is_banned = not target.is_banned
        target.save(update_fields=["is_banned"])
        if target.is_banned:
            Listing.objects.filter(owner=target).exclude(
                status__in=[ListingStatus.DELETED, ListingStatus.DRAFT]
            ).update(status=ListingStatus.PAUSED)
        return Response({
            "is_banned": target.is_banned,
            "message": "Foydalanuvchi bloklandi." if target.is_banned else "Foydalanuvchi faollashtirildi.",
        })
