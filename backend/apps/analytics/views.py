from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.models import ListingEvent, ListingEventType
from apps.listings.models import Listing, ListingStatus


class OwnerStatsView(APIView):
    """Per-listing analytics for the owner dashboard."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        listings = Listing.objects.filter(owner=request.user).exclude(
            status=ListingStatus.DELETED
        ).order_by("-created_at")[:200]
        data = []
        for listing in listings:
            contacts = ListingEvent.objects.filter(
                listing=listing, event_type=ListingEventType.CONTACT
            ).count()
            data.append(
                {
                    "id": str(listing.id),
                    "slug": listing.slug,
                    "title": listing.title,
                    "status": listing.status,
                    "views": listing.views,
                    "favorites_count": listing.favorites.count(),
                    "contacts": contacts,
                    "created_at": listing.created_at,
                }
            )
        return Response(data)


class PlatformStatsView(APIView):
    """Public lightweight counters for the footer/home."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        published = Listing.objects.filter(status=ListingStatus.PUBLISHED)
        return Response(
            {
                "active_listings": published.count(),
                "districts": published.values("prop__district").distinct().count(),
                "verified_owners": published.filter(
                    owner__is_phone_verified=True
                ).values("owner").distinct().count(),
            }
        )
