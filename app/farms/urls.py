from django.urls import path
from . import views

urlpatterns = [
    path('', views.FarmListCreateView.as_view(), name='farm-list-create'),
    path('<int:pk>/', views.FarmDetailView.as_view(), name='farm-detail'),
    path('<int:pk>/weather/', views.farm_weather_view, name='farm-weather'),
    path('weather/', views.farm_weather_view, name='farm-weather-default'),
    path('<int:farm_id>/thermal/', views.farm_thermal_view, name='farm-thermal'),
    path('<int:farm_id>/thermal/fetch/', views.farm_thermal_fetch_view, name='farm-thermal-fetch'),
    path('thermal/', views.farm_thermal_view, name='farm-thermal-default'),
    path('thermal/fetch/', views.farm_thermal_fetch_view, name='farm-thermal-default-fetch'),
    path('<int:farm_id>/et/', views.farm_et_view, name='farm-et'),
    path('<int:farm_id>/et/fetch/', views.farm_et_fetch_view, name='farm-et-fetch'),
    path('et/', views.farm_et_view, name='farm-et-default'),
    path('et/fetch/', views.farm_et_fetch_view, name='farm-et-default-fetch'),
    path('<int:farm_id>/esi/', views.farm_esi_view, name='farm-esi'),
    path('<int:farm_id>/esi/fetch/', views.farm_esi_fetch_view, name='farm-esi-fetch'),
    path('esi/', views.farm_esi_view, name='farm-esi-default'),
    path('esi/fetch/', views.farm_esi_fetch_view, name='farm-esi-default-fetch'),
    path('primary/', views.primary_farm, name='farm-primary'),

    # Environmental History & Latest
    path('<int:farm_id>/environment/history/', views.farm_environment_history_view, name='farm-environment-history'),
    path('environment/history/', views.farm_environment_history_view, name='farm-environment-history-default'),
    path('<int:farm_id>/environment/latest/', views.farm_environment_latest_view, name='farm-environment-latest'),
    path('environment/latest/', views.farm_environment_latest_view, name='farm-environment-latest-default'),

    # Environmental Rule-Based Risk Analysis
    path('<int:farm_id>/environment/risk/', views.farm_environment_risk_view, name='farm-environment-risk'),
    path('environment/risk/', views.farm_environment_risk_view, name='farm-environment-risk-default'),
    path('<int:farm_id>/risk/', views.farm_environment_risk_view, name='farm-risk-alias'),
    path('risk/', views.farm_environment_risk_view, name='farm-risk-alias-default'),
    path('<int:farm_id>/environment/risk/history/', views.farm_environment_risk_history_view, name='farm-environment-risk-history'),
    path('environment/risk/history/', views.farm_environment_risk_history_view, name='farm-environment-risk-history-default'),
    path('<int:farm_id>/risk/history/', views.farm_environment_risk_history_view, name='farm-risk-history-alias'),
    path('risk/history/', views.farm_environment_risk_history_view, name='farm-risk-history-alias-default'),
]

