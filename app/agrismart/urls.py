"""AgriSmart — Root URL Configuration."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import health_check

urlpatterns = [
    # Health checks for container probes & load balancers
    path('health/', health_check, name='health_check'),
    path('api/health/', health_check, name='api_health_check'),

    # Admin & Apps
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/farms/', include('farms.urls')),
    path('api/weather/', include('weather.urls')),
    path('api/disease/', include('disease.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/assistant/', include('assistant.urls')),
    path('api/irrigation/', include('irrigation.urls')),
    path('api/crops/', include('crops.urls')),
    path('api/sustainability/', include('sustainability.urls')),
    path('api/risk/', include('risk.urls')),
    path('api/pests/', include('pests.urls')),
    path('api/hotspots/', include('hotspots.urls')),
    path('api/expert/', include('expert.urls')),
    path('api/followups/', include('followups.urls')),
    path('api/feedback/', include('feedback.urls')),
    path('api/alerts/', include('alerts.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
