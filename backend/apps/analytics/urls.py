from django.urls import path

from apps.analytics import views

urlpatterns = [
    path("owner-stats/", views.OwnerStatsView.as_view(), name="analytics-owner"),
    path("platform/", views.PlatformStatsView.as_view(), name="analytics-platform"),
]
