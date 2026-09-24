from django.urls import path
from . import views

urlpatterns = [
    path('', views.followups_list_create_view, name='followups-list-create'),
    path('<int:pk>/', views.followup_detail_view, name='followup-detail'),
    path('<int:pk>/complete/', views.followup_complete_view, name='followup-complete'),
]
