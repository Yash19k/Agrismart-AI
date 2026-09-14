from django.db import models
from django.conf import settings
from farms.models import Farm


class CropPredictionRecord(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='crop_predictions',
        null=True,
        blank=True
    )
    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name='crop_predictions',
        null=True,
        blank=True
    )

    # Soil nutrients & chemistry
    nitrogen = models.FloatField(help_text="N in kg/ha")
    phosphorus = models.FloatField(help_text="P in kg/ha")
    potassium = models.FloatField(help_text="K in kg/ha")
    ph = models.FloatField(help_text="Soil pH value")

    # Environmental parameters
    temperature = models.FloatField(help_text="Temperature in °C")
    humidity = models.FloatField(help_text="Relative humidity in %")
    rainfall = models.FloatField(help_text="Rainfall in mm")

    # Predictions
    recommended_crop = models.CharField(max_length=100)
    confidence = models.FloatField(help_text="Top-1 probability 0.0 - 1.0")
    top_3_crops = models.JSONField(default=list, blank=True)
    agronomic_details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.recommended_crop} ({self.confidence * 100:.1f}%) — {self.created_at.strftime('%Y-%m-%d %H:%M')}"
