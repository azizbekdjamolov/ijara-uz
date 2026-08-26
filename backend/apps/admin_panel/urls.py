from django.urls import path

from apps.admin_panel import views

urlpatterns = [
    path("stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path("moderation/", views.AdminModerationQueueView.as_view(), name="admin-moderation"),
    path("users/", views.AdminUserListView.as_view(), name="admin-users"),
    path("users/<uuid:user_id>/toggle-admin/", views.AdminToggleAdminView.as_view(), name="admin-toggle-admin"),
    path("users/<uuid:user_id>/toggle-ban/", views.AdminToggleBanView.as_view(), name="admin-toggle-ban"),
]
