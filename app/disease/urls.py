from django.urls import path
from . import views

urlpatterns = [
    path('predict/', views.DiseasePredictView.as_view(), name='disease-predict'),
    path('history/', views.disease_history, name='disease-history'),
]
