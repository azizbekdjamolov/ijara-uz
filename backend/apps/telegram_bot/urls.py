from django.urls import path

from apps.telegram_bot import views

urlpatterns = [
    path("webhook/", views.TelegramWebhookView.as_view(), name="telegram-webhook"),
    path("webapp-login/", views.WebAppLoginView.as_view(), name="telegram-webapp-login"),
]
