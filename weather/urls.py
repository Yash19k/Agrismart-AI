from django.urls import path
from . import views

urlpatterns = [
    # Dashboard & Geocoding
    path('', views.weather_view, name='weather'),
    path('location/search/', views.location_search, name='location-search'),

    # Weather Intelligence (Module C — Django Native)
    path('health/', views.health_check, name='weather-health'),
    path('context/', views.weather_context_view, name='weather-context'),
    path('analyze/', views.weather_analyze_view, name='weather-analyze'),
    path('crop-context/', views.crop_context_view, name='weather-crop-context'),
    path('irrigation-context/', views.irrigation_context_view, name='weather-irrigation-context'),
]
