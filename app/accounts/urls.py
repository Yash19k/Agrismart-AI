from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register_view, name='auth-register'),
    path('login/', views.login_view, name='auth-login'),
    path('reset-password/', views.reset_password_view, name='auth-reset-password'),
    path('me/', views.profile_view, name='auth-me'),
]
