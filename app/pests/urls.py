from django.urls import path
from . import views

urlpatterns = [
    path('observations/', views.pest_observation_list_create_view, name='pest-observations'),
    path('observations/<int:pk>/', views.pest_observation_delete_view, name='pest-observation-delete'),
    path('summary/', views.pest_summary_view, name='pest-summary-global'),
    path('summary/<int:farm_id>/', views.pest_summary_view, name='pest-summary-farm'),
]
