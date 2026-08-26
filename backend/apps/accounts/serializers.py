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
    # Password endi OTP dan keyin alohida bosqichda o'rnatiladi, shuning uchun optional
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
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
        if not value:
            return value
        validate_password(value)
        return value

    def create(self, validated_data):
        return UserService.register(**validated_data)


class RegisterCompleteSerializer(serializers.Serializer):
    """3-bosqich: OTP tasdiqlangandan keyin parolni o'rnatish va token olish."""
    phone = serializers.CharField(max_length=13)
    password = serializers.CharField(write_only=True)
    # code ham talab qilinishi mumkin - lekin verify allaqachon o'tgan bo'lsa shart emas
    code = serializers.CharField(min_length=6, max_length=6, required=False, allow_blank=True)

    def validate_phone(self, value: str) -> str:
        if not PHONE_REGEX.match(value):
            raise serializers.ValidationError(
                "Telefon raqam +998XXXXXXXXX formatida bo'lishi kerak."
            )
        return value

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value

    def validate(self, attrs):
        phone = attrs.get("phone")
        try:
            user = User.objects.get(phone=phone)
        except User.DoesNotExist as err:
            raise serializers.ValidationError({"phone": "Foydalanuvchi topilmadi."}) from err
        # SMS vaqtincha o'chirilgan — is_phone_verified tekshiruvi olib tashlandi (xozircha)
        # if not user.is_phone_verified:
        #     raise serializers.ValidationError({"phone": "Telefon hali tasdiqlanmagan. Avval OTP ni tasdiqlang."})
        if user.is_banned:
            raise serializers.ValidationError({"phone": "Akkaunt bloklangan."})
        attrs["user"] = user
        return attrs


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
    has_password = serializers.SerializerMethodField()

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
            "has_password",
            "profile",
        )
        read_only_fields = fields

    def get_has_password(self, obj) -> bool:
        return obj.has_usable_password()

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


class UserUpdateSerializer(serializers.ModelSerializer):
    """Writable serializer for profile updates via PATCH /auth/me/."""

    full_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    city = serializers.CharField(max_length=64, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("full_name", "city", "phone")

    def update(self, instance, validated_data):
        full_name = validated_data.pop("full_name", None)
        city = validated_data.pop("city", None)
        profile = instance.profile
        if full_name is not None:
            profile.full_name = full_name
        if city is not None:
            profile.city = city
        profile.save()
        if "phone" in validated_data:
            instance.phone = validated_data["phone"]
            instance.save(update_fields=["phone"])
        return instance


class PublicProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="profile.full_name", read_only=True, default="")
    avatar = serializers.ImageField(source="profile.avatar", read_only=True)
    city = serializers.CharField(source="profile.city", read_only=True, default="")
    member_since = serializers.DateTimeField(source="date_joined", read_only=True)
    active_listings_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "full_name",
            "avatar",
            "telegram_username",
            "city",
            "is_phone_verified",
            "is_profile_verified",
            "member_since",
            "active_listings_count",
            "role",
        )

    def get_active_listings_count(self, obj) -> int:
        return obj.listings.filter(status="published").count()


class SetPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_password(self, value: str) -> str:
        validate_password(value)
        return value
