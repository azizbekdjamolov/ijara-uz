import logging
from abc import ABC, abstractmethod

from django.conf import settings
from django.core.cache import cache

try:
    import requests  # type: ignore[import-untyped]
except ImportError:  # pragma: no cover - agar requests o'rnatilmagan bo'lsa fallback
    requests = None  # type: ignore[assignment]
    logging.getLogger("apps.accounts").warning("[SMS] 'requests' kutubxonasi topilmadi - Eskiz ishlamaydi, console ga fallback")

logger = logging.getLogger("apps.accounts")


class SMSProvider(ABC):
    """Abstraction over SMS delivery providers (console, Eskiz, etc.)."""

    @abstractmethod
    def send(self, phone: str, message: str) -> None:
        raise NotImplementedError


class ConsoleSMSProvider(SMSProvider):
    """Development provider that prints the SMS to stdout."""

    def send(self, phone: str, message: str) -> None:
        logger.info("[SMS console -> %s] %s", phone, message)


class EskizSMSProvider(SMSProvider):
    """
    Real Eskiz.uz provider.
    Docs: https://notify.eskiz.uz/api/docs/
    Flow: POST /api/auth/login {email,password} -> token -> POST /api/message/sms/send
    Env: SMS_PROVIDER=eskiz, ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_BASE_URL, SMS_SENDER
    """

    CACHE_KEY = "eskiz_token"
    TOKEN_TTL = 25 * 24 * 3600  # Eskiz token ~30 kun, 25 kunda refresh

    def _get_base_url(self) -> str:
        return getattr(settings, "ESKIZ_BASE_URL", "https://notify.eskiz.uz").rstrip("/")

    def _get_sender(self) -> str:
        # Eskiz requires registered sender name, default 4546
        return getattr(settings, "SMS_SENDER", "4546") or "4546"

    def _get_token(self) -> str:
        if requests is None:
            logger.error("[Eskiz] 'requests' o'rnatilmagan - token olinmaydi")
            raise RuntimeError("requests kutubxonasi o'rnatilmagan. pip install requests")

        cached = cache.get(self.CACHE_KEY)
        if cached:
            logger.debug("[Eskiz] token from cache")
            return cached

        email = getattr(settings, "ESKIZ_EMAIL", "")
        password = getattr(settings, "ESKIZ_PASSWORD", "")
        base_url = self._get_base_url()

        if not email or not password:
            logger.error(
                "[Eskiz] ESKIZ_EMAIL / ESKIZ_PASSWORD sozlanmagan. SMS yuborilmaydi. "
                "Iltimos .env da ESKIZ_EMAIL va ESKIZ_PASSWORD ni to'ldiring."
            )
            raise RuntimeError("Eskiz API token/email sozlanmagan")

        url = f"{base_url}/api/auth/login"
        logger.info("[Eskiz] auth login: url=%s email=%s", url, email)
        try:
            resp = requests.post(url, data={"email": email, "password": password}, timeout=10)
            logger.debug("[Eskiz] auth response status=%s body=%s", resp.status_code, resp.text[:500])
            resp.raise_for_status()
            data = resp.json()
            token = data.get("data", {}).get("token") or data.get("token")
            if not token:
                logger.error("[Eskiz] auth javobida token yo'q: %s", data)
                raise RuntimeError("Eskiz token olinmadi")
            cache.set(self.CACHE_KEY, token, timeout=self.TOKEN_TTL)
            logger.info("[Eskiz] token olindi va cache'ga yozildi")
            return token
        except Exception as exc:
            # requests.RequestException ni ham, boshqa xatolarni ham tutamiz - sayt qulamaydi
            if requests is not None and isinstance(exc, requests.RequestException):
                logger.exception("[Eskiz] auth login xatolik: %s", exc)
            else:
                logger.exception("[Eskiz] auth kutilmagan xatolik: %s", exc)
            raise RuntimeError(f"Eskiz auth xatolik: {exc}") from exc

    def send(self, phone: str, message: str) -> None:
        base_url = self._get_base_url()
        sender = self._get_sender()

        # Eskiz phone format: 9989XXXXXXXX without + (or add +?)
        # Our phone is +998... -> strip +
        clean_phone = phone.lstrip("+").strip()
        token = self._get_token()
        url = f"{base_url}/api/message/sms/send"

        payload = {
            "mobile_phone": clean_phone,
            "message": message,
            "from": sender,
        }
        headers = {"Authorization": f"Bearer {token}"}

        logger.info(
            "[Eskiz] SMS yuborish boshlandi: to=%s from=%s url=%s",
            clean_phone,
            sender,
            url,
        )
        logger.debug("[Eskiz] payload=%s", {**payload, "message": message[:80]})

        if requests is None:
            raise RuntimeError("requests o'rnatilmagan")

        try:
            resp = requests.post(url, data=payload, headers=headers, timeout=10)
            logger.info("[Eskiz] SMS response status=%s body=%s", resp.status_code, resp.text[:1000])
            # Eskiz returns 200 with {"status":"waiting"} on success
            if resp.status_code == 401:
                # token expired - clear and retry once
                logger.warning("[Eskiz] 401 - token eskirgan, qayta urinib ko'riladi")
                cache.delete(self.CACHE_KEY)
                token = self._get_token()
                headers["Authorization"] = f"Bearer {token}"
                resp = requests.post(url, data=payload, headers=headers, timeout=10)
                logger.info("[Eskiz] retry response status=%s body=%s", resp.status_code, resp.text[:1000])

            resp.raise_for_status()
            try:
                data = resp.json()
            except Exception as err:
                logger.error("[Eskiz] javob JSON emas: %s", resp.text[:500])
                raise RuntimeError(f"Eskiz javobi JSON emas: {resp.text[:200]}") from err
            status_val = data.get("status")
            if status_val not in ("waiting", "success", "delivered"):
                # Eskiz error cases: status != waiting
                logger.error("[Eskiz] SMS yuborishda xatolik: response=%s", data)
                raise RuntimeError(f"Eskiz SMS xatolik: {data}")

            logger.info("[SMS -> %s] Eskiz orqali yuborildi, id=%s status=%s", phone, data.get("id"), status_val)

        except Exception as exc:
            if requests is not None and isinstance(exc, requests.RequestException):
                logger.exception("[Eskiz] SMS yuborishda tarmoq/xatolik: phone=%s err=%s", phone, exc)
            else:
                logger.exception("[Eskiz] kutilmagan xatolik: %s", exc)
            raise RuntimeError(f"SMS yuborishda xatolik: {exc}") from exc


_PROVIDERS: dict[str, type[SMSProvider]] = {
    "console": ConsoleSMSProvider,
    "eskiz": EskizSMSProvider,
}


def get_sms_provider() -> SMSProvider:
    try:
        name = getattr(settings, "SMS_PROVIDER", "console").lower().strip()
    except Exception:
        logger.warning("[SMS] SMS_PROVIDER o'qishda xatolik, console fallback")
        return ConsoleSMSProvider()
    # Log provider selection every time for debugging
    logger.debug("[SMS] provider tanlandi: %s (requested=%s)", name, name)
    if name not in _PROVIDERS:
        logger.warning(
            "[SMS] Noma'lum SMS_PROVIDER='%s', 'console' ga fallback. Mavjud: %s",
            name,
            list(_PROVIDERS.keys()),
        )
        return ConsoleSMSProvider()
    # Validate Eskiz config early - agar sozlanmagan bo'lsa console ga fallback qilib qulashni oldini olamiz
    if name == "eskiz":
        if requests is None:
            logger.warning("[SMS] requests o'rnatilmagan, eskiz o'rniga console ishlatiladi")
            return ConsoleSMSProvider()
        email = getattr(settings, "ESKIZ_EMAIL", "")
        password = getattr(settings, "ESKIZ_PASSWORD", "")
        if not email or not password:
            logger.warning(
                "[SMS] SMS_PROVIDER=eskiz lekin ESKIZ_EMAIL/PASSWORD bo'sh. "
                "Console ga fallback. Iltimos .env ni tekshiring."
            )
            return ConsoleSMSProvider()
    try:
        provider_cls = _PROVIDERS[name]
        logger.info("[SMS] provider ishlatilmoqda: %s base_url=%s", name, getattr(settings, "ESKIZ_BASE_URL", "https://notify.eskiz.uz"))
        return provider_cls()
    except Exception as exc:
        logger.exception("[SMS] provider yaratishda xatolik: %s, console fallback", exc)
        return ConsoleSMSProvider()
