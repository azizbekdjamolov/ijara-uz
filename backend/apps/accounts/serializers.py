import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import Profile, UserRole
from apps.accounts.services.user_service import UserService

User = get_user_model()

PHONE_REGEX = re.compile(r"^\+998\d{9}$")


class RegisterSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=13)
    password = serializers.CharField(write_only=True)
    full_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        if not PHONE_REGEX.match(value):
            raise serializers.ValidationError(
                "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak."
            )
        if User.objects.filter(phone=value).exists():
            raise serializers.ValidationError("Bu telefon raqam allaqachon ro'yxatdan o'tgan.")
        return value

    def validate_email(self, value: str) -> str:
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Bu email allaqachon ro'yxatdan o'tgan.")
        return value

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def create(self, validated_data):
        return UserService.register(**validated_data)


class LoginSerializer(serializers.Serializer):
    """Accepts either phone (+998...) or email as the login identifier."""

    identifier = serializers.CharField()
    password = serializers.CharField(write_only=True)


class VerificationCodeSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=6, max_length=6)

    def validate_code(self, value: str) -> str:
        if not value.isdigit():
            raise serializers.ValidationError("Kod raqamlardan iborat bo'lishi kerak.")
        return value


class ResendVerificationSerializer(serializers.Serializer):
    channel = serializers.ChoiceField(choices=("email", "phone"))


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("full_name", "bio", "avatar", "city", "trust_tier")
        read_only_fields = ("trust_tier",)


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    full_name = serializers.CharField(source="profile.full_name", read_only=True, default="")
    city = serializers.CharField(source="profile.city", read_only=True, default="")
    trust_tier = serializers.CharField(source="profile.trust_tier", read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "phone",
            "email",
            "telegram_username",
            "role",
            "role_display",
            "is_phone_verified",
            "is_email_verified",
            "is_profile_verified",
            "date_joined",
            "full_name",
            "city",
            "trust_tier",
            "profile",
        )
        read_only_fields = fields

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        profile = instance.profile
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return super().update(instance, validated_data)


class ChangeRoleSerializer(serializers.Serializer):
    """Moderator/admin only. Keeps role changes explicit and audited."""

    role = serializers.ChoiceField(choices=UserRole.choices)

    def validate_role(self, value: str) -> str:
        if value not in (UserRole.OWNER, UserRole.TENANT):
            raise serializers.ValidationError("Faqat tenant yoki owner roli tayinlanishi mumkin.")
        return value
