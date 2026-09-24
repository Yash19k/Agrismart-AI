from django.test import TestCase
from datetime import date, timedelta
from accounts.models import User
from farms.models import Farm
from disease.models import DiseaseScan
from .models import FollowUp


class FollowUpTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testfarmer', password='pwd')
        self.farm = Farm.objects.create(user=self.user, farm_name='Anand Plot', latitude=22.5, longitude=72.9)
        self.scan1 = DiseaseScan.objects.create(
            farm=self.farm, user=self.user, predicted_class='Tomato___Early_blight',
            confidence=0.85, is_healthy=False
        )
        self.scan2 = DiseaseScan.objects.create(
            farm=self.farm, user=self.user, predicted_class='Tomato___healthy',
            confidence=0.92, is_healthy=True
        )

    def test_complete_followup(self):
        followup = FollowUp.objects.create(
            original_scan=self.scan1,
            farm=self.farm,
            user=self.user,
            scheduled_date=date.today() + timedelta(days=5),
            status='scheduled'
        )
        # Complete
        followup.recheck_scan = self.scan2
        followup.outcome = 'resolved'
        followup.status = 'completed'
        followup.recovery_percentage = 95.0
        followup.intervention_applied = 'Applied Trichoderma bio-spray and improved drainage.'
        followup.save()

        self.assertEqual(followup.status, 'completed')
        self.assertEqual(followup.outcome, 'resolved')
        self.assertEqual(followup.recheck_scan.is_healthy, True)
