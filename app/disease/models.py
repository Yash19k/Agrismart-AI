from django.db import models
from django.conf import settings
from farms.models import Farm


class DiseaseScan(models.Model):
    SEVERITY_CHOICES = [    
        ('none', 'None / Healthy'),
        ('low', 'Low'),
        ('moderate', 'Moderate'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    MODEL_STATUS = [
        ('pending', 'Model Pending'),
        ('ready', 'Analyzed'),
        ('error', 'Error'),
    ]

    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='disease_scans', null=True, blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='disease_scans'
    )
    image = models.ImageField(upload_to='disease_scans/%Y/%m/', blank=True, null=True)

    # Analysis results (populated when model is ready)
    predicted_class = models.CharField(max_length=200, blank=True)
    confidence      = models.FloatField(null=True, blank=True, help_text='0.0 – 1.0')
    severity        = models.CharField(max_length=20, choices=SEVERITY_CHOICES, blank=True)
    is_healthy      = models.BooleanField(null=True, blank=True)
    model_status    = models.CharField(max_length=20, choices=MODEL_STATUS, default='pending')

    crop_type = models.CharField(max_length=100, blank=True)
    notes     = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.predicted_class or 'Pending'} — {self.user} — {self.created_at.date()}"
