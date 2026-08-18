"""AIGateway: single entry point for AI analysis. Business code never touches providers."""

import logging
from typing import Any

from apps.ai.providers.base import AIAnalysisResult
from apps.ai.providers.fallback import FallbackProvider

logger = logging.getLogger("apps.ai")


class AIGateway:
    """Wraps the provider chain. Callers receive results or None, never exceptions."""

    def __init__(self) -> None:
        self._chain = FallbackProvider()

    def analyze(self, analyzer_type: str, payload: dict[str, Any]) -> AIAnalysisResult | None:
        try:
            return self._chain.analyze(analyzer_type, payload)
        except Exception:
            logger.exception("ai: all providers unavailable for %s", analyzer_type)
            return None

    def is_ai_configured(self) -> bool:
        from django.conf import settings

        return bool(getattr(settings, "GEMINI_API_KEY", ""))


gateway = AIGateway()
