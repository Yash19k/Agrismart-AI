"""Custom User model extending AbstractUser."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('farmer', 'Farmer'),
        ('expert', 'Agronomist / Expert'),
        ('officer', 'Agricultural Officer'),
    ]

    phone = models.CharField(max_length=15, blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='en')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='farmer')

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.email or self.username

    def get_display_name(self):
        return self.get_full_name() or self.username
