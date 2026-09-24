from django.conf import settings
from django.db import models


class FeedbackRecord(models.Model):
    SPLIT_CHOICES = [
        ('unassigned', 'Unassigned'),
        ('train', 'Training Set (80%)'),
        ('val', 'Validation Set (10%)'),
        ('test', 'Test Set (10%)'),
    ]

    SOURCE_CHOICES = [
        ('expert_verified', 'Agronomist Expert Review'),
        ('farmer_feedback', 'Farmer Recheck Outcome'),
        ('field_trial', 'Agricultural Research Station Trial'),
    ]

    scan = models.ForeignKey(
        'disease.DiseaseScan', on_delete=models.CASCADE, related_name='feedback_records'
    )
    review = models.ForeignKey(
        'expert.ExpertReview', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='feedback_records'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='feedback_reviewed'
    )
    image_path = models.CharField(max_length=500, blank=True)
    image_sha256 = models.CharField(max_length=64, blank=True, db_index=True)
    crop = models.CharField(max_length=100, blank=True)
    region = models.CharField(max_length=150, blank=True)
    is_demo = models.BooleanField(default=False, help_text='Excluded from training exports by default')
    original_prediction = models.CharField(max_length=200, help_text='Original ConvNeXt class')
    original_confidence = models.FloatField(default=0.0)
    ground_truth_label = models.CharField(max_length=200, help_text='Expert-verified ground truth class')
    validation_source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='expert_verified')
    dataset_split = models.CharField(max_length=20, choices=SPLIT_CHOICES, default='unassigned')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_concordant(self):
        """True if original model prediction matches ground truth."""
        return self.original_prediction.strip().lower() == self.ground_truth_label.strip().lower()

    def __str__(self):
        return f"Feedback #{self.id}: AI '{self.original_prediction}' vs Truth '{self.ground_truth_label}' [{self.dataset_split}]"
