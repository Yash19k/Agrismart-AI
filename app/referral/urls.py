from django.urls import path
from . import views

urlpatterns = [
    path('', views.ReferralListCreateView.as_view(), name='referral-list-create'),
    path('<int:pk>/', views.ReferralDetailUpdateView.as_view(), name='referral-detail-update'),
]
