"""Custom User model extending AbstractUser."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='en')

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.email or self.username

    def get_display_name(self):
        return self.get_full_name() or self.username
