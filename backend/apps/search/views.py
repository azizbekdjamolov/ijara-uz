"""Search with DB indexes. Natural language parsing is deterministic, not LLM."""

import re
from typing import Any

from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.listings.models import Listing, ListingStatus, PropertyType
from apps.listings.serializers import ListingSummarySerializer

DISTRICTS = [
    "chilonzor", "yunusobod", "yakkasaroy", "mirzo ulug'bek", "mirzo ulugbek",
    "olmazor", "sergeli", "uchtepa", "bektemir", "yashnobod", "yangihayot",
    "shayxontohur", "mirabad", "mirabod", "shayxontoxur",
]

ROOM_PATTERNS = [
    re.compile(r"(\d)\s*xona"),
    re.compile(r"(\d)\s*xonali"),
]

PRICE_PATTERNS = [
    re.compile(r"(\d+)\s*(mln|million|mlyon|m)", re.IGNORECASE),
    re.compile(r"(\d+)\s*(ming|mingga)", re.IGNORECASE),
    re.compile(r"(\d+)\s*000\s*000"),
]

FURNISHED_MARKERS = ["mebelli", "meblili", "mebel"]
STUDENTS_MARKERS = ["talaba", "talabalar"]
FAMILY_MARKERS = ["oilali", "oila"]
PARKING_MARKERS = ["avtomobil", "mashina uchun", "garaj"]
AC_MARKERS = ["konditsioner", "konditsioneri", "konditsionerli"]


def parse_natural_query(q: str) -> dict[str, Any]:
    """Parse 'Chilonzorda 4 milliongacha 2 xonali mebelli uy' into structured filters."""
    text = q.lower()
    filters: dict[str, Any] = {}

    for district in DISTRICTS:
        if district in text:
            filters["district"] = "Toshkent" if district == "mirzo ulug'bek" else district.title()
            break

    for pattern in ROOM_PATTERNS:
        match = pattern.search(text)
        if match:
            filters["rooms"] = int(match.group(1))
            break

    price_matches = []
    for pattern in PRICE_PATTERNS:
        for match in pattern.finditer(text):
            value = int(match.group(1))
            if "ming" in match.group(0).lower() or "000" in match.group(0):
                price_matches.append(value * 1000)
            else:
                price_matches.append(value * 1_000_000)
    if price_matches:
        filters["price_max"] = max(price_matches)

    if any(m in text for m in FURNISHED_MARKERS):
        filters["furnished"] = True
    if any(m in text for m in STUDENTS_MARKERS):
        filters["students_ok"] = True
    if any(m in text for m in FAMILY_MARKERS):
        filters["family_ok"] = True
    if any(m in text for m in PARKING_MARKERS):
        filters["has_parking"] = True
    if any(m in text for m in AC_MARKERS):
        filters["has_ac"] = True

    if "uy" in text and "kvartira" not in text:
        filters["property_type"] = PropertyType.HOUSE
    elif "kvartira" in text:
        filters["property_type"] = PropertyType.APARTMENT
    return filters


def apply_filters(qs, params: dict[str, Any]):
    price_min = params.get("price_min")
    price_max = params.get("price_max")
    rooms = params.get("rooms")
    district = params.get("district")
    property_type = params.get("property_type")
    q = params.get("q")

    if price_min is not None:
        qs = qs.filter(price__gte=price_min)
    if price_max is not None:
        qs = qs.filter(price__lte=price_max)
    if rooms is not None:
        qs = qs.filter(prop__rooms=rooms)
    if district:
        qs = qs.filter(prop__district__icontains=district)
    if property_type:
        qs = qs.filter(prop__property_type=property_type)

    bool_filters = {
        "furnished": "prop__furnished",
        "has_parking": "prop__has_parking",
        "has_elevator": "prop__has_elevator",
        "has_ac": "prop__has_ac",
        "has_internet": "prop__has_internet",
        "family_ok": "prop__family_ok",
        "students_ok": "prop__students_ok",
    }
    for param, field in bool_filters.items():
        value = params.get(param)
        if value is not None:
            qs = qs.filter(**{field: bool(value)})

    min_rental = params.get("min_rental_months")
    if min_rental is not None:
        qs = qs.filter(prop__min_rental_months__lte=min_rental)

    if q:
        parsed = parse_natural_query(q)
        for key, value in parsed.items():
            if key == "price_max" and price_max is None:
                qs = qs.filter(price__lte=value)
            elif key == "district" and not district:
                qs = qs.filter(prop__district__icontains=value)
            elif key == "rooms" and rooms is None:
                qs = qs.filter(prop__rooms=value)
            elif key == "property_type" and property_type is None:
                qs = qs.filter(prop__property_type=value)
            elif key in bool_filters and params.get(key) is None:
                qs = qs.filter(**{bool_filters[key]: value})
        qs = qs.filter(Q(title__icontains=q) | Q(prop__description__icontains=q))

    sort = params.get("sort", "newest")
    ordering = {
        "newest": "-published_at",
        "oldest": "published_at",
        "price_asc": "price",
        "price_desc": "-price",
    }.get(sort, "-published_at")
    return qs.order_by(ordering)


def base_queryset():
    return (
        Listing.objects.select_related("prop", "owner", "owner__profile", "risk")
        .filter(status=ListingStatus.PUBLISHED)
        .prefetch_related("images", "favorites")
    )


class ListingSearchView(generics.ListAPIView):
    """Public listing search with filters, sorting and pagination."""

    permission_classes = [permissions.AllowAny]
    serializer_class = ListingSummarySerializer

    def get_queryset(self):
        params = self.request.query_params
        return apply_filters(base_queryset(), params)


class MapSearchView(APIView):
    """Map markers: price, position and a preview. Approximate coords honored."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        params = request.query_params
        qs = apply_filters(base_queryset(), params).filter(
            prop__latitude__isnull=False, prop__longitude__isnull=False
        )[:300]
        markers = []
        for listing in qs:
            images = getattr(listing, "prefetched_images", None) or list(listing.images.all())
            primary = next((i for i in images if i.is_primary), images[0] if images else None)
            thumb_url = None
            if primary and primary.thumb:
                thumb_url = request.build_absolute_uri(primary.thumb.url)
            markers.append(
                {
                    "id": str(listing.id),
                    "slug": listing.slug,
                    "title": listing.title,
                    "price": listing.price,
                    "lat": float(listing.prop.latitude),
                    "lng": float(listing.prop.longitude),
                    "district": listing.prop.district,
                    "rooms": listing.prop.rooms,
                    "area": listing.prop.area,
                    "location_accuracy": listing.prop.location_accuracy,
                    "thumb": thumb_url,
                }
            )
        return Response({"count": len(markers), "markers": markers})


class PopularAreasView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Count

        areas = (
            base_queryset()
            .values("prop__district")
            .annotate(count=Count("id"))
            .order_by("-count")[:12]
        )
        return Response(
            [
                {"district": item["prop__district"], "count": item["count"]}
                for item in areas
            ]
        )
