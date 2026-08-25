import logging

from django.db import transaction

from apps.accounts.models import (
    Profile,
    TrustTier,
    User,
    UserRole,
)
from apps.core.models import AuditLog

logger = logging.getLogger("apps.accounts")


class UserService:
    """Business logic around users and profiles (no logic inside views/models)."""

    @classmethod
    @transaction.atomic
    def register(cls, *, phone: str, password: str | None = None, full_name: str = "", email: str | None = None) -> User:
        # Password optional - agar berilmasa 3-bosqichda o'rnatiladi (spec bo'yicha)
        if password:
            user = User.objects.create_user(phone=phone, password=password)
        else:
            user = User.objects.create_user(phone=phone, password=None)
            user.set_unusable_password()
            user.save(update_fields=["password"])
        if email:
            user.email = email
            user.save(update_fields=["email"])
        Profile.objects.update_or_create(user=user, defaults={"full_name": full_name})
        return user

    @classmethod
    @transaction.atomic
    def set_role(cls, user: User, role: UserRole) -> User:
        user.role = role
        user.save(update_fields=["role"])
        return user

    @classmethod
    def recompute_trust_tier(cls, user: User) -> str:
        """Deterministic trust tier based on real verification facts. Never fabricated."""
        tier = TrustTier.NEW_USER
        if user.is_phone_verified:
            tier = TrustTier.PHONE_VERIFIED
        if user.is_email_verified and user.is_phone_verified:
            tier = TrustTier.PROFILE_VERIFIED
        if user.is_profile_verified and user.is_phone_verified:
            tier = TrustTier.TRUSTED
        user.profile.trust_tier = tier
        user.profile.save(update_fields=["trust_tier", "updated_at"])
        return tier

    @classmethod
    def log(cls, *, action, user, target_type="", target_id="", details=None, ip_address=None):
        AuditLog.record(
            action=action,
            actor=user,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ip_address=ip_address,
        )
