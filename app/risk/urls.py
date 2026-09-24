from django.urls import path
from . import views

urlpatterns = [
    path('calculate/', views.calculate_risk_view, name='risk-calculate'),
    path('farm/<int:farm_id>/', views.farm_risk_view, name='risk-farm'),
    path('history/', views.list_assessments_view, name='risk-history'),
]
