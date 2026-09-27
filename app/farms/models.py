from django.db import models
from django.conf import settings
from django.utils import timezone


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
    CROP_STAGE_CHOICES = [
        ('seedling', 'Seedling'),
        ('vegetative', 'Vegetative'),
        ('flowering', 'Flowering'),
        ('fruiting', 'Fruiting'),
        ('maturity', 'Maturity / Ripening'),
        ('harvest', 'Harvest'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farms'
    )
    farm_name = models.CharField(max_length=200)
    latitude = models.FloatField(help_text='Latitude of selected farm location')
    longitude = models.FloatField(help_text='Longitude of selected farm location')
    location_name = models.CharField(max_length=200, blank=True, default='')
    farm_boundary = models.JSONField(
        null=True, blank=True,
        help_text='GeoJSON Polygon representing the actual farm boundary'
    )
    farm_area_acres = models.FloatField(
        null=True, blank=True,
        help_text='Calculated farm area in acres'
    )
    crop = models.CharField(max_length=100, help_text='Primary crop grown on this farm')
    crop_variety = models.CharField(
        max_length=100, blank=True, default='',
        help_text='Specific crop variety name'
    )
    crop_stage = models.CharField(
        max_length=30, choices=CROP_STAGE_CHOICES, default='vegetative',
        help_text='Current growth stage of primary crop'
    )
    soil_type = models.CharField(max_length=50, choices=SOIL_CHOICES)
    soil_ph = models.FloatField(null=True, blank=True, help_text='Soil pH level (0-14)')
    soil_moisture_pct = models.FloatField(null=True, blank=True, help_text='Soil moisture percentage')
    irrigation_type = models.CharField(
        max_length=50, choices=IRRIGATION_CHOICES
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.farm_name} ({self.user})"

    @property
    def farm_size(self):
        """Backward compatibility alias for modules referencing farm.farm_size."""
        return self.farm_area_acres

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


class ThermalObservation(models.Model):
    """
    NASA ECOSTRESS Land Surface Temperature and Emissivity (LSTE) observation.
    Stores farm-level thermal statistics derived from 70 m ECOSTRESS pixels.
    """
    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='thermal_observations'
    )
    product_name = models.CharField(
        max_length=100, default='ECO_L2T_LSTE',
        help_text='NASA ECOSTRESS product identifier (e.g. ECO_L2T_LSTE)'
    )
    ecostress_product_id = models.CharField(
        max_length=255, blank=True,
        help_text='Granule UR / Producer Granule ID from NASA CMR'
    )
    observation_datetime = models.DateTimeField(
        help_text='Acquisition datetime of the ECOSTRESS observation'
    )
    mean_lst_c = models.FloatField(
        help_text='Mean Land Surface Temperature in °C'
    )
    median_lst_c = models.FloatField(
        help_text='Median Land Surface Temperature in °C'
    )
    min_lst_c = models.FloatField(
        help_text='Minimum Land Surface Temperature in °C'
    )
    max_lst_c = models.FloatField(
        help_text='Maximum Land Surface Temperature in °C'
    )
    lst_std_c = models.FloatField(
        help_text='Thermal variability / standard deviation in °C'
    )
    valid_pixel_count = models.IntegerField(
        help_text='Number of valid thermal pixels processed for the farm'
    )
    data_source = models.CharField(
        max_length=100, default='NASA ECOSTRESS',
        help_text='Official data provider'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_datetime', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-observation_datetime']),
            models.Index(fields=['farm', 'ecostress_product_id']),
            models.Index(fields=['farm', 'created_at']),
        ]

    def __str__(self):
        return f"{self.farm.farm_name} - {self.mean_lst_c:.1f}°C ({self.observation_datetime})"


class ETObservation(models.Model):
    """
    NASA ECOSTRESS Evapotranspiration (ET) observation.
    Stores farm-level ET statistics derived from 70 m ECOSTRESS pixels (ECO_L3T_JET / ECO_L3G_JET).
    """
    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='et_observations'
    )
    product_name = models.CharField(
        max_length=100, default='ECO_L3T_JET',
        help_text='NASA ECOSTRESS product identifier (e.g. ECO_L3T_JET)'
    )
    ecostress_product_id = models.CharField(
        max_length=255, blank=True,
        help_text='Granule UR / Producer Granule ID from NASA CMR'
    )
    observation_datetime = models.DateTimeField(
        help_text='Acquisition datetime of the ECOSTRESS ET observation'
    )
    mean_et = models.FloatField(
        help_text='Mean Evapotranspiration'
    )
    median_et = models.FloatField(
        help_text='Median Evapotranspiration'
    )
    min_et = models.FloatField(
        help_text='Minimum Evapotranspiration'
    )
    max_et = models.FloatField(
        help_text='Maximum Evapotranspiration'
    )
    et_std = models.FloatField(
        help_text='Evapotranspiration variability / standard deviation'
    )
    valid_pixel_count = models.IntegerField(
        help_text='Number of valid ET pixels processed for the farm'
    )
    unit = models.CharField(
        max_length=30, default='mm/day',
        help_text='Evapotranspiration unit (e.g. mm/day)'
    )
    data_source = models.CharField(
        max_length=100, default='NASA ECOSTRESS',
        help_text='Official data provider'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_datetime', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-observation_datetime']),
            models.Index(fields=['farm', 'ecostress_product_id']),
            models.Index(fields=['farm', 'created_at']),
        ]

    @property
    def product_id(self):
        return self.ecostress_product_id

    def __str__(self):
        return f"{self.farm.farm_name} - {self.mean_et:.2f} {self.unit} ({self.observation_datetime})"


class ESIObservation(models.Model):
    """
    NASA ECOSTRESS Evaporative Stress Index (ESI) observation.
    Stores farm-level ESI statistics derived from 70 m ECOSTRESS pixels (ECO_L4T_ESI).
    ESI is the ratio of actual evapotranspiration to potential evapotranspiration (ET / PET),
    providing an indicator of vegetation water stress.
    """
    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='esi_observations'
    )
    product_name = models.CharField(
        max_length=100, default='ECO_L4T_ESI',
        help_text='NASA ECOSTRESS product identifier (e.g. ECO_L4T_ESI)'
    )
    ecostress_product_id = models.CharField(
        max_length=255, blank=True,
        help_text='Granule UR / Producer Granule ID from NASA CMR'
    )
    observation_datetime = models.DateTimeField(
        help_text='Acquisition datetime of the ECOSTRESS ESI observation'
    )
    mean_esi = models.FloatField(
        help_text='Mean Evaporative Stress Index (actual ET / PET)'
    )
    median_esi = models.FloatField(
        help_text='Median Evaporative Stress Index'
    )
    min_esi = models.FloatField(
        help_text='Minimum Evaporative Stress Index'
    )
    max_esi = models.FloatField(
        help_text='Maximum Evaporative Stress Index'
    )
    esi_std = models.FloatField(
        help_text='Evaporative Stress Index variability / standard deviation'
    )
    valid_pixel_count = models.IntegerField(
        help_text='Number of valid ESI pixels processed for the farm'
    )
    unit = models.CharField(
        max_length=30, default='ratio',
        help_text='ESI unit (dimensionless ratio ET/PET)'
    )
    data_source = models.CharField(
        max_length=100, default='NASA ECOSTRESS',
        help_text='Official data provider'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_datetime', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-observation_datetime']),
            models.Index(fields=['farm', 'ecostress_product_id']),
            models.Index(fields=['farm', 'created_at']),
        ]

    @property
    def product_id(self):
        return self.ecostress_product_id

    def __str__(self):
        return f"{self.farm.farm_name} - ESI {self.mean_esi:.3f} ({self.observation_datetime})"


class WeatherObservation(models.Model):
    """
    Historical weather observation for a farm retrieved from Open-Meteo.
    Stored per farm to build an environmental historical time series without duplicate recordings.
    """
    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='weather_observations'
    )
    observation_datetime = models.DateTimeField(
        help_text='Timestamp of the weather observation'
    )
    temperature = models.FloatField(
        help_text='Air temperature in °C'
    )
    relative_humidity = models.FloatField(
        help_text='Relative humidity in %'
    )
    apparent_temperature = models.FloatField(
        null=True, blank=True,
        help_text='Feels-like apparent temperature in °C'
    )
    precipitation = models.FloatField(
        default=0.0,
        help_text='Precipitation in mm'
    )
    wind_speed = models.FloatField(
        default=0.0,
        help_text='Wind speed in km/h'
    )
    wind_direction = models.FloatField(
        null=True, blank=True,
        help_text='Wind direction in degrees'
    )
    soil_moisture = models.FloatField(
        null=True, blank=True,
        help_text='Soil moisture 0-1cm in m³/m³'
    )
    vapour_pressure_deficit = models.FloatField(
        null=True, blank=True,
        help_text='Vapour Pressure Deficit in kPa'
    )
    et0_fao = models.FloatField(
        null=True, blank=True,
        help_text='Reference evapotranspiration ET0 in mm'
    )
    weather_code = models.IntegerField(
        null=True, blank=True,
        help_text='WMO weather condition code'
    )
    data_source = models.CharField(
        max_length=50, default='Open-Meteo',
        help_text='Weather data provider'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observation_datetime', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-observation_datetime']),
            models.Index(fields=['farm', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['farm', 'observation_datetime', 'data_source'],
                name='unique_farm_weather_obs'
            )
        ]

    def __str__(self):
        return f"{self.farm.farm_name} Weather ({self.observation_datetime:%Y-%m-%d %H:%M}) - {self.temperature}°C, {self.relative_humidity}%"


class EnvironmentalRiskAssessment(models.Model):
    """
    Deterministic, rule-based environmental stress assessment for a specific farm.
    Synthesizes LST, ET, ESI, and weather historical time series.
    Provides transparent early-warning stress indicators WITHOUT making disease claims.
    """
    STRESS_LEVEL_CHOICES = [
        ('normal', 'Normal Environmental Condition'),
        ('mild', 'Mild Environmental Stress'),
        ('elevated', 'Elevated Environmental Stress'),
        ('high', 'High Environmental Stress'),
    ]

    farm = models.ForeignKey(
        Farm, on_delete=models.CASCADE, related_name='environmental_risk_assessments'
    )
    assessment_datetime = models.DateTimeField(
        default=timezone.now,
        help_text='Timestamp when the environmental assessment was generated'
    )
    stress_level = models.CharField(
        max_length=20, choices=STRESS_LEVEL_CHOICES, default='normal',
        help_text='Deterministic rule-based environmental stress level'
    )
    summary = models.TextField(
        blank=True, default='',
        help_text='Plain-language summary of environmental conditions'
    )
    reasons = models.JSONField(
        default=list,
        help_text='Transparent list of triggered rule explanations based on actual data'
    )
    lst_status = models.JSONField(
        default=dict,
        help_text='LST metrics: latest, previous, baseline, delta, status'
    )
    et_status = models.JSONField(
        default=dict,
        help_text='ET metrics: latest, previous, baseline, delta, status'
    )
    esi_status = models.JSONField(
        default=dict,
        help_text='ESI metrics: latest, previous, baseline, delta, status'
    )
    weather_status = models.JSONField(
        default=dict,
        help_text='Weather metrics: temperature, humidity, precipitation, status'
    )
    data_sufficiency = models.JSONField(
        default=dict,
        help_text='Data sufficiency breakdown and baseline observation counts'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-assessment_datetime', '-created_at']
        indexes = [
            models.Index(fields=['farm', '-assessment_datetime']),
            models.Index(fields=['farm', 'stress_level']),
        ]

    def __str__(self):
        return f"{self.farm.farm_name} - {self.stress_level.upper()} ({self.assessment_datetime:%Y-%m-%d %H:%M})"


