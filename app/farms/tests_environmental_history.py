from datetime import datetime, timezone, timedelta
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from farms.models import (
    Farm, ThermalObservation, ETObservation, ESIObservation,
    WeatherObservation, EnvironmentalRiskAssessment
)
from farms.environmental_risk_engine import (
    calculate_farm_baselines,
    analyze_environmental_stress,
    get_or_create_environmental_assessment
)

User = get_user_model()


def create_thermal_obs(farm, dt, mean_c, prod_id=''):
    return ThermalObservation.objects.create(
        farm=farm,
        observation_datetime=dt,
        mean_lst_c=mean_c,
        median_lst_c=mean_c,
        min_lst_c=round(mean_c - 1.0, 1),
        max_lst_c=round(mean_c + 1.0, 1),
        lst_std_c=0.5,
        valid_pixel_count=100,
        ecostress_product_id=prod_id,
    )


def create_et_obs(farm, dt, mean_et, prod_id=''):
    return ETObservation.objects.create(
        farm=farm,
        observation_datetime=dt,
        mean_et=mean_et,
        median_et=mean_et,
        min_et=round(mean_et - 0.5, 2),
        max_et=round(mean_et + 0.5, 2),
        et_std=0.2,
        valid_pixel_count=100,
        ecostress_product_id=prod_id,
    )


def create_esi_obs(farm, dt, mean_esi, prod_id=''):
    return ESIObservation.objects.create(
        farm=farm,
        observation_datetime=dt,
        mean_esi=mean_esi,
        median_esi=mean_esi,
        min_esi=round(mean_esi - 0.05, 2),
        max_esi=round(mean_esi + 0.05, 2),
        esi_std=0.02,
        valid_pixel_count=100,
        ecostress_product_id=prod_id,
    )


class EnvironmentalHistoryAndRiskTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(
            username='farmer1', email='farmer1@example.com', password='password123'
        )
        self.user2 = User.objects.create_user(
            username='farmer2', email='farmer2@example.com', password='password123'
        )

        self.client1 = APIClient()
        self.client1.force_authenticate(user=self.user1)

        self.client2 = APIClient()
        self.client2.force_authenticate(user=self.user2)

        # Create Farm A for user 1
        self.farm_a = Farm.objects.create(
            user=self.user1,
            farm_name='Farm Alpha',
            latitude='22.564500',
            longitude='72.928900',
            crop='Wheat',
            farm_area_acres=5.2,
        )

        # Create Farm B for user 2
        self.farm_b = Farm.objects.create(
            user=self.user2,
            farm_name='Farm Beta',
            latitude='23.022500',
            longitude='72.571400',
            crop='Cotton',
            farm_area_acres=10.0,
        )

    # ── Test 1 — One farm: history retrieval ──────────────────────────────────
    def test_one_farm_history(self):
        """Verify that historical observations are correctly stored and retrieved for Farm A."""
        t1 = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 20, 10, 0, tzinfo=timezone.utc)

        create_thermal_obs(self.farm_a, t1, 31.5, 'LST_001')
        create_thermal_obs(self.farm_a, t2, 34.0, 'LST_002')

        create_et_obs(self.farm_a, t1, 4.2, 'ET_001')
        create_et_obs(self.farm_a, t2, 3.6, 'ET_002')

        create_esi_obs(self.farm_a, t1, 0.62, 'ESI_001')

        WeatherObservation.objects.create(
            farm=self.farm_a, observation_datetime=t2, temperature=33.2, relative_humidity=45.0, data_source='Open-Meteo'
        )

        resp = self.client1.get(f'/api/farms/{self.farm_a.id}/environment/history/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        self.assertEqual(data['farm_id'], self.farm_a.id)
        self.assertEqual(len(data['lst_history']), 2)
        self.assertEqual(len(data['et_history']), 2)
        self.assertEqual(len(data['esi_history']), 1)
        self.assertEqual(len(data['weather_history']), 1)
        self.assertEqual(data['counts']['lst'], 2)
        self.assertEqual(data['counts']['et'], 2)

    # ── Test 2 — Two farms: complete data separation ──────────────────────────
    def test_two_farms_complete_data_isolation(self):
        """Verify Farm A and Farm B records and baselines are completely isolated."""
        t1 = datetime(2026, 9, 15, 10, 0, tzinfo=timezone.utc)

        # Farm A has LST 30°C
        create_thermal_obs(self.farm_a, t1, 30.0, 'LST_A')

        # Farm B has LST 40°C
        create_thermal_obs(self.farm_b, t1, 40.0, 'LST_B')

        baseline_a = calculate_farm_baselines(self.farm_a)
        baseline_b = calculate_farm_baselines(self.farm_b)

        self.assertEqual(baseline_a['lst']['baseline_mean'], 30.0)
        self.assertEqual(baseline_b['lst']['baseline_mean'], 40.0)

        # History endpoint for Farm A must contain only Farm A's observation
        resp_a = self.client1.get(f'/api/farms/{self.farm_a.id}/environment/history/')
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_a.data['lst_history']), 1)
        self.assertEqual(float(resp_a.data['lst_history'][0]['mean_lst_c']), 30.0)

        # History endpoint for Farm B must contain only Farm B's observation
        resp_b = self.client2.get(f'/api/farms/{self.farm_b.id}/environment/history/')
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_b.data['lst_history']), 1)
        self.assertEqual(float(resp_b.data['lst_history'][0]['mean_lst_c']), 40.0)

    # ── Test 3 — Historical observations: No overwrite ────────────────────────
    def test_historical_observations_preserve_all_records(self):
        """Verify adding new observations preserves previous records rather than overwriting."""
        t1 = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 15, 10, 0, tzinfo=timezone.utc)
        t3 = datetime(2026, 9, 20, 10, 0, tzinfo=timezone.utc)

        create_thermal_obs(self.farm_a, t1, 28.0, 'LST_1')
        create_thermal_obs(self.farm_a, t2, 31.0, 'LST_2')
        create_thermal_obs(self.farm_a, t3, 33.5, 'LST_3')

        all_obs = self.farm_a.thermal_observations.all().order_by('observation_datetime')
        self.assertEqual(all_obs.count(), 3)
        self.assertEqual([float(o.mean_lst_c) for o in all_obs], [28.0, 31.0, 33.5])

    # ── Test 4 — Duplicate prevention ─────────────────────────────────────────
    def test_duplicate_prevention(self):
        """Verify that identical observation/granule does not create duplicate rows."""
        t1 = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)

        create_thermal_obs(self.farm_a, t1, 30.0, 'GRANULE_UNIQUE_001')

        # Attempt to insert same granule for same farm using get_or_create logic
        obj, created = ThermalObservation.objects.get_or_create(
            farm=self.farm_a, ecostress_product_id='GRANULE_UNIQUE_001',
            defaults={
                'observation_datetime': t1,
                'mean_lst_c': 30.0,
                'median_lst_c': 30.0,
                'min_lst_c': 29.0,
                'max_lst_c': 31.0,
                'lst_std_c': 0.5,
                'valid_pixel_count': 100
            }
        )
        self.assertFalse(created)
        self.assertEqual(self.farm_a.thermal_observations.count(), 1)

        # Weather duplicate prevention
        w1, created_w1 = WeatherObservation.objects.get_or_create(
            farm=self.farm_a, observation_datetime=t1, data_source='Open-Meteo',
            defaults={'temperature': 29.5, 'relative_humidity': 50.0}
        )
        self.assertTrue(created_w1)

        w2, created_w2 = WeatherObservation.objects.get_or_create(
            farm=self.farm_a, observation_datetime=t1, data_source='Open-Meteo',
            defaults={'temperature': 29.5, 'relative_humidity': 50.0}
        )
        self.assertFalse(created_w2)
        self.assertEqual(self.farm_a.weather_observations.count(), 1)

    # ── Test 5 — Missing data handling ────────────────────────────────────────
    def test_missing_data_handling(self):
        """When a modality like ESI is unavailable, returns available: false without fake values."""
        t1 = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)
        create_thermal_obs(self.farm_a, t1, 32.0, 'LST_M')
        # No ESI or ET created

        resp = self.client1.get(f'/api/farms/{self.farm_a.id}/environment/latest/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data

        self.assertTrue(data['lst']['available'])
        self.assertFalse(data['et']['available'])
        self.assertIsNone(data['et']['data'])
        self.assertFalse(data['esi']['available'])
        self.assertIsNone(data['esi']['data'])

    # ── Test 6 — Insufficient history ─────────────────────────────────────────
    def test_insufficient_history_for_trends(self):
        """If only 1 observation exists, trends are marked as insufficient_history rather than stable or changing."""
        t1 = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)
        create_thermal_obs(self.farm_a, t1, 32.0, 'LST_SINGLE')

        analysis = analyze_environmental_stress(self.farm_a)
        self.assertEqual(analysis['lst_status']['trend'], 'insufficient_history')
        self.assertFalse(analysis['data_sufficiency']['is_sufficient_for_trends'])

    # ── Test 7 — Farm ownership & authorization ───────────────────────────────
    def test_farm_ownership_authorization(self):
        """A user cannot access another user's farm environmental data."""
        # Farmer 1 attempts to access Farmer 2's Farm Beta
        resp = self.client1.get(f'/api/farms/{self.farm_b.id}/environment/history/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        resp_latest = self.client1.get(f'/api/farms/{self.farm_b.id}/environment/latest/')
        self.assertEqual(resp_latest.status_code, status.HTTP_403_FORBIDDEN)

        resp_risk = self.client1.get(f'/api/farms/{self.farm_b.id}/environment/risk/')
        self.assertEqual(resp_risk.status_code, status.HTTP_403_FORBIDDEN)

    # ── Test 8 — Deterministic stress rules & reasons ─────────────────────────
    def test_deterministic_stress_rules(self):
        """
        Verify that elevated stress triggers based on deterministic rules:
        - LST warming + ET deficit + ESI water stress
        """
        t1 = datetime(2026, 9, 10, 10, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 20, 10, 0, tzinfo=timezone.utc)

        # Baseline observations (t1)
        create_thermal_obs(self.farm_a, t1, 29.0, 'LST_B1')
        create_et_obs(self.farm_a, t1, 4.5, 'ET_B1')
        create_esi_obs(self.farm_a, t1, 0.70, 'ESI_B1')

        # Severe stress observations (t2): LST spikes to 36°C (+7°C), ET drops to 2.2 mm/d, ESI drops to 0.35
        create_thermal_obs(self.farm_a, t2, 36.0, 'LST_S2')
        create_et_obs(self.farm_a, t2, 2.2, 'ET_S2')
        create_esi_obs(self.farm_a, t2, 0.35, 'ESI_S2')

        analysis = analyze_environmental_stress(self.farm_a)

        self.assertIn(analysis['stress_level'], ['elevated', 'high'])
        self.assertGreater(len(analysis['reasons']), 0)
        # Verify reasons are human-readable strings based strictly on actual data
        for r in analysis['reasons']:
            self.assertIsInstance(r, str)
            self.assertNotIn('undefined', r)
            self.assertNotIn('null', r)

        # Assessment generation and persistence
        assessment = get_or_create_environmental_assessment(self.farm_a, force_reassess=True)
        self.assertEqual(assessment.farm, self.farm_a)
        self.assertEqual(assessment.stress_level, analysis['stress_level'])

        # API check
        resp = self.client1.get(f'/api/farms/{self.farm_a.id}/environment/risk/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['stress_level'], analysis['stress_level'])
