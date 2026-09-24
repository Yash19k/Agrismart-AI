from django.test import TestCase
from accounts.models import User
from farms.models import Farm
from disease.models import DiseaseScan
from .services import haversine_km, get_local_incidence, cluster_hotspots


class HotspotsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='geo_farmer', password='password123')
        self.farm_anand = Farm.objects.create(
            user=self.user,
            farm_name='Anand Farm',
            latitude=22.5645,
            longitude=72.9289,
            crop='Tomato'
        )
        self.farm_vadodara = Farm.objects.create(
            user=self.user,
            farm_name='Vadodara Farm',
            latitude=22.3072,
            longitude=73.1812,
            crop='Tomato'
        )

    def test_haversine_distance(self):
        # Anand to Vadodara is ~40 km
        dist = haversine_km(22.5645, 72.9289, 22.3072, 73.1812)
        self.assertGreater(dist, 35.0)
        self.assertLess(dist, 50.0)

    def test_local_incidence_count(self):
        DiseaseScan.objects.create(
            farm=self.farm_anand,
            user=self.user,
            predicted_class='Tomato___Early_blight',
            disease_name='Early Blight',
            confidence=0.88,
            severity='high',
            is_healthy=False,
            crop_type='Tomato'
        )
        # Check within 5 km of Anand farm
        incidence = get_local_incidence(22.5645, 72.9289, radius_km=5.0)
        self.assertEqual(incidence, 1)

        # Check at Vadodara with 5 km radius (should not reach Anand)
        incidence_vad = get_local_incidence(22.3072, 73.1812, radius_km=5.0)
        self.assertEqual(incidence_vad, 0)
