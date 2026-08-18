"""AI provider abstraction. Business code never talks to a concrete provider."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


class AIProviderError(Exception):
    """Base error. All provider failures must be wrapped in these."""


class AIUnavailableError(AIProviderError):
    """Provider is temporarily unavailable (rate limit, network, 5xx). Retryable."""


class AIInvalidResponseError(AIProviderError):
    """Provider responded, but output failed schema validation. Not retryable."""


class AIConfigurationError(AIProviderError):
    """Provider not configured (e.g. missing API key)."""


@dataclass
class AIAnalysisResult:
    provider: str
    model: str
    score: float | None
    result: dict[str, Any]
    confidence: float | None = None
    reasons: list[str] = field(default_factory=list)
    raw_reference: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "model": self.model,
            "score": self.score,
            "confidence": self.confidence,
            "reasons": self.reasons,
            "result": self.result,
        }


class BaseAIProvider(ABC):
    """Each provider implements the same contract. Output must match the schema."""

    name: str = "base"
    model: str = ""

    @abstractmethod
    def analyze(self, analyzer_type: str, payload: dict[str, Any]) -> AIAnalysisResult:
        raise NotImplementedError
