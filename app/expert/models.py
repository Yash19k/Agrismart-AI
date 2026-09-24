from django.db import models
from django.conf import settings


class ExpertReview(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('confirmed', 'Confirmed (AI Prediction Correct)'),
        ('corrected', 'Corrected (Agronomist Revised Diagnosis)'),
        ('rejected', 'Unusable / Inconclusive Image'),
    ]

    SEVERITY_CHOICES = [
        ('none', 'None (Healthy)'),
        ('low', 'Low / Early Symptoms'),
        ('medium', 'Moderate Spread'),
        ('high', 'Severe / Critical'),
    ]

    scan = models.ForeignKey(
        'disease.DiseaseScan', on_delete=models.CASCADE, related_name='expert_reviews'
    )
    expert = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='expert_reviews'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # IMMUTABLE AI BASELINE (Never modified to preserve provenance)
    ai_predicted_class = models.CharField(max_length=200, blank=True)
    ai_confidence = models.FloatField(default=0.0)

    # EXPERT CLINICAL VALIDATION
    expert_crop = models.CharField(max_length=100, blank=True)
    expert_disease = models.CharField(max_length=100, blank=True)
    expert_severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='low')
    is_healthy = models.BooleanField(default=False)
    confidence_rating = models.PositiveSmallIntegerField(
        default=5,
        help_text='Expert confidence score 1 (uncertain) to 5 (definitive diagnosis)'
    )
    diagnosis_notes = models.TextField(
        blank=True,
        help_text='Differential diagnostic notes explaining leaf lesions, fungal patterns, or physiological stress'
    )
    action_plan = models.TextField(
        blank=True,
        help_text='Certified field recommendations and remedial spray schedules'
    )

    reviewed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-reviewed_at']

    def save(self, *args, **kwargs):
        # Auto-snapshot AI prediction on creation
        if not self.ai_predicted_class and self.scan:
            self.ai_predicted_class = self.scan.predicted_class or self.scan.disease_name or 'Unknown'
            self.ai_confidence = self.scan.confidence or 0.0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Review #{self.id} for Scan #{self.scan_id}: {self.status}"
