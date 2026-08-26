from django.urls import path

from apps.telegram_bot import views

urlpatterns = [
    path("webhook/", views.TelegramWebhookView.as_view(), name="telegram-webhook"),
    path("verify-code/", views.VerifyLoginCodeView.as_view(), name="telegram-verify-code"),
    path("webapp-login/", views.WebAppLoginView.as_view(), name="telegram-webapp-login"),
]
