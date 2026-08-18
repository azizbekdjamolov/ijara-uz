from django.contrib import admin

from apps.listings.models import (
    Amenity,
    Favorite,
    Listing,
    ListingImage,
    ListingStatusHistory,
    Property,
    Report,
)


class ListingImageInline(admin.TabularInline):
    model = ListingImage
    extra = 0
    readonly_fields = ("phash",)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("id", "owner", "property_type", "rooms", "area", "district", "created_at")
    list_filter = ("property_type", "furnished", "district", "city")
    search_fields = ("district", "address_line", "owner__phone")


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "owner",
        "price",
        "status",
        "risk_level",
        "views",
        "created_at",
    )
    list_filter = ("status", "currency", "created_at")
    search_fields = ("title", "owner__phone", "slug")
    readonly_fields = ("slug", "views", "published_at", "expires_at")
    inlines = [ListingImageInline]

    @admin.display(description="Xavf")
    def risk_level(self, obj):
        return obj.risk.level if hasattr(obj, "risk") and obj.risk else "-"


@admin.register(ListingImage)
class ListingImageAdmin(admin.ModelAdmin):
    list_display = ("id", "listing", "order", "is_primary", "phash", "created_at")


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("key", "label_uz", "icon")
    search_fields = ("key", "label_uz")


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "listing", "created_at")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("id", "reporter", "listing", "reason", "status", "created_at")
    list_filter = ("reason", "status")
    search_fields = ("reporter__phone",)


@admin.register(ListingStatusHistory)
class ListingStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("listing", "from_status", "to_status", "changed_by", "created_at")
