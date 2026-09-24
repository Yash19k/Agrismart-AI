from django.db import models
from django.conf import settings
from django.utils import timezone

PEST_THRESHOLDS = {
    'whitefly': {'alert': 15, 'action': 30},
    'aphid': {'alert': 20, 'action': 40},
    'thrips': {'alert': 10, 'action': 25},
    'spider mite': {'alert': 15, 'action': 30},
    'fruit fly': {'alert': 5, 'action': 15},
    'bollworm': {'alert': 5, 'action': 10},
    'other': {'alert': 15, 'action': 30},
}


class PestObservation(models.Model):
    TRAP_TYPE_CHOICES = [
        ('sticky_yellow', 'Yellow Sticky Trap'),
        ('sticky_blue', 'Blue Sticky Trap'),
        ('pheromone', 'Pheromone Trap'),
        ('light', 'Light Trap'),
        ('pitfall', 'Pitfall Trap'),
        ('manual', 'Manual Canopy Scouting'),
    ]

    PEST_TYPE_CHOICES = [
        ('Whitefly', 'Whitefly (Bemisia tabaci)'),
        ('Aphid', 'Aphid (Aphis gossypii)'),
        ('Thrips', 'Thrips (Thrips tabaci)'),
        ('Spider Mite', 'Spider Mite (Tetranychidae)'),
        ('Fruit Fly', 'Fruit Fly (Bactrocera)'),
        ('Bollworm', 'Bollworm / Pod Borer (Helicoverpa armigera)'),
        ('Other', 'Other Pest Species'),
    ]

    THRESHOLD_STATUS_CHOICES = [
        ('normal', 'Normal / Below Threshold'),
        ('alert', 'Scouting Alert / Increasing'),
        ('action_required', 'Action Required / Economic Injury Level Exceeded'),
    ]

    farm = models.ForeignKey(
        'farms.Farm', on_delete=models.CASCADE, related_name='pest_observations'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='pest_observations'
    )
    trap_type = models.CharField(max_length=30, choices=TRAP_TYPE_CHOICES, default='sticky_yellow')
    pest_type = models.CharField(max_length=50, choices=PEST_TYPE_CHOICES, default='Whitefly')
    pest_count = models.PositiveIntegerField(default=0, help_text='Observed count of pests per trap or leaflet')
    threshold_level = models.CharField(max_length=20, choices=THRESHOLD_STATUS_CHOICES, default='normal')
    image = models.ImageField(upload_to='pest_traps/', null=True, blank=True)
    notes = models.TextField(blank=True, help_text='Farmer or scout observations on field trap location and weather')
    observed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-observed_at']

    def calculate_threshold(self):
        pt = (self.pest_type or 'other').lower()
        rule = PEST_THRESHOLDS.get(pt, PEST_THRESHOLDS['other'])
        if self.pest_count >= rule['action']:
            return 'action_required'
        elif self.pest_count >= rule['alert']:
            return 'alert'
        return 'normal'

    def save(self, *args, **kwargs):
        self.threshold_level = self.calculate_threshold()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.pest_type} ({self.pest_count}) @ {self.farm.farm_name} - {self.threshold_level}"
