from rest_framework import serializers

import re

from apps.accounts.models import User
from apps.listings.models import Listing, ListingImage, Property, Report
from apps.listings.services.listing_service import ListingService


def _safe_abs_url(file_field, request) -> str | None:
    """Build an absolute URL for an ImageFieldFile, tolerating missing files."""
    if not file_field:
        return None
    try:
        url = file_field.url
    except Exception:
        return None
    if request is not None:
        return request.build_absolute_uri(url)
    return url


class AmenitySerializer(serializers.Serializer):
    key = serializers.CharField()
    label = serializers.CharField()


class PropertySerializer(serializers.ModelSerializer):
    amenities = AmenitySerializer(many=True, read_only=True)

    class Meta:
        model = Property
        fields = (
            "id",
            "property_type",
            "rooms",
            "area",
            "floor",
            "total_floors",
            "furnished",
            "has_parking",
            "has_elevator",
            "has_ac",
            "has_internet",
            "family_ok",
            "students_ok",
            "min_rental_months",
            "deposit",
            "description",
            "city",
            "district",
            "address_line",
            "latitude",
            "longitude",
            "location_accuracy",
            "amenities",
        )


class PropertyWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = (
            "property_type",
            "rooms",
            "area",
            "floor",
            "total_floors",
            "furnished",
            "has_parking",
            "has_elevator",
            "has_ac",
            "has_internet",
            "family_ok",
            "students_ok",
            "min_rental_months",
            "deposit",
            "description",
            "city",
            "district",
            "address_line",
            "latitude",
            "longitude",
            "location_accuracy",
            "amenities",
        )

    def validate_area(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Maydon musbat son bo'lishi kerak.")
        if value is not None and value < 10:
            raise serializers.ValidationError("Maydon kamida 10 m² bo'lishi kerak.")
        if value is not None and value > 1000:
            raise serializers.ValidationError("Maydon 1000 m² dan oshmasligi kerak.")
        return value

    def validate_price(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError("Narx musbat son bo'lishi kerak.")
        return value


class ListingImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    thumb = serializers.SerializerMethodField()

    class Meta:
        model = ListingImage
        fields = ("id", "image", "thumb", "order", "is_primary")

    def _abs(self, file_field) -> str | None:
        return _safe_abs_url(file_field, self.context.get("request"))

    def get_image(self, obj) -> str | None:
        return self._abs(obj.image)

    def get_thumb(self, obj) -> str | None:
        return self._abs(obj.thumb)


class OwnerSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    active_listings = serializers.SerializerMethodField()
    member_since = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "avatar",
            "is_phone_verified",
            "is_profile_verified",
            "member_since",
            "active_listings",
            "role",
        )

    def get_full_name(self, obj) -> str:
        try:
            return obj.profile.full_name or ""
        except Exception:
            return ""

    def get_avatar(self, obj) -> str | None:
        try:
            avatar = obj.profile.avatar
            return avatar.url if avatar else None
        except Exception:
            return None

    def get_active_listings(self, obj) -> int:
        return obj.listings.filter(status="published").count()

    def get_member_since(self, obj) -> str | None:
        return obj.date_joined.date().isoformat() if obj.date_joined else None


class ListingSummarySerializer(serializers.ModelSerializer):
    """Card-level listing data for grids, search, favorites, similar."""

    property = PropertySerializer(source="prop", read_only=True)
    primary_image = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    owner = OwnerSummarySerializer(read_only=True)
    risk_level = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = (
            "id",
            "slug",
            "title",
            "price",
            "currency",
            "status",
            "views",
            "created_at",
            "published_at",
            "property",
            "primary_image",
            "image_count",
            "owner",
            "is_favorite",
            "risk_level",
        )
        read_only_fields = fields

    def _primary(self, obj) -> ListingImage | None:
        images = getattr(obj, "prefetched_images", None)
        if images is not None:
            for img in images:
                if img.is_primary:
                    return img
            return images[0] if images else None
        return obj.images.filter(is_primary=True).first() or obj.images.first()

    def get_primary_image(self, obj) -> dict | None:
        img = self._primary(obj)
        if img is None:
            return None
        request = self.context.get("request")
        return {
            "id": str(img.id),
            "image": _safe_abs_url(img.image, request),
            "thumb": _safe_abs_url(img.thumb, request),
        }

    def get_image_count(self, obj) -> int:
        images = getattr(obj, "prefetched_images", None)
        return len(images) if images is not None else obj.images.count()

    def get_is_favorite(self, obj) -> bool:
        user = self.context.get("request").user if self.context.get("request") else None
        if user is None or not user.is_authenticated:
            return False
        favorites = getattr(obj, "prefetched_favorites", None)
        if favorites is not None:
            return any(f.user_id == user.id for f in favorites)
        return obj.favorites.filter(user=user).exists()

    def _get_risk(self, obj):
        risk = getattr(obj, "prefetched_risk", None)
        if risk is not None:
            return risk
        try:
            return obj.risk
        except Exception:
            return None

    def get_risk_level(self, obj) -> str | None:
        risk = self._get_risk(obj)
        return risk.level if risk else None


class ListingDetailSerializer(ListingSummarySerializer):
    images = ListingImageSerializer(many=True, read_only=True)
    verification = serializers.SerializerMethodField()

    class Meta(ListingSummarySerializer.Meta):
        fields = (*ListingSummarySerializer.Meta.fields, "images", "verification")

    def get_verification(self, obj) -> dict:
        """Only real verification facts. Never invented claims."""
        risk = self._get_risk(obj)
        return {
            "owner_phone_verified": obj.owner.is_phone_verified,
            "owner_profile_verified": obj.owner.is_profile_verified,
            "listing_checked": risk is not None and risk.level == "low"
            and obj.status == "published",
            "risk_level": risk.level if risk else None,
            "risk_reasons": risk.reasons if risk else [],
        }


class ListingWriteSerializer(serializers.ModelSerializer):
    property = PropertyWriteSerializer(source="prop")

    MAX_PRICE = 50_000_000

    class Meta:
        model = Listing
        fields = ("id", "title", "price", "currency", "property")
        read_only_fields = ("id",)

    def validate_title(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("Sarlavha kamida 10 belgidan iborat bo'lishi kerak.")
        if re.fullmatch(r"[a-zA-Z0-9]{10,}", value):
            raise serializers.ValidationError(
                "Sarlavha ma'nosiz belgilardan tashkil topmasligi kerak."
            )
        return value

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Narx musbat son bo'lishi kerak.")
        if value > self.MAX_PRICE:
            raise serializers.ValidationError(
                f"Narx {self.MAX_PRICE:,} so'mdan oshmasligi kerak."
            )
        return value

    def create(self, validated_data):
        property_data = validated_data.pop("prop")
        images = self.context.pop("images", None)
        request = self.context.get("request")
        return ListingService.create(
            owner=request.user,
            data={**validated_data, "property": property_data},
            images=images,
            ip_address=request.META.get("REMOTE_ADDR") if request else None,
        )

    def update(self, instance, validated_data):
        property_data = validated_data.pop("property", None)
        if property_data:
            for attr, value in property_data.items():
                setattr(instance.prop, attr, value)
            instance.prop.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ReportCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ("id", "listing", "conversation", "reason", "description", "status", "created_at")
        read_only_fields = ("id", "status", "created_at")

    def validate(self, attrs):
        if not attrs.get("listing") and not attrs.get("conversation"):
            raise serializers.ValidationError("E'lon yoki suhbat ko'rsatilishi kerak.")
        return attrs
