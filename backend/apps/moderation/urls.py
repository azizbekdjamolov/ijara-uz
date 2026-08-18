from django.urls import path

from apps.moderation import views

urlpatterns = [
    path("stats/", views.ModerationStatsView.as_view(), name="moderation-stats"),
    path("queue/", views.ModerationQueueView.as_view(), name="moderation-queue"),
    path("listings/<uuid:pk>/", views.ModerationListingDetailView.as_view(), name="moderation-listing"),
    path("listings/<uuid:pk>/<str:action>/", views.ModeratorListingActionView.as_view(), name="moderation-listing-action"),
    path("reports/", views.ModerationReportListView.as_view(), name="moderation-reports"),
    path("reports/<uuid:pk>/<str:action>/", views.ModerationReportActionView.as_view(), name="moderation-report-action"),
    path("verification-requests/", views.VerificationRequestsView.as_view(), name="moderation-verification"),
    path("verification-requests/<uuid:pk>/<str:action>/", views.VerificationDocumentActionView.as_view(), name="moderation-verification-action"),
    path("users/suspended/", views.SuspendedUsersView.as_view(), name="moderation-suspended"),
    path("users/<uuid:user_id>/<str:action>/", views.SuspendUserView.as_view(), name="moderation-user-action"),
]
