from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"status": "ok", "service": "ijara-api"})


urlpatterns = [
    path("health/", health, name="health"),
    path("v1/auth/", include("apps.accounts.urls")),
    path("v1/auth/telegram/", include("apps.telegram_bot.urls")),
    path("v1/listings/", include("apps.listings.urls")),
    path("v1/search/", include("apps.search.urls")),
    path("v1/chat/", include("apps.chat.urls")),
    path("v1/notifications/", include("apps.notifications.urls")),
    path("v1/verification/", include("apps.verification.urls")),
    path("v1/moderation/", include("apps.moderation.urls")),
    path("v1/analytics/", include("apps.analytics.urls")),
    path("v1/admin-panel/", include("apps.admin_panel.urls")),
    path("v1/reservations/", include("apps.reservations.urls")),
]
