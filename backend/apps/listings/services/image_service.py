"""Image processing: thumbnails with center-crop. Kept separate from business logic."""

import io
import logging

from django.core.files.images import ImageFile
from PIL import Image, ImageOps

logger = logging.getLogger("apps.listings")

THUMB_SIZE = (640, 480)


def make_thumb(image_file) -> ImageFile | None:
    try:
        data = image_file.read()
        image_file.seek(0)
        img = Image.open(io.BytesIO(data))
        img.load()
        img = ImageOps.exif_transpose(img)
        thumb = ImageOps.fit(img, THUMB_SIZE, Image.LANCZOS)
        buf = io.BytesIO()
        thumb.save(buf, format="JPEG", quality=82)
        buf.seek(0)
        return ImageFile(buf, name="thumb.jpg")
    except Exception:
        logger.warning("thumbnail failed for %s", getattr(image_file, "name", "?"))
        return None
