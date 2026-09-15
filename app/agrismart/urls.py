"""AgriSmart — Root URL Configuration."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
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
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
