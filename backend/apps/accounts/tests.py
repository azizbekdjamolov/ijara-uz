import hashlib

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import (
    TrustTier,
    UserRole,
    Verification,
    VerificationChannel,
    VerificationPurpose,
    VerificationStatus,
)
from apps.core.models import AuditLog

User = get_user_model()

PHONE = "+998901234567"
PASSWORD = "StrongPass123!"


def code_hash(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


class RegistrationTests(APITestCase):
    def test_register_creates_user_and_profile(self):
        response = self.client.post(
            reverse("auth-register"),
            {"phone": PHONE, "password": PASSWORD, "full_name": "Azizbek"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(phone=PHONE)
        self.assertTrue(hasattr(user, "profile"))
        self.assertEqual(user.profile.full_name, "Azizbek")
        self.assertEqual(user.role, UserRole.TENANT)
        self.assertFalse(user.is_phone_verified)

    def test_register_duplicate_phone_rejected(self):
        User.objects.create_user(phone=PHONE, password=PASSWORD)
        response = self.client.post(
            reverse("auth-register"),
            {"phone": PHONE, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_invalid_phone_rejected(self):
        response = self.client.post(
            reverse("auth-register"),
            {"phone": "+998123", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_creates_verification_code(self):
        response = self.client.post(
            reverse("auth-register"),
            {"phone": PHONE, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        verification = Verification.objects.get(user__phone=PHONE)
        self.assertEqual(verification.channel, VerificationChannel.PHONE)
        self.assertEqual(verification.status, VerificationStatus.PENDING)
        self.assertTrue(verification.code_hash)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone=PHONE, password=PASSWORD)

    def test_login_with_phone(self):
        response = self.client.post(
            reverse("auth-login"),
            {"identifier": PHONE, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["phone"], PHONE)

    def test_login_wrong_password(self):
        response = self.client.post(
            reverse("auth-login"),
            {"identifier": PHONE, "password": "wrong"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_banned_user(self):
        self.user.is_banned = True
        self.user.save()
        response = self.client.post(
            reverse("auth-login"),
            {"identifier": PHONE, "password": PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class VerificationFlowTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone=PHONE, password=PASSWORD)

    def _authenticate(self):
        self.client.force_authenticate(self.user)

    def _create_pending_code(self, code="123456"):
        return Verification.objects.create(
            user=self.user,
            channel=VerificationChannel.PHONE,
            purpose=VerificationPurpose.REGISTRATION,
            code_hash=code_hash(code),
            expires_at=timezone.now() + timezone.timedelta(minutes=10),
        )

    def test_verify_phone_success(self):
        self._authenticate()
        self._create_pending_code()
        response = self.client.post(
            reverse("auth-verify-phone"), {"code": "123456"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_phone_verified)
        self.assertEqual(self.user.profile.trust_tier, TrustTier.PHONE_VERIFIED)

    def test_verify_phone_wrong_code(self):
        self._authenticate()
        verification = self._create_pending_code()
        response = self.client.post(
            reverse("auth-verify-phone"), {"code": "000000"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        verification.refresh_from_db()
        self.assertEqual(verification.attempts, 1)

    def test_verify_phone_requires_auth(self):
        response = self.client.post(
            reverse("auth-verify-phone"), {"code": "123456"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_resend_verification_creates_new_code(self):
        self._authenticate()
        response = self.client.post(
            reverse("auth-resend"),
            {"channel": "phone"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Verification.objects.filter(user=self.user).exists())

    def test_resend_when_already_verified(self):
        self.user.is_phone_verified = True
        self.user.save()
        self._authenticate()
        response = self.client.post(
            reverse("auth-resend"),
            {"channel": "phone"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class MeViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(phone=PHONE, password=PASSWORD)

    def test_me_requires_auth(self):
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_profile(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["phone"], PHONE)
        self.assertIn("profile", response.data)

    def test_me_update_profile(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            reverse("auth-me"),
            {"profile": {"full_name": "Azizbek Karimov", "city": "Toshkent"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.full_name, "Azizbek Karimov")


class RoleChangeTests(APITestCase):
    def setUp(self):
        self.moderator = User.objects.create_user(
            phone="+998901111111", password=PASSWORD, role=UserRole.MODERATOR
        )
        self.tenant = User.objects.create_user(phone=PHONE, password=PASSWORD)

    def _role_url(self, user_id):
        return reverse("auth-change-role", args=[user_id])

    def test_moderator_can_change_role(self):
        self.client.force_authenticate(self.moderator)
        response = self.client.post(
            self._role_url(self.tenant.id), {"role": "owner"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.tenant.refresh_from_db()
        self.assertEqual(self.tenant.role, UserRole.OWNER)

    def test_tenant_cannot_change_roles(self):
        self.client.force_authenticate(self.tenant)
        response = self.client.post(
            self._role_url(self.moderator.id), {"role": "owner"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_moderator_cannot_set_admin_role(self):
        self.client.force_authenticate(self.moderator)
        response = self.client.post(
            self._role_url(self.tenant.id), {"role": "admin"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuditLogTests(APITestCase):
    def test_verification_logs_audit_entries(self):
        user = User.objects.create_user(phone=PHONE, password=PASSWORD)
        self.client.force_authenticate(user)
        self.client.post(
            reverse("auth-resend"), {"channel": "phone"}, format="json"
        )
        self.assertTrue(
            AuditLog.objects.filter(
                actor=user, action="verification_code_sent"
            ).exists()
        )
