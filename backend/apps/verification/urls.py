from django.urls import path

from apps.verification import views

urlpatterns = [
    path("documents/", views.DocumentListCreateView.as_view(), name="verification-documents"),
    path("documents/<uuid:pk>/", views.DocumentDetailView.as_view(), name="verification-document"),
]
