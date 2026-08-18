from django.contrib import admin

from apps.verification.models import VerificationDocument


@admin.register(VerificationDocument)
class VerificationDocumentAdmin(admin.ModelAdmin):
    list_display = ("user", "doc_type", "status", "listing", "reviewed_by", "created_at")
    list_filter = ("doc_type", "status")
    search_fields = ("user__phone",)
    readonly_fields = ("extracted_data",)
