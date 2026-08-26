from django.urls import path

from apps.telegram_bot import views

urlpatterns = [
    path("webapp-login/", views.WebAppLoginView.as_view(), name="telegram-webapp-login"),
]
