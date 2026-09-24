from django.urls import path
from . import views

urlpatterns = [
    path('map/', views.hotspots_map_view, name='hotspots-map'),
    path('regional-summary/', views.hotspots_regional_summary_view, name='hotspots-regional-summary'),
]
