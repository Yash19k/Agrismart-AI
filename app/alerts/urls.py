from django.urls import path
from . import views

urlpatterns = [
    path('', views.alert_list_view, name='alert-list'),
    path('unread-count/', views.alert_unread_count_view, name='alert-unread-count'),
    path('<int:pk>/mark-read/', views.alert_mark_read_view, name='alert-mark-read'),
    path('mark-all-read/', views.alert_mark_all_read_view, name='alert-mark-all-read'),
]
