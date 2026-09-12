from django.urls import path
from . import views

urlpatterns = [
    path('', views.weather_view, name='weather'),
    path('location/search/', views.location_search, name='location-search'),
]
