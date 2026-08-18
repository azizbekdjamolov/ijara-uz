from django.urls import path

from apps.notifications import views

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", views.UnreadCountView.as_view(), name="notification-unread"),
    path("<uuid:pk>/read/", views.MarkReadView.as_view(), name="notification-read"),
    path("read-all/", views.MarkAllReadView.as_view(), name="notification-read-all"),
]
