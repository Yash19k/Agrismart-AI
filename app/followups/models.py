from django.db import models
from django.conf import settings
from django.utils import timezone


class FollowUp(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    ]

    OUTCOME_CHOICES = [
        ('pending', 'Pending Evaluation'),
        ('resolved', 'Completely Resolved (Healthy Tissue Regenerated)'),
        ('improved', 'Improved (Lesion Spread Halted)'),
        ('unchanged', 'Unchanged / Stagnant'),
        ('worsened', 'Worsened / Spread to Surrounding Foliage'),
    ]

    original_scan = models.ForeignKey(
        'disease.DiseaseScan', on_delete=models.CASCADE, related_name='follow_ups'
    )
    recheck_scan = models.ForeignKey(
        'disease.DiseaseScan', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='is_followup_for'
    )
    farm = models.ForeignKey(
        'farms.Farm', on_delete=models.CASCADE, related_name='follow_ups'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='follow_ups'
    )

    scheduled_date = models.DateField(help_text='Recommended follow-up verification date (typically 5-7 days after treatment)')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    outcome = models.CharField(max_length=20, choices=OUTCOME_CHOICES, default='pending')

    intervention_applied = models.TextField(
        blank=True,
        help_text='Description of cultural, biological, or chemical interventions executed by farmer'
    )
    recovery_percentage = models.FloatField(
        null=True, blank=True,
        help_text='Estimated crop canopy recovery percentage (0 to 100)'
    )
    notes = models.TextField(blank=True)

    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['scheduled_date', '-created_at']

    def update_status(self):
        if self.status == 'scheduled' and self.scheduled_date < timezone.now().date():
            self.status = 'overdue'

    def __str__(self):
        return f"Follow-up for Scan #{self.original_scan_id} @ {self.farm.farm_name} ({self.status})"
