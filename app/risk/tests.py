from django.test import TestCase
from .engine import calculate_risk
from .forecast import generate_7day_forecast
from .ipm import get_ipm_guidance


class RiskEngineTests(TestCase):
    def test_healthy_vegetative_low_risk(self):
        result = calculate_risk(
            crop_stage='vegetative',
            humidity=50.0,
            temperature=25.0,
            rainfall_prob=10.0,
            disease_confidence=0.0,
            disease_severity='none',
            is_healthy=True,
            pest_count=0,
            local_incidence_count=0,
        )
        self.assertLess(result['score'], 35.0)
        self.assertIn(result['level'], ['low', 'medium'])
        self.assertTrue(result['is_prototype'])
        self.assertEqual(result['breakdown']['disease_confidence']['score'], 0.0)

    def test_flowering_high_humidity_high_risk(self):
        result = calculate_risk(
            crop_stage='flowering',  # 10 pts
            humidity=90.0,          # 15 pts
            temperature=24.0,       # 10 pts
            rainfall_prob=80.0,     # 10 pts
            disease_confidence=0.9, # 22.5 pts
            disease_severity='high',# 15 pts
            is_healthy=False,
            pest_count=60,          # 10 pts
            local_incidence_count=6 # 5 pts
        )
        self.assertGreaterEqual(result['score'], 80.0)
        self.assertEqual(result['level'], 'critical')

    def test_stage_sensitivity(self):
        seedling = calculate_risk(crop_stage='seedling', humidity=60.0)
        harvest = calculate_risk(crop_stage='harvest', humidity=60.0)
        self.assertGreater(seedling['score'], harvest['score'])

    def test_7day_forecast_generation(self):
        forecast = generate_7day_forecast(
            base_crop_stage='fruiting',
            disease_confidence=0.8,
            disease_severity='medium',
            is_healthy=False,
            pest_count=15,
        )
        self.assertEqual(len(forecast), 7)
        self.assertEqual(forecast[0]['day'], 'Day 1')
        self.assertIn('value', forecast[0])
        self.assertIn('risk', forecast[0])

    def test_ipm_chemical_disclaimer(self):
        guidance = get_ipm_guidance(disease_name='early blight', risk_level='high')
        self.assertIn('cultural', guidance)
        self.assertIn('biological', guidance)
        self.assertIn('chemical_guidance', guidance)
        self.assertIn('CIBRC', guidance['chemical_guidance']['disclaimer'])
