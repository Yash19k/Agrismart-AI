from django.urls import path
from . import views

urlpatterns = [
    path('predict/', views.CropPredictView.as_view(), name='crop-predict'),
    path('presets/', views.crop_presets, name='crop-presets'),
    path('history/', views.crop_history, name='crop-history'),
    path('catalog/', views.crop_catalog, name='crop-catalog'),
]
