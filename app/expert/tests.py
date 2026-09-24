from django.test import TestCase
from accounts.models import User
from farms.models import Farm
from disease.models import DiseaseScan
from .models import ExpertReview


class ExpertReviewTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(username='farmer1', password='pass')
        self.expert = User.objects.create_user(username='dr_patel', password='pass', role='expert')
        self.farm = Farm.objects.create(user=self.farmer, farm_name='Anand Farm', latitude=22.5, longitude=72.9)
        self.scan = DiseaseScan.objects.create(
            farm=self.farm,
            user=self.farmer,
            predicted_class='Tomato___Early_blight',
            confidence=0.82,
            crop_type='Tomato',
            disease_name='Early Blight',
            is_healthy=False
        )

    def test_expert_review_preserves_ai_prediction(self):
        review = ExpertReview.objects.create(
            scan=self.scan,
            expert=self.expert,
            status='corrected',
            expert_crop='Tomato',
            expert_disease='Late Blight',
            expert_severity='high',
            diagnosis_notes='Lesions appear water-soaked with white fungal sporulation on lower leaf surface, indicative of Phytophthora infestans rather than Alternaria.'
        )
        # Original AI prediction should be preserved on the review
        self.assertEqual(review.ai_predicted_class, 'Tomato___Early_blight')
        self.assertEqual(review.ai_confidence, 0.82)
        # Scan remains unchanged
        self.scan.refresh_from_db()
        self.assertEqual(self.scan.predicted_class, 'Tomato___Early_blight')
