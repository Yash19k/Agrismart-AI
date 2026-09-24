from django.urls import path
from . import views

urlpatterns = [
    path('readings/', views.SensorReadingListCreateView.as_view(), name='sensor-readings-list-create'),
    path('latest/', views.latest_sensor_reading_view, name='sensor-reading-latest'),
]
