from django.contrib import admin

from apps.analytics.models import ListingEvent


@admin.register(ListingEvent)
class ListingEventAdmin(admin.ModelAdmin):
    list_display = ("listing", "event_type", "user", "ip_address", "created_at")
    list_filter = ("event_type", "created_at")
