from django.contrib import admin

from apps.accounts.models import Profile, User, Verification

admin.site.site_header = "Ijara.uz boshqaruvi"
admin.site.site_title = "Ijara.uz"
admin.site.index_title = "Boshqaruv paneli"


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = (
        "phone",
        "email",
        "role",
        "trust_tier",
        "is_phone_verified",
        "is_email_verified",
        "is_profile_verified",
        "is_banned",
        "date_joined",
    )
    list_filter = ("role", "is_phone_verified", "is_profile_verified", "is_banned", "is_staff")
    search_fields = ("phone", "email")

    @admin.display(description="Ishonch darajasi")
    def trust_tier(self, obj):
        try:
            return obj.profile.trust_tier
        except Profile.DoesNotExist:
            return "-"


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "full_name", "city", "trust_tier", "updated_at")
    search_fields = ("full_name", "user__phone")


@admin.register(Verification)
class VerificationAdmin(admin.ModelAdmin):
    list_display = ("user", "channel", "purpose", "status", "attempts", "created_at")
    list_filter = ("channel", "purpose", "status")
