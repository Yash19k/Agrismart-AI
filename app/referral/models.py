from django.db import models
from django.conf import settings
from farms.models import Farm
from disease.models import DiseaseScan


class Referral(models.Model):
    TYPE_CHOICES = [
        ('extension', 'Agricultural Extension Office'),
        ('kvk', 'Krishi Vigyan Kendra (KVK)'),
        ('laboratory', 'Phytopathology Diagnostic Laboratory'),
    ]

    STATUS_CHOICES = [
        ('recommended', 'Recommended by System'),
        ('requested', 'Requested by Farmer'),
        ('completed', 'Completed by Expert/Officer'),
        ('declined', 'Declined / Inconclusive'),
    ]

    scan = models.ForeignKey(
        DiseaseScan, on_delete=models.CASCADE, related_name='referrals',
        null=True, blank=True
    )
    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='referrals'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='kvk')
    reason = models.TextField(help_text='Reason for referral (e.g. uncertain diagnosis, critical risk)')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='recommended')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='requested_referrals'
    )
    directory_entry = models.JSONField(
        default=dict, blank=True,
        help_text='KVK or extension center contact details from static directory'
    )
    notes = models.TextField(blank=True, help_text='Agronomist or extension staff resolution notes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Referral #{self.id} ({self.type}) for {self.farm.farm_name}: {self.status}"
