"""
Native Django test suite for Weather Intelligence Module (Module C).
Converted from Flask / standalone test suite to Django REST Framework TestCase.
"""

import time
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status

from .engine.schemas import (
    Location,
    CurrentWeather,
    ForecastWeather,
    WeatherContext,
    WeatherSignals,
    WeatherAction,
    WeatherIntelligenceResult,
)
from .engine.normalization import normalize_current, normalize_forecast, build_weather_context
from .engine.intelligence import compute_signals, generate_actions, analyze, analyze_irrigation_weather
from .engine.weather_service import WeatherCache, validate_location


# =====================================================================
# SAMPLE DATA
# =====================================================================

SAMPLE_WEATHERAPI_RESPONSE = {
    "location": {
        "name": "Ahmedabad",
        "region": "Gujarat",
        "country": "India",
        "lat": 23.02,
        "lon": 72.57,
        "localtime": "2026-09-12 14:00"
    },
    "current": {
        "temp_c": 33.5,
        "feelslike_c": 36.2,
        "humidity": 62,
        "pressure_mb": 1008.0,
        "wind_kph": 14.8,  # 14.8 / 3.6 ≈ 4.1 m/s
        "wind_degree": 220,
        "cloud": 40,
        "precip_mm": 0.5,
        "vis_km": 10.0,
        "condition": {"text": "Partly cloudy", "code": 1003}
    },
    "forecast": {
        "forecastday": [
            {
                "date": "2026-09-12",
                "day": {
                    "maxtemp_c": 35.0,
                    "mintemp_c": 26.0,
                    "totalprecip_mm": 15.0,
                    "daily_chance_of_rain": 85,
                    "avghumidity": 75,
                    "maxwind_kph": 18.0,
                    "condition": {"text": "Moderate rain", "code": 1186}
                },
                "hour": []
            }
        ]
    }
}


def _make_context(
    temp=30.0,
    humidity=60,
    rain_prob=10,
    rain_mm=0.0,
    wind_speed=3.0,
    rainfall_1h=0.0,
    weather_condition="Clear"
) -> WeatherContext:
    loc = Location(latitude=23.02, longitude=72.57, name="Ahmedabad", country="IN")
    current = CurrentWeather(
        temperature_c=temp,
        feels_like_c=temp + 2.0,
        humidity_percent=humidity,
        pressure_hpa=1010.0,
        wind_speed_mps=wind_speed,
        wind_direction_deg=180,
        cloudiness_percent=20,
        rainfall_1h_mm=rainfall_1h,
        weather_condition=weather_condition,
        weather_description=weather_condition.lower(),
        visibility_m=10000
    )
    forecast = ForecastWeather(
        rain_probability_24h=rain_prob,
        rainfall_next_24h_mm=rain_mm,
        temperature_max_24h_c=temp + 5,
        temperature_min_24h_c=temp - 5,
        humidity_max_24h=humidity,
        wind_max_24h_mps=wind_speed + 2
    )
    return WeatherContext(
        location=loc,
        observed_at=datetime.now(timezone.utc).isoformat(),
        current=current,
        forecast=forecast,
        source="TestMock"
    )


# =====================================================================
# 1. NORMALIZATION TESTS
# =====================================================================

class TestNormalization(TestCase):
    def test_normalize_weatherapi_extracts_all_fields(self):
        ctx = build_weather_context(SAMPLE_WEATHERAPI_RESPONSE, SAMPLE_WEATHERAPI_RESPONSE)
        self.assertAlmostEqual(ctx.location.latitude, 23.02, places=2)
        self.assertAlmostEqual(ctx.location.longitude, 72.57, places=2)
        self.assertEqual(ctx.location.name, "Ahmedabad")
        self.assertEqual(ctx.current.temperature_c, 33.5)
        self.assertEqual(ctx.current.humidity_percent, 62)
        self.assertAlmostEqual(ctx.current.wind_speed_mps, 14.8 / 3.6, places=1)
        self.assertEqual(ctx.forecast.rain_probability_24h, 85)
        self.assertEqual(ctx.forecast.rainfall_next_24h_mm, 15.0)


# =====================================================================
# 2. INTELLIGENCE & SIGNALS TESTS
# =====================================================================

class TestIntelligence(TestCase):
    def test_rain_signals_triggered_on_rainy_forecast(self):
        ctx = _make_context(rain_prob=80, rain_mm=20.0)
        signals = compute_signals(ctx)
        self.assertTrue(signals.rain_likely)
        self.assertTrue(signals.rain_heavy)

    def test_rain_signals_not_triggered_on_dry_forecast(self):
        ctx = _make_context(rain_prob=10, rain_mm=0.0)
        signals = compute_signals(ctx)
        self.assertFalse(signals.rain_likely)
        self.assertFalse(signals.rain_heavy)

    def test_high_heat_triggered_above_38c(self):
        ctx = _make_context(temp=40.0)
        signals = compute_signals(ctx)
        self.assertTrue(signals.high_heat)

    def test_cold_stress_triggered_below_10c(self):
        ctx = _make_context(temp=3.0)
        signals = compute_signals(ctx)
        self.assertTrue(signals.cold_stress)

    def test_disease_favorable_weather(self):
        ctx = _make_context(temp=25.0, humidity=88, rain_prob=60, rain_mm=5.0)
        signals = compute_signals(ctx)
        self.assertTrue(signals.disease_favorable_weather)

    def test_actions_delay_irrigation_on_rain(self):
        ctx = _make_context(rain_prob=85, rain_mm=25.0)
        signals = compute_signals(ctx)
        actions = generate_actions(signals)
        action_types = [a.type for a in actions]
        self.assertIn("irrigation", action_types)
        delay_actions = [a for a in actions if a.type == "irrigation" and a.action == "delay"]
        self.assertTrue(len(delay_actions) > 0)


# =====================================================================
# 3. CACHE & LOCATION VALIDATION
# =====================================================================

class TestCacheAndValidation(TestCase):
    def test_validate_location_valid(self):
        lat, lon = validate_location(23.0225, 72.5714)
        self.assertEqual(lat, 23.0225)
        self.assertEqual(lon, 72.5714)

    def test_validate_location_out_of_range(self):
        with self.assertRaises(ValueError):
            validate_location(95.0, 72.0)

    def test_cache_hit_and_expiration(self):
        cache = WeatherCache(ttl_seconds=1)
        ctx = _make_context()
        cache.put(23.02, 72.57, ctx)
        self.assertIsNotNone(cache.get(23.02, 72.57))
        time.sleep(1.1)
        self.assertIsNone(cache.get(23.02, 72.57))


# =====================================================================
# 4. DJANGO API ENDPOINT TESTS (Converted from Flask)
# =====================================================================

class TestWeatherAPIEndpoints(APITestCase):
    def setUp(self):
        from accounts.models import User
        self.user = User.objects.create_user(
            username='weather_tester',
            email='weather_tester@example.com',
            password='testpassword123',
            role='farmer'
        )
        self.client.force_authenticate(user=self.user)

    def test_health_check_endpoint(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/weather/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'ok')
        self.assertEqual(response.data['provider'], 'WeatherAPI')

    def test_weather_context_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/weather/context/?lat=23.0225&lon=72.5714')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_weather_context_missing_params(self):
        response = self.client.get('/api/weather/context/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('weather.views.get_context')
    def test_weather_context_success(self, mock_ctx):
        mock_ctx.return_value = _make_context()
        response = self.client.get('/api/weather/context/?lat=23.0225&lon=72.5714')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('current', response.data)
        self.assertIn('forecast', response.data)

    @patch('weather.views.get_context')
    def test_weather_analyze_endpoint(self, mock_ctx):
        mock_ctx.return_value = _make_context(rain_prob=85, rain_mm=20.0)
        payload = {
            "latitude": 23.0225,
            "longitude": 72.5714,
            "farm": {
                "crop_type": "wheat",
                "soil_type": "loamy",
                "crop_stage": "flowering"
            }
        }
        response = self.client.post('/api/weather/analyze/', data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('signals', response.data)
        self.assertIn('actions', response.data)
        self.assertIn('weather', response.data)

    @patch('weather.views.get_context_for_crop_recommendation')
    def test_crop_context_endpoint(self, mock_crop):
        mock_crop.return_value = {
            'temperature_c': 28.0,
            'forecast_rain_probability_24h': 20,
            'weather_available': True
        }
        response = self.client.get('/api/weather/crop-context/?lat=23.0225&lon=72.5714')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('temperature_c', response.data)
        self.assertIn('forecast_rain_probability_24h', response.data)

    @patch('weather.views.get_irrigation_weather_context')
    def test_irrigation_context_endpoint(self, mock_irrig):
        mock_irrig.return_value = {
            'rain_probability': 0.85,
            'forecast_rainfall_mm': 15.0,
            'forecast_temp': 32.0,
            'forecast_humidity': 75
        }
        response = self.client.get('/api/weather/irrigation-context/?lat=23.0225&lon=72.5714')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('rain_probability', response.data)
        self.assertIn('forecast_rainfall_mm', response.data)
