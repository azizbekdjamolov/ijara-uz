from rest_framework.throttling import ScopedRateThrottle

from apps.core.services import SettingsService


class AuthAnonRateThrottle(ScopedRateThrottle):
    """Configurable per-minute limit for unauthenticated auth endpoints."""

    scope = "auth"

    def allow_request(self, request, view):
        rate = SettingsService.get("auth.login_attempts_per_minute", 10)
        self.rate = f"{rate}/minute"
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)
