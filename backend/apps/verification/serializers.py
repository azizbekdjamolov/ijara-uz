from rest_framework import serializers

from apps.verification.models import VerificationDocument


class VerificationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationDocument
        fields = (
            "id",
            "doc_type",
            "listing",
            "status",
            "extracted_data",
            "moderator_note",
            "created_at",
        )
        read_only_fields = ("id", "status", "extracted_data", "moderator_note", "created_at")

    def validate_file(self, value):
        if value.size > 15 * 1024 * 1024:
            raise serializers.ValidationError("Hujjat hajmi 15 MB dan oshmasligi kerak.")
        allowed = ("pdf", "png", "jpg", "jpeg", "webp")
        if not any(value.name.lower().endswith(ext) for ext in allowed):
            raise serializers.ValidationError("Faqat PDF, PNG, JPG yoki WEBP ruxsat etiladi.")
        return value
