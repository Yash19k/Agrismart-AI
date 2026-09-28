"""Custom User model extending AbstractUser."""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True, null=True)
    preferred_language = models.CharField(max_length=10, default='en')
    is_demo = models.BooleanField(
        default=False,
        help_text='True if this account is a demonstration profile'
    )

    def __init__(self, *args, **kwargs):
        role_val = kwargs.pop('role', None)
        super().__init__(*args, **kwargs)
        if role_val:
            self.role = role_val

    @property
    def role(self):
        """Dynamic role property backward-compatible with agronomist/officer backend logic."""
        if self.is_superuser or self.is_staff:
            return 'officer'
        if self.is_verified_expert:
            return 'expert'
        return 'farmer'

    @role.setter
    def role(self, value):
        val = (value or '').strip().lower()
        if val == 'expert':
            self.is_verified_expert = True
            self.is_staff = False
        elif val == 'officer':
            self.is_staff = True
            self.is_verified_expert = False
        elif val == 'farmer':
            self.is_verified_expert = False
            self.is_staff = False

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
