from django.db import models
from django.conf import settings
from farms.models import Farm


class SmartIrrigationRecord(models.Model):
    """Stores ML inference results and features for smart irrigation decisions."""

    STATUS_CHOICES = [
        ('no_irrigation', 'No Irrigation Required'),
        ('irrigation_required', 'Irrigation Required'),
        ('excess_water', 'Excess Water Detected'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='smart_irrigation_records'
    )
    farm = models.ForeignKey(
        Farm,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='smart_irrigation_records'
    )

    # Input Features from irrigation dataset
    crop = models.CharField(max_length=100)
    soil_type = models.CharField(max_length=100)
    growth_stage = models.CharField(max_length=150)
    soil_moisture = models.FloatField(help_text='Soil moisture percentage 0-100%')
    temperature = models.FloatField(help_text='Ambient temperature in Celsius')
    humidity = models.FloatField(help_text='Relative humidity percentage 0-100%')

    # Weather Intelligence Inputs (optional)
    rain_probability = models.FloatField(default=0.0)
    forecast_rainfall_mm = models.FloatField(default=0.0)

    # ML & Agronomic Output
    predicted_class = models.IntegerField(help_text='0: No, 1: Yes, 2: Excess')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    action = models.CharField(max_length=50)
    urgency = models.CharField(max_length=20, default='low')
    confidence = models.FloatField(help_text='Confidence score 0.0 - 1.0')
    recommendation = models.TextField()
    explanation = models.TextField(blank=True)
    weather_modified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.crop} ({self.status}) - {self.user.email} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
