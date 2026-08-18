from django.urls import path

from apps.search import views

urlpatterns = [
    path("listings/", views.ListingSearchView.as_view(), name="search-listings"),
    path("map/", views.MapSearchView.as_view(), name="search-map"),
    path("popular-areas/", views.PopularAreasView.as_view(), name="search-popular-areas"),
]
