"""Regenerate demo images (and thumbs) for listings whose files are missing.

On Render, media lives on an ephemeral instance disk that can be lost between
deploys. This command deterministically rebuilds the seed demo images from the
stored file name so the site keeps working after any redeploy.

Run: python manage.py seed_demo_images
"""

import re

from django.core.management.base import BaseCommand

from apps.core.management.commands.seed_demo import _make_image
from apps.listings.models import ListingImage
from apps.listings.services.image_service import make_thumb

NAME_PATTERN = re.compile(r"demo-(\d+)", re.IGNORECASE)


class Command(BaseCommand):
    help = "Regenerate missing demo listing images and thumbnails"

    def handle(self, *args, **options):
        recreated = 0
        thumbed = 0
        for image in ListingImage.objects.all().iterator():
            try:
                if image.image and image.image.storage.exists(image.image.name):
                    current = image.image.storage.open(image.image.name).read()
                else:
                    current = None
            except Exception:
                current = None

            if current is None and image.image and image.image.name:
                match = NAME_PATTERN.search(image.image.name)
                seed = int(match.group(1)) if match else 0
                generated = _make_image(seed, 800, 600)
                image.image.save(image.image.name, generated, save=True)
                recreated += 1

            if current is not None and image.thumb:
                try:
                    if not image.thumb.storage.exists(image.thumb.name):
                        thumb = make_thumb(image.image.storage.open(image.image.name))
                        if thumb:
                            image.thumb.save(image.thumb.name, thumb, save=True)
                            thumbed += 1
                except Exception:
                    pass
            elif image.thumb is None:
                try:
                    thumb = make_thumb(image.image.storage.open(image.image.name))
                    if thumb:
                        image.thumb.save(
                            f"thumbs/{image.image.name.rsplit('/', 1)[-1]}", thumb, save=True
                        )
                        thumbed += 1
                except Exception:
                    pass

        self.stdout.write(
            self.style.SUCCESS(
                f"Recreated {recreated} images, generated {thumbed} thumbnails"
            )
        )