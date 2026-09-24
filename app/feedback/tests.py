from django.test import TestCase
from accounts.models import User
from farms.models import Farm
from disease.models import DiseaseScan
from expert.models import ExpertReview
from .models import FeedbackRecord
from .services import sync_expert_review_to_feedback, auto_partition_splits


class FeedbackTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='fb_farmer', password='pwd')
        self.farm = Farm.objects.create(user=self.user, farm_name='Anand Farm', latitude=22.5, longitude=72.9)
        self.scan = DiseaseScan.objects.create(
            farm=self.farm, user=self.user, predicted_class='Tomato___Early_blight',
            confidence=0.85, is_healthy=False
        )

    def test_sync_expert_review_creates_feedback(self):
        review = ExpertReview.objects.create(
            scan=self.scan,
            status='corrected',
            expert_crop='Tomato',
            expert_disease='Late Blight',
            is_healthy=False
        )
        record = sync_expert_review_to_feedback(review)
        self.assertIsNotNone(record)
        self.assertEqual(record.ground_truth_label, 'Tomato___Late_Blight')
        self.assertFalse(record.is_concordant)

    def test_rejected_review_never_creates_feedback(self):
        # Strict PS requirement: never create feedback on rejected review
        rejected_review = ExpertReview.objects.create(
            scan=self.scan,
            status='rejected',
            diagnosis_notes='Blurry, unidentifiable leaf photo.'
        )
        record = sync_expert_review_to_feedback(rejected_review)
        self.assertIsNone(record)

    def test_auto_partition(self):
        # Create feedback records
        for i in range(10):
            FeedbackRecord.objects.create(
                scan=self.scan,
                original_prediction='Tomato___healthy',
                ground_truth_label='Tomato___healthy',
                image_sha256=f'0000000{i}',
                dataset_split='unassigned'
            )
        assigned = auto_partition_splits()
        self.assertEqual(assigned, 10)
