"""Document analysis: metadata extraction only.

OCR can be plugged in later behind this interface. Never treat OCR output as
proof of legal ownership — human/moderator review decides verification.
"""

import logging
from typing import Any

logger = logging.getLogger("apps.ai")


def extract_metadata(document) -> dict[str, Any]:
    """Deterministic metadata from an uploaded verification document."""
    f = document.file
    return {
        "filename": f.name,
        "size_bytes": f.size,
        "doc_type": document.doc_type,
        "uploaded_at": document.created_at.isoformat(),
        "extraction_method": "metadata",
        "notes": [
            "OCR hali yoqilmagan; faqat fayl metadata ajratib olindi",
            "Bu hujjat egalik huquqini isbotlamaydi",
        ],
    }


def analyze_document(document) -> dict[str, Any]:
    metadata = extract_metadata(document)
    document.extracted_data = metadata
    document.save(update_fields=["extracted_data"])
    logger.info("document %s metadata extracted", document.id)
    return metadata
