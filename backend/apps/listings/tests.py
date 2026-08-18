"""Tests for the listings lifecycle: creation, anti-spam limits, images,
publish + AI pipeline, public visibility and search."""

import io

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import TrustTier, UserRole
from apps.core.models import SiteSetting
from apps.listings.models import Listing, ListingImage, ListingStatus, Property

User = get_user_model()

PHONE = "+998901234567"
PASSWORD = "StrongPass123!"


def make_image(name="apt.jpg", color=(210, 230, 245)):
    buf = io.BytesIO()
    Image.new("RGB", (320, 240), color).save(buf, format="JPEG")
    buf.seek(0)
    return buf


def listing_payload(**overrides):
    payload = {
        "title": "Yorug va toza 2 xonali kvartira ijaraga beriladi",
        "price": 3500000,
        "currency": "UZS",
        "property": {
            "property_type": "apartment",
            "rooms": 2,
            "area": 55.0,
            "floor": 3,
            "total_floors": 9,
            "furnished": True,
            "description": "Metroga yaqin, mebel bilan jihozlangan.",
            "city": "Toshkent",
            "district": "Yunusobod",
            "latitude": 41.35,
            "longitude": 69.29,
            "location_accuracy": "approximate",
        },
    }
    payload.update(overrides)
    return payload


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class ListingLifecycleTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone=PHONE,
            password=PASSWORD,
            role=UserRole.OWNER,
            is_phone_verified=True,
            is_profile_verified=True,
        )
        self.user.profile.trust_tier = TrustTier.TRUSTED
        self.user.profile.save()
        # Raise the new-user default of 1/day so tests are not throttled.
        SiteSetting.objects.update_or_create(
            key="listings.limit.trusted_per_day", defaults={"value": 50}
        )
        SiteSetting.objects.update_or_create(
            key="listings.cooldown_minutes", defaults={"value": 0}
        )
        self.client.force_authenticate(self.user)

    def _create(self, **overrides):
        return self.client.post(
            reverse("listing-list"), listing_payload(**overrides), format="json"
        )

    def test_create_requires_auth(self):
        self.client.force_authenticate(None)
        response = self._create()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_makes_pending_review_listing_with_property(self):
        response = self._create()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        listing = Listing.objects.get(id=response.data["id"])
        self.assertEqual(listing.status, ListingStatus.PENDING_REVIEW)
        self.assertEqual(listing.prop.district, "Yunusobod")
        self.assertEqual(listing.owner, self.user)

    def test_create_short_title_rejected(self):
        response = self._create(title="Qisqa")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_daily_limit_returns_429(self):
        SiteSetting.objects.update_or_create(
            key="listings.limit.trusted_per_day", defaults={"value": 1}
        )
        first = self._create()
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        second = self._create(title="Boshqa kvartira ijaraga beriladi")
        self.assertEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_publish_without_images_rejected(self):
        created = self._create()
        response = self.client.post(
            reverse("listing-publish", args=[created.data["id"]]), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_with_image_runs_ai_and_publishes(self):
        created = self._create()
        image_response = self.client.post(
            reverse("listing-images", args=[created.data["id"]]),
            {"images": make_image()},
            format="multipart",
        )
        self.assertEqual(image_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            ListingImage.objects.filter(listing_id=created.data["id"]).count(), 1
        )

        publish_response = self.client.post(
            reverse("listing-publish", args=[created.data["id"]]), format="json"
        )
        self.assertEqual(publish_response.status_code, status.HTTP_202_ACCEPTED)

        listing = Listing.objects.get(id=created.data["id"])
        self.assertEqual(listing.status, ListingStatus.PUBLISHED)
        self.assertIsNotNone(listing.published_at)
        self.assertIsNotNone(listing.risk)
        self.assertEqual(listing.risk.level, "low")

    def test_publish_not_owner_forbidden(self):
        other = User.objects.create_user(phone="+998902222222", password=PASSWORD)
        created = self._create()
        self.client.force_authenticate(other)
        response = self.client.post(
            reverse("listing-publish", args=[created.data["id"]]), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_public_detail_hides_unpublished(self):
        created = self._create()
        listing = Listing.objects.get(id=created.data["id"])
        response = self.client.get(
            reverse("listing-public", args=[listing.slug]), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_public_detail_after_publish(self):
        created = self._create()
        listing = Listing.objects.get(id=created.data["id"])
        self.client.post(
            reverse("listing-images", args=[created.data["id"]]),
            {"images": make_image()},
            format="multipart",
        )
        self.client.post(
            reverse("listing-publish", args=[created.data["id"]]), format="json"
        )
        response = self.client.get(
            reverse("listing-public", args=[listing.slug]), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ListingStatus.PUBLISHED)
        self.assertEqual(len(response.data["images"]), 1)
        self.assertIsNotNone(response.data["primary_image"])

    def test_search_finds_published_only(self):
        created = self._create()
        self.client.post(
            reverse("listing-images", args=[created.data["id"]]),
            {"images": make_image()},
            format="multipart",
        )
        self.client.post(
            reverse("listing-publish", args=[created.data["id"]]), format="json"
        )
        response = self.client.get(
            reverse("search-listings"),
            {"q": "Yorug", "city": "Toshkent"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        listing = Listing.objects.get(id=created.data["id"])
        slugs = [item["slug"] for item in response.data["results"]]
        self.assertIn(listing.slug, slugs)


class FavoriteAndReportTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            phone=PHONE, password=PASSWORD, role=UserRole.OWNER
        )
        self.tenant = User.objects.create_user(
            phone="+998903333333", password=PASSWORD, role=UserRole.TENANT
        )
        property_obj = Property.objects.create(
            owner=self.owner, city="Toshkent", district="Mirobod", area=50.0
        )
        listing = Listing.objects.create(
            owner=self.owner,
            title="Test listing for favorites",
            price=1000000,
            currency="UZS",
            status=ListingStatus.PUBLISHED,
            prop=property_obj,
        )
        listing.slug = f"{listing.id}"
        listing.save(update_fields=["slug"])
        self.listing = listing

    def test_favorite_toggle_and_list(self):
        self.client.force_authenticate(self.tenant)
        response = self.client.post(
            reverse("favorite-toggle", args=[self.listing.id]), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.get(reverse("favorites"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(str(self.listing.id), [f["id"] for f in response.data["results"]])

    def test_report_requires_reason(self):
        self.client.force_authenticate(self.tenant)
        response = self.client.post(
            reverse("report-create"),
            {"listing": str(self.listing.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_report_created(self):
        self.client.force_authenticate(self.tenant)
        response = self.client.post(
            reverse("report-create"),
            {"listing": str(self.listing.id), "reason": "fake_listing"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
