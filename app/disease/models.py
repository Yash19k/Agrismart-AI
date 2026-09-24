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
    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
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

    crop_type    = models.CharField(max_length=100, blank=True)
    plant_name   = models.CharField(max_length=100, blank=True, default='', help_text='Detected crop/plant name')
    disease_name = models.CharField(max_length=200, blank=True, default='', help_text='Detected disease name')
    notes        = models.TextField(blank=True)

    # Pipeline orchestration fields (Part 3)
    needs_expert_review = models.BooleanField(
        default=False,
        help_text='Auto-set when risk is high/critical or confidence is low'
    )
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default='normal',
        help_text='Urgency level for expert queue sorting'
    )
    referral_recommended = models.BooleanField(
        default=False,
        help_text='True if risk is critical or confidence is too low for reliable diagnosis'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def priority_order(self):
        """Numeric priority for DB ordering: urgent=1, normal=0."""
        return 1 if self.priority == 'urgent' else 0

    def __str__(self):
        return f"{self.predicted_class or 'Pending'} — {self.user} — {self.created_at.date()}"
