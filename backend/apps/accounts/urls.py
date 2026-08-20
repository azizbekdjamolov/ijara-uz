from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("telegram/", views.TelegramLoginView.as_view(), name="auth-telegram"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("verify/phone/", views.VerifyPhoneView.as_view(), name="auth-verify-phone"),
    path("verify/email/", views.VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-verification/", views.ResendVerificationView.as_view(), name="auth-resend"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("users/<uuid:user_id>/role/", views.ChangeRoleView.as_view(), name="auth-change-role"),
]
