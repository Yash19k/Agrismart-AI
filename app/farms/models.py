from django.db import models
from django.conf import settings


class Farm(models.Model):
    IRRIGATION_CHOICES = [
        ('drip', 'Drip Irrigation'),
        ('sprinkler', 'Sprinkler'),
        ('flood', 'Flood Irrigation'),
        ('manual', 'Manual'),
        ('none', 'No Irrigation'),
    ]
    SOIL_CHOICES = [
        ('black', 'Black Cotton Soil'),
        ('red', 'Red Soil'),
        ('alluvial', 'Alluvial Soil'),
        ('sandy', 'Sandy Soil'),
        ('clayey', 'Clayey Soil'),
        ('loamy', 'Loamy Soil'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farms'
    )
    farm_name = models.CharField(max_length=200)
    latitude = models.FloatField()
    longitude = models.FloatField()
    location_name = models.CharField(max_length=200, blank=True)
    crop = models.CharField(max_length=100, blank=True,
                            help_text='Primary crop grown on this farm')
    soil_type = models.CharField(max_length=50, choices=SOIL_CHOICES, blank=True)
    farm_size = models.FloatField(null=True, blank=True, help_text='Size in acres')
    irrigation_type = models.CharField(
        max_length=50, choices=IRRIGATION_CHOICES, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.farm_name} ({self.user})"

    @property
    def location_display(self):
        return self.location_name or f"{self.latitude:.4f}°N, {self.longitude:.4f}°E"


CROP_EMOJIS = {
    'tomato': '🍅', 'chilli': '🌶️', 'chili': '🌶️',
    'okra': '🥦', 'cotton': '🌿', 'wheat': '🌾',
    'rice': '🍚', 'paddy': '🌾', 'maize': '🌽',
    'corn': '🌽', 'onion': '🧅', 'potato': '🥔',
    'brinjal': '🍆', 'eggplant': '🍆', 'groundnut': '🥜',
    'soybean': '🫘', 'sugarcane': '🎋',
}


class Crop(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('harvested', 'Harvested'),
        ('failed', 'Failed'),
    ]

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='crops')
    name = models.CharField(max_length=100)
    emoji = models.CharField(max_length=10, blank=True)
    planted_at = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.emoji:
            self.emoji = CROP_EMOJIS.get(self.name.lower().strip(), '🌱')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} @ {self.farm.farm_name}"


class IrrigationRecord(models.Model):
    STATUS_CHOICES = [
        ('applied', 'Applied'),
        ('delayed', 'Delayed'),
        ('recommended', 'Recommended'),
    ]
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='irrigation_records')
    date = models.DateField(auto_now_add=True)
    water_amount_liters = models.FloatField(default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='recommended')
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class WeatherSnapshot(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='weather_snapshots')
    temperature = models.FloatField()
    humidity = models.FloatField()
    precipitation = models.FloatField(default=0.0)
    wind_speed = models.FloatField(default=0.0)
    weather_code = models.IntegerField(default=0)
    condition = models.CharField(max_length=100, blank=True)
    soil_moisture = models.FloatField(null=True, blank=True)
    et0 = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at']


class Alert(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=50)  # irrigation, disease_risk, heat, wind, rain
    level = models.CharField(max_length=20, default='info')  # info, warning, high
    icon = models.CharField(max_length=10, blank=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class Activity(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='activities')
    icon = models.CharField(max_length=10, default='🌱')
    title = models.CharField(max_length=200)
    sub = models.CharField(max_length=255, blank=True)
    activity_type = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


class SustainabilityRecord(models.Model):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name='sustainability_records')
    score = models.FloatField()
    water_efficiency = models.FloatField()
    soil_health = models.FloatField()
    crop_health = models.FloatField()
    resource_efficiency = models.FloatField()
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-calculated_at']
