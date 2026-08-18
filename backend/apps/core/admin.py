from django.contrib import admin

from apps.core.models import AuditLog, SiteSetting


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ("key", "value", "updated_at")
    search_fields = ("key",)

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        from apps.core.services import SettingsService

        SettingsService.clear_cache(obj.key)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "actor", "target_type", "target_id", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("actor__phone", "target_id")
