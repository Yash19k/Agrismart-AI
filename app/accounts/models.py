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

    # Expert verification (set by officer/admin when creating expert accounts)
    is_verified_expert = models.BooleanField(
        default=False,
        help_text='Set by officer/admin to mark this expert as credential-verified'
    )
    credentials_note = models.TextField(
        blank=True, default='',
        help_text='e.g. "KVK Ahmedabad, registered agronomist"'
    )

    # Geographic assignment for expert and officer roles
    assigned_region = models.CharField(
        max_length=255, blank=True, default='',
        help_text='State/district/taluka string for region scoping, e.g. "Gujarat / Anand"'
    )
    assigned_region_lat = models.FloatField(
        null=True, blank=True,
        help_text='Center latitude of assigned region (for distance-based scoping)'
    )
    assigned_region_lon = models.FloatField(
        null=True, blank=True,
        help_text='Center longitude of assigned region (for distance-based scoping)'
    )
    assigned_region_radius_km = models.FloatField(
        null=True, blank=True, default=50.0,
        help_text='Radius in km around assigned lat/lon'
    )

    class Meta:
        verbose_name = 'user'
        verbose_name_plural = 'users'

    def __str__(self):
        return self.email or self.username

    def get_display_name(self):
        return self.get_full_name() or self.username
