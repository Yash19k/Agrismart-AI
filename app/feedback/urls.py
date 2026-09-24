from django.urls import path
from . import views

urlpatterns = [
    path('records/', views.feedback_list_view, name='feedback-records'),
    path('records/<int:pk>/', views.feedback_update_split_view, name='feedback-update-split'),
    path('stats/', views.feedback_stats_view, name='feedback-stats'),
    path('partition/', views.feedback_auto_split_view, name='feedback-partition'),
    path('export/csv/', views.feedback_export_csv_view, name='feedback-export-csv'),
    path('export/json/', views.feedback_export_json_view, name='feedback-export-json'),
    path('export/zip/', views.feedback_export_zip_view, name='feedback-export-zip'),
]
