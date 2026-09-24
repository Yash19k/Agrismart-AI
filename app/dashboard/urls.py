from django.urls import path
from . import views
from . import officer_views

urlpatterns = [
    path('', views.dashboard_view, name='dashboard'),
    path('officer/', officer_views.officer_dashboard_view, name='officer-dashboard'),
]
