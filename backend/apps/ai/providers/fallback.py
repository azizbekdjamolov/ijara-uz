"""Provider chain: primary -> backup -> None. Never raises to the caller."""

import logging
from typing import Any

from apps.ai.providers.base import (
    AIAnalysisResult,
    AIUnavailableError,
    BaseAIProvider,
)
from apps.ai.providers.gemini import GeminiProvider
from apps.ai.providers.mock import MockProvider

logger = logging.getLogger("apps.ai")


class AIProvidersUnavailable(Exception):
    """All configured providers failed. Caller must keep the listing queued."""


class FallbackProvider:
    """Chain of providers. If the primary is down, fall back to the backup.

    The deterministic rule provider is always the last resort so the platform
    never depends on external AI availability.
    """

    def __init__(self) -> None:
        self._primary: BaseAIProvider | None = None
        if self._enabled("GEMINI_API_KEY"):
            self._primary = GeminiProvider()
        self._backup = MockProvider()

    @staticmethod
    def _enabled(key: str) -> bool:
        from django.conf import settings

        return bool(getattr(settings, key, ""))

    def analyze(self, analyzer_type: str, payload: dict[str, Any]) -> AIAnalysisResult | None:
        errors: list[str] = []
        if self._primary is not None:
            try:
                result = self._primary.analyze(analyzer_type, payload)
                logger.info("ai: primary provider used: %s", result.provider)
                return result
            except AIUnavailableError as exc:
                errors.append(f"{self._primary.name}: {exc}")
                logger.warning("ai: primary provider unavailable: %s", exc)
            except Exception as exc:
                errors.append(f"{self._primary.name}: {exc}")
                logger.exception("ai: primary provider error")
        try:
            result = self._backup.analyze(analyzer_type, payload)
            logger.info("ai: backup provider used: %s", result.provider)
            return result
        except Exception as exc:
            errors.append(f"backup: {exc}")
            logger.exception("ai: backup provider error")
        raise AIProvidersUnavailable("; ".join(errors))
