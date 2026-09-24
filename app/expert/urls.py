from django.urls import path
from . import views

urlpatterns = [
    path('reviews/', views.expert_review_list_create_view, name='expert-reviews'),
    path('reviews/<int:pk>/', views.expert_review_detail_view, name='expert-review-detail'),
    path('queue/', views.unreviewed_queue_view, name='expert-queue'),
]
