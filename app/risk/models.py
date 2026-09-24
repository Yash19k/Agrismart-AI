from django.db import models
from django.conf import settings


class RiskAssessment(models.Model):
    RISK_LEVEL_CHOICES = [
        ('low', 'Low Risk'),
        ('medium', 'Medium Risk'),
        ('high', 'High Risk'),
        ('critical', 'Critical Risk'),
    ]

    farm = models.ForeignKey(
        'farms.Farm', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risk_assessments'
    )
    scan = models.ForeignKey(
        'disease.DiseaseScan', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='risk_assessments'
    )
    crop_name = models.CharField(max_length=100, default='Unknown')
    crop_stage = models.CharField(max_length=50, default='vegetative')
    risk_score = models.FloatField(default=0.0, help_text='Computed risk score from 0 to 100')
    risk_level = models.CharField(max_length=20, choices=RISK_LEVEL_CHOICES, default='low')
    breakdown = models.JSONField(
        default=dict,
        help_text='Component scores (disease_confidence, severity, humidity, temp, rain, crop_stage, pest, local_incidence)'
    )
    ipm_actions = models.JSONField(
        default=dict,
        help_text='Tiered IPM recommendations (cultural, biological, chemical guidance)'
    )
    forecast = models.JSONField(
        default=list,
        help_text='7-day risk progression forecast'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.crop_name} ({self.crop_stage}) - {self.risk_level.upper()} ({self.risk_score:.1f})"
