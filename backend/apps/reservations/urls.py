from django.urls import path

from apps.reservations import views

urlpatterns = [
    path("", views.CreateReservationView.as_view(), name="reservation-create"),
    path("<uuid:pk>/<str:action>/", views.ReservationActionView.as_view(), name="reservation-action"),
    path("by-conversation/", views.ReservationByConversationView.as_view(), name="reservation-by-conversation"),
]
