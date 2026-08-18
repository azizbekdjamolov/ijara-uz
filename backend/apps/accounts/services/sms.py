import logging
from abc import ABC, abstractmethod

from django.conf import settings

logger = logging.getLogger("apps.accounts")


class SMSProvider(ABC):
    """Abstraction over SMS delivery providers (console, Play Mobile, etc.)."""

    @abstractmethod
    def send(self, phone: str, message: str) -> None:
        raise NotImplementedError


class ConsoleSMSProvider(SMSProvider):
    """Development provider that prints the SMS to stdout."""

    def send(self, phone: str, message: str) -> None:
        logger.info("[SMS -> %s] %s", phone, message)


_PROVIDERS: dict[str, type[SMSProvider]] = {
    "console": ConsoleSMSProvider,
}


def get_sms_provider() -> SMSProvider:
    name = getattr(settings, "SMS_PROVIDER", "console")
    provider_cls = _PROVIDERS.get(name, ConsoleSMSProvider)
    return provider_cls()
