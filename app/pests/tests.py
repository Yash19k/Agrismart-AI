from django.test import TestCase
from accounts.models import User
from farms.models import Farm
from .models import PestObservation


class PestModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='test_farmer', password='password123')
        self.farm = Farm.objects.create(
            user=self.user,
            farm_name='Test Plot',
            latitude=22.56,
            longitude=72.95,
            crop='Tomato'
        )

    def test_threshold_calculation(self):
        # Whitefly: alert >= 15, action >= 30
        normal_obs = PestObservation.objects.create(
            farm=self.farm,
            pest_type='Whitefly',
            pest_count=8
        )
        self.assertEqual(normal_obs.threshold_level, 'normal')

        alert_obs = PestObservation.objects.create(
            farm=self.farm,
            pest_type='Whitefly',
            pest_count=18
        )
        self.assertEqual(alert_obs.threshold_level, 'alert')

        action_obs = PestObservation.objects.create(
            farm=self.farm,
            pest_type='Whitefly',
            pest_count=35
        )
        self.assertEqual(action_obs.threshold_level, 'action_required')
