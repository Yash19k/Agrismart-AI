from django.db import models
from farms.models import Farm


class SensorReading(models.Model):
    SOURCE_CHOICES = [
        ('manual', 'Manual Entry'),
        ('simulated', 'Simulated Stream Feed'),
        ('device_api', 'Device API'),
    ]

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='sensor_readings')
    soil_moisture = models.FloatField(null=True, blank=True, help_text='Soil moisture percentage')
    temperature = models.FloatField(null=True, blank=True, help_text='Air/Soil temperature in °C')
    humidity = models.FloatField(null=True, blank=True, help_text='Relative humidity %')
    ph = models.FloatField(null=True, blank=True, help_text='Soil pH (0-14)')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']

    def __str__(self):
        return f"SensorReading for {self.farm.farm_name} ({self.source}) at {self.recorded_at.date()}"
