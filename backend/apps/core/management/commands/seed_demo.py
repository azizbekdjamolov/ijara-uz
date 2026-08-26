"""Seed demo data: amenities, users, sample listings with generated images.

Run: python manage.py seed_demo
"""

import io
import random
import uuid

from django.core.files.images import ImageFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw

from apps.accounts.models import Profile, TrustTier, User, UserRole
from apps.ai.tasks import analyze_listing_task
from apps.listings.models import Amenity, Listing, ListingStatus, Property
from apps.listings.services.listing_service import ListingService

AMENITIES = [
    ("wifi", "Wi-Fi"),
    ("furniture", "Mebel"),
    ("fridge", "Muzlatgich"),
    ("washing_machine", "Kir yuvish mashinasi"),
    ("tv", "Televizor"),
    ("balcony", "Balkon"),
    ("security", "Xavfsizlik"),
    ("intercom", "Domofon"),
    ("conditioner", "Konditsioner"),
    ("dishwasher", "Idish yuvish mashinasi"),
    ("microwave", "Mikroto'lqinli pech"),
    ("water_heater", "Suv isitgich"),
]

DISTRICTS = [
    ("Chilonzor", 41.285, 69.210),
    ("Yunusobod", 41.343, 69.276),
    ("Yakkasaroy", 41.287, 69.245),
    ("Mirzo Ulug'bek", 41.319, 69.307),
    ("Olmazor", 41.325, 69.190),
    ("Sergeli", 41.227, 69.240),
    ("Shayxontohur", 41.310, 69.240),
    ("Yashnobod", 41.274, 69.330),
    ("Mirobod", 41.287, 69.276),
    ("Uchtepa", 41.304, 69.160),
]

PRICES = [3_500_000, 4_200_000, 5_000_000, 6_500_000, 8_000_000, 2_800_000, 9_500_000, 12_000_000]
ROOMS = [1, 2, 2, 3, 3, 4]
AREAS = [38, 45, 55, 62, 75, 90]

TITLES = [
    "Zamonaviy ta'mirlangan kvartira",
    "Yangi uy-joy, to'liq mebelli",
    "Shinam 2 xonali kvartira",
    "Markazda qulay kvartira",
    "Oilaviy uy, hovli bilan",
    "Yangi binoda 3 xonali kvartira",
    "Oshxona mebeli bilan jihozlangan kvartira",
    "Metroga yaqin, qulay joylashuv",
]

COLORS = [
    (22, 163, 74), (37, 99, 235), (217, 119, 6), (124, 58, 237),
    (14, 116, 144), (190, 18, 60), (5, 150, 105), (79, 70, 229),
]


def _make_image(seed: int, w: int = 800, h: int = 600) -> ImageFile:
    img = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(img)
    color = COLORS[seed % len(COLORS)]
    for i in range(0, h, 12):
        shade = tuple(max(0, min(255, c + i // 8)) for c in color)
        draw.rectangle([0, i, w, i + 12], fill=shade)
    draw.rectangle([w // 4, h // 4, 3 * w // 4, 3 * h // 4], outline=(255, 255, 255), width=6)
    draw.text((w // 2 - 60, h // 2 - 12), f"Ijara.uz #{seed}", fill=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return ImageFile(buf, name=f"demo-{seed}.jpg")


class Command(BaseCommand):
    help = "Seed demo data for Ijara.uz"

    def add_arguments(self, parser):
        parser.add_argument("--listings", type=int, default=24)
        parser.add_argument("--publish", action="store_true", default=False,
                            help="Auto-run AI analysis on seeded listings (default: keep as pending)")

    def handle(self, *args, **options):
        for key, label in AMENITIES:
            Amenity.objects.get_or_create(key=key, defaults={"label_uz": label})

        password = "IjaraDemo123!"
        admin, created = User.objects.get_or_create(
            phone="+998901000000",
            defaults={
                "role": UserRole.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_phone_verified": True,
                "is_profile_verified": True,
                "email": "admin@ijara.uz",
            },
        )
        if created:
            admin.set_password(password)
            admin.save()
            Profile.objects.update_or_create(
                user=admin, defaults={"full_name": "Administrator", "trust_tier": TrustTier.BUSINESS}
            )

        moderator, created = User.objects.get_or_create(
            phone="+998901000001",
            defaults={
                "role": UserRole.MODERATOR,
                "is_staff": True,
                "is_phone_verified": True,
                "is_profile_verified": True,
                "email": "moderator@ijara.uz",
            },
        )
        if created:
            moderator.set_password(password)
            moderator.save()
            Profile.objects.update_or_create(
                user=moderator, defaults={"full_name": "Moderator", "trust_tier": TrustTier.TRUSTED}
            )

        owners = []
        for idx in range(3):
            phone = f"+99890010000{idx + 2}"
            owner, created = User.objects.get_or_create(
                phone=phone,
                defaults={
                    "role": UserRole.OWNER,
                    "is_phone_verified": True,
                    "is_profile_verified": idx == 0,
                    "email": f"owner{idx}@ijara.uz",
                },
            )
            if created:
                owner.set_password(password)
                owner.save()
            Profile.objects.update_or_create(
                user=owner,
                defaults={
                    "full_name": ["Azizbek Karimov", "Malika Yusupova", "Jasur Toshmatov"][idx],
                    "trust_tier": TrustTier.TRUSTED if idx == 0 else TrustTier.PHONE_VERIFIED,
                    "city": "Toshkent",
                },
            )
            owners.append(owner)

        random.seed(42)
        created_count = 0
        for i in range(options["listings"]):
            district, lat, lng = random.choice(DISTRICTS)
            owner = random.choice(owners)
            price = random.choice(PRICES)
            rooms = random.choice(ROOMS)
            area = random.choice(AREAS)
            prop = Property.objects.create(
                owner=owner,
                property_type="apartment" if i % 6 else "house",
                rooms=rooms,
                area=area,
                floor=random.randint(1, 16),
                total_floors=16,
                furnished=random.random() > 0.3,
                has_parking=random.random() > 0.5,
                has_elevator=True,
                has_ac=random.random() > 0.4,
                has_internet=True,
                family_ok=True,
                students_ok=random.random() > 0.3,
                min_rental_months=random.choice([1, 1, 1, 3, 6]),
                deposit=price if random.random() > 0.3 else None,
                description=(
                    "Yorug', shinam va toza kvartira. Mebel va maishiy texnika bilan to'liq "
                    "jihozlangan. Transport va do'konlarga yaqin, tinch va xavfsiz hudud. "
                    "Suv, gaz, elektr barcha kommunal xizmatlar mavjud. Uzoq muddatga ijaraga "
                    "berish afzal. Ko'rish uchun oldindan qo'ng'iroq qiling."
                ),
                city="Toshkent",
                district=district,
                latitude=lat + random.uniform(-0.015, 0.015),
                longitude=lng + random.uniform(-0.015, 0.015),
                location_accuracy="approximate",
            )
            listing = Listing.objects.create(
                owner=owner,
                prop=prop,
                title=random.choice(TITLES),
                price=price,
                status=ListingStatus.DRAFT,
            )
            for img_idx in range(random.randint(3, 6)):
                from apps.listings.models import ListingImage

                ListingImage.objects.create(
                    listing=listing,
                    image=_make_image(i * 7 + img_idx, 800, 600),
                    order=img_idx,
                    is_primary=img_idx == 0,
                )
            listing.slug = f"{uuid.uuid4().hex[:8]}"
            listing.save(update_fields=["slug"])
            ListingService.transition(listing, ListingStatus.PENDING_REVIEW, actor=owner)
            created_count += 1

        if options["publish"]:
            for listing in Listing.objects.filter(status=ListingStatus.PENDING_REVIEW):
                analyze_listing_task.apply(args=[str(listing.id)])

        self.stdout.write(
            self.style.SUCCESS(
                f"Seed done: {created_count} listings (total {Listing.objects.count()}). "
                f"Users: admin +998901000000, moderator +998901000001, "
                f"owners +998900100002..4 / password: {password}"
            )
        )
