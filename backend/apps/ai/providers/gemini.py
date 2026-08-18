"""Gemini multimodal provider over REST. Schema-validated, never trusted blindly."""

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

from apps.ai.providers.base import (
    AIAnalysisResult,
    AIConfigurationError,
    AIInvalidResponseError,
    AIUnavailableError,
    BaseAIProvider,
)

logger = logging.getLogger("apps.ai")

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM_INSTRUCTION = """\
You are a rental listing safety analyzer for Ijara.uz (Uzbekistan).
Analyze the provided listing data and respond with STRICT JSON only.
Schema:
{
  "risk_score": 0-100,
  "flags": ["string"],
  "confidence": 0.0-1.0,
  "reasons": ["human readable short reason"]
}
Known flag values: suspicious_payment_request, urgency_language, spam,
prohibited_content, duplicate_images, irrelevant_images, low_quality_images,
suspicious_contact, price_anomaly, no_flags.
Do not claim legal ownership verification. Never output anything besides JSON."""


def _validate_schema(payload: dict[str, Any]) -> dict[str, Any]:
    """Strict structural validation of model output. Raises on any deviation."""
    if not isinstance(payload, dict):
        raise AIInvalidResponseError("AI output is not an object")
    risk = payload.get("risk_score")
    if not isinstance(risk, (int, float)) or not 0 <= float(risk) <= 100:
        raise AIInvalidResponseError("AI risk_score out of range")
    flags = payload.get("flags", [])
    if not isinstance(flags, list) or not all(isinstance(f, str) for f in flags):
        raise AIInvalidResponseError("AI flags invalid")
    confidence = payload.get("confidence")
    if confidence is not None and (
        not isinstance(confidence, (int, float)) or not 0 <= float(confidence) <= 1
    ):
        raise AIInvalidResponseError("AI confidence out of range")
    reasons = payload.get("reasons", [])
    if not isinstance(reasons, list) or not all(isinstance(r, str) for r in reasons):
        raise AIInvalidResponseError("AI reasons invalid")
    return payload


class GeminiProvider(BaseAIProvider):
    name = "gemini"
    model = "gemini-2.0-flash"

    def _api_key(self) -> str:
        key = getattr(settings, "GEMINI_API_KEY", "")
        if not key:
            raise AIConfigurationError("GEMINI_API_KEY not configured")
        return key

    def _call(self, contents: list[dict[str, Any]]) -> str:
        url = GEMINI_ENDPOINT.format(model=self.model) + "?key=" + self._api_key()
        body = json.dumps(
            {
                "system_instruction": {"parts": [{"text": SYSTEM_INSTRUCTION}]},
                "contents": contents,
                "generationConfig": {
                    "temperature": 0.1,
                    "responseMimeType": "application/json",
                },
            }
        ).encode()
        req = urllib.request.Request(
            url, data=body, headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return resp.read().decode()
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 500, 502, 503, 504):
                logger.warning("gemini http %s (retryable)", exc.code)
                raise AIUnavailableError(f"Gemini HTTP {exc.code}") from exc
            logger.error("gemini http %s: %s", exc.code, exc.read()[:300].decode(errors="replace"))
            raise AIUnavailableError(f"Gemini HTTP {exc.code}") from exc
        except urllib.error.URLError as exc:
            logger.warning("gemini network error: %s", exc)
            raise AIUnavailableError(str(exc)) from exc

    def _parse(self, raw: str) -> dict[str, Any]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise AIInvalidResponseError("Gemini returned non-JSON") from exc
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIInvalidResponseError("Gemini response structure unexpected") from exc
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            raise AIInvalidResponseError("Gemini text is not JSON") from exc
        return _validate_schema(payload)

    def analyze(self, analyzer_type: str, payload: dict[str, Any]) -> AIAnalysisResult:
        contents = [{"role": "user", "parts": [{"text": json.dumps(payload, ensure_ascii=False)}]}]
        raw = self._call(contents)
        parsed = self._parse(raw)
        return AIAnalysisResult(
            provider=self.name,
            model=self.model,
            score=float(parsed["risk_score"]),
            result={
                "flags": parsed["flags"],
                "confidence": parsed.get("confidence"),
                "reasons": parsed.get("reasons", []),
            },
            confidence=parsed.get("confidence"),
            reasons=parsed.get("reasons", []),
        )
