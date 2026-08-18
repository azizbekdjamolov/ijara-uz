from django.urls import path

from apps.listings import views

urlpatterns = [
    path("", views.ListingListCreateView.as_view(), name="listing-list"),
    path("mine/", views.MyListingListView.as_view(), name="listing-mine"),
    path("<uuid:pk>/", views.ListingDetailView.as_view(), name="listing-detail"),
    path("<uuid:pk>/images/", views.ListingImagesView.as_view(), name="listing-images"),
    path("<uuid:pk>/images/<uuid:image_id>/", views.ListingImageDeleteView.as_view(), name="listing-image-delete"),
    path("<uuid:pk>/publish/", views.PublishListingView.as_view(), name="listing-publish"),
    path("by-slug/<slug:slug>/", views.PublicListingView.as_view(), name="listing-public"),
    path("favorites/", views.FavoriteListView.as_view(), name="favorites"),
    path("favorites/toggle/<uuid:pk>/", views.FavoriteToggleView.as_view(), name="favorite-toggle"),
    path("reports/", views.ReportCreateView.as_view(), name="report-create"),
    path("reports/mine/", views.ReportListView.as_view(), name="report-mine"),
]
