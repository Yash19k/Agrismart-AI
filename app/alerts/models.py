from django.db import models
from django.conf import settings


class Alert(models.Model):
    """
    Lightweight in-app notification model.
    Surfaces pipeline events (expert reviews, hotspot dispatches, follow-up reminders)
    to the correct user via the bell icon in AppHeader.

    Future work: SMS/WhatsApp delivery (out of scope for this pass — in-app only).
    """
    ALERT_TYPES = [
        ('expert_review_needed', 'Expert Review Needed'),
        ('expert_review_completed', 'Expert Review Completed'),
        ('hotspot_dispatch', 'Hotspot Advisory Dispatch'),
        ('followup_due', 'Follow-up Due'),
        ('referral_recommended', 'Referral Recommended'),
        ('high_risk_forecast', 'High Risk Forecast Alert'),
        ('pest_threshold_exceeded', 'Pest Threshold Exceeded'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='alerts_received'
    )
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    related_scan = models.ForeignKey(
        'disease.DiseaseScan', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='alerts'
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Alert({self.alert_type}) → {self.recipient} @ {self.created_at:%Y-%m-%d %H:%M}"
