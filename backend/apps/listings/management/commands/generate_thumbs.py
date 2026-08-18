"""Fill missing thumbnails for existing images (one-off maintenance)."""

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Generate missing thumbnails for listing images"

    def handle(self, *args, **options):
        from apps.listings.models import ListingImage
        from apps.listings.services.image_service import make_thumb

        missing = ListingImage.objects.filter(thumb="")
        count = 0
        for img in missing.iterator(chunk_size=200):
            thumb = make_thumb(img.image)
            if thumb:
                img.thumb = thumb
                img.save(update_fields=["thumb"])
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Generated {count} thumbnails"))
