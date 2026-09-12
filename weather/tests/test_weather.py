"""
Comprehensive test suite for AgriSmart Weather Intelligence Module.

Tests organized by layer:
1. Normalization tests — provider JSON → internal schema
2. Intelligence tests — signals + actions from weather conditions
3. Irrigation integration tests — ML prediction + weather → final advice
4. Cache tests — TTL behavior and cache clearing
5. API tests — endpoint schema, status codes, error handling
6. Provider error handling tests — mocked failures
"""

import sys
import json
import time
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone

# Add src and api to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"
API_DIR = BASE_DIR / "api"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))


# =====================================================================
# SAMPLE PROVIDER RESPONSES (realistic OpenWeatherMap format)
# =====================================================================

SAMPLE_CURRENT_RESPONSE = {
    "coord": {"lon": 72.57, "lat": 23.02},
    "weather": [{"id": 802, "main": "Clouds", "description": "scattered clouds"}],
    "main": {
        "temp": 33.5,
        "feels_like": 36.2,
        "humidity": 62,
        "pressure": 1008
    },
    "wind": {"speed": 4.1, "deg": 220},
    "clouds": {"all": 40},
    "rain": {"1h": 0.5},
    "visibility": 10000,
    "dt": int(datetime.now(timezone.utc).timestamp()),
    "name": "Ahmedabad",
    "sys": {"country": "IN"}
}


def _make_forecast_item(hours_ahead, pop, rain_3h, temp, humidity, wind):
    """Helper to create a realistic forecast list item."""
    return {
        "dt": int(datetime.now(timezone.utc).timestamp()) + int(hours_ahead * 3600),
        "main": {"temp": temp, "humidity": humidity},
        "weather": [{"main": "Rain", "description": "light rain"}],
        "pop": pop,
        "rain": {"3h": rain_3h},
        "wind": {"speed": wind}
    }


SAMPLE_FORECAST_RESPONSE_RAINY = {
    "list": [
        _make_forecast_item(3, 0.85, 4.0, 30, 78, 3.5),
        _make_forecast_item(6, 0.90, 6.0, 28, 82, 4.0),
        _make_forecast_item(9, 0.75, 3.0, 27, 85, 3.0),
        _make_forecast_item(12, 0.60, 1.5, 26, 80, 2.5),
        _make_forecast_item(15, 0.40, 0.5, 27, 75, 2.0),
        _make_forecast_item(18, 0.20, 0.0, 29, 70, 2.0),
        _make_forecast_item(21, 0.10, 0.0, 28, 72, 1.5),
        _make_forecast_item(24, 0.05, 0.0, 27, 74, 1.0),
    ]
}

SAMPLE_FORECAST_RESPONSE_DRY = {
    "list": [
        _make_forecast_item(3, 0.05, 0.0, 35, 40, 2.0),
        _make_forecast_item(6, 0.05, 0.0, 36, 38, 2.5),
        _make_forecast_item(9, 0.10, 0.0, 37, 35, 3.0),
        _make_forecast_item(12, 0.10, 0.0, 38, 33, 3.5),
        _make_forecast_item(15, 0.05, 0.0, 37, 35, 3.0),
        _make_forecast_item(18, 0.05, 0.0, 35, 40, 2.5),
        _make_forecast_item(21, 0.00, 0.0, 33, 45, 2.0),
        _make_forecast_item(24, 0.00, 0.0, 31, 50, 1.5),
    ]
}


# =====================================================================
# 1. NORMALIZATION TESTS
# =====================================================================

class TestNormalization:
    def test_normalize_current_extracts_all_fields(self):
        from normalization import normalize_current
        location, current = normalize_current(SAMPLE_CURRENT_RESPONSE)

        assert location.latitude == 23.02
        assert location.longitude == 72.57
        assert location.name == "Ahmedabad"
        assert location.country == "IN"

        assert current.temperature_c == 33.5
        assert current.feels_like_c == 36.2
        assert current.humidity_percent == 62
        assert current.pressure_hpa == 1008
        assert current.wind_speed_mps == 4.1
        assert current.rainfall_1h_mm == 0.5
        assert current.weather_condition == "Clouds"

    def test_normalize_current_handles_missing_rain(self):
        from normalization import normalize_current
        data = {**SAMPLE_CURRENT_RESPONSE}
        del data["rain"]
        _, current = normalize_current(data)
        assert current.rainfall_1h_mm == 0.0
        assert current.rainfall_3h_mm is None

    def test_normalize_forecast_rainy(self):
        from normalization import normalize_forecast
        forecast = normalize_forecast(SAMPLE_FORECAST_RESPONSE_RAINY)

        assert forecast.rain_probability_6h is not None
        assert forecast.rain_probability_6h >= 85
        assert forecast.rain_probability_24h is not None
        assert forecast.rain_probability_24h >= 85
        assert forecast.rainfall_next_24h_mm is not None
        assert forecast.rainfall_next_24h_mm >= 10.0

    def test_normalize_forecast_dry(self):
        from normalization import normalize_forecast
        forecast = normalize_forecast(SAMPLE_FORECAST_RESPONSE_DRY)

        assert forecast.rain_probability_24h is not None
        assert forecast.rain_probability_24h <= 15
        assert forecast.rainfall_next_24h_mm == 0.0
        assert forecast.temperature_max_24h_c >= 37.0

    def test_normalize_forecast_empty_list(self):
        from normalization import normalize_forecast
        forecast = normalize_forecast({"list": []})
        assert forecast.rain_probability_6h is None
        assert forecast.rainfall_next_24h_mm is None

    def test_build_weather_context(self):
        from normalization import build_weather_context
        ctx = build_weather_context(SAMPLE_CURRENT_RESPONSE, SAMPLE_FORECAST_RESPONSE_RAINY)

        assert ctx.weather_available is True
        assert ctx.source in ["OpenWeatherMap", "WeatherAPI"]
        assert ctx.current.temperature_c == 33.5
        assert ctx.forecast.rain_probability_6h >= 85

    def test_normalize_weatherapi_current(self):
        from normalization import normalize_current
        sample = {
            "location": {"name": "Delhi", "country": "India", "lat": 28.61, "lon": 77.20},
            "current": {
                "temp_c": 31.0,
                "feelslike_c": 34.0,
                "humidity": 65,
                "pressure_mb": 1008.0,
                "wind_kph": 14.4,
                "wind_degree": 90,
                "cloud": 50,
                "precip_mm": 1.2,
                "condition": {"text": "Moderate rain"},
                "vis_km": 8.0
            }
        }
        loc, curr = normalize_current(sample)
        assert loc.name == "Delhi"
        assert loc.latitude == 28.61
        assert curr.temperature_c == 31.0
        assert curr.feels_like_c == 34.0
        assert curr.wind_speed_mps == 4.0  # 14.4 km/h / 3.6 = 4.0 m/s
        assert curr.rainfall_1h_mm == 1.2
        assert curr.weather_condition == "Moderate rain"
        assert curr.visibility_m == 8000

    def test_normalize_weatherapi_forecast(self):
        from normalization import normalize_forecast
        now = int(datetime.now(timezone.utc).timestamp())
        sample = {
            "forecast": {
                "forecastday": [
                    {
                        "date": "2026-09-12",
                        "hour": [
                            {"time_epoch": now + 7200, "chance_of_rain": 75, "precip_mm": 3.0, "temp_c": 29.0, "humidity": 78, "wind_kph": 10.8},
                            {"time_epoch": now + 18000, "chance_of_rain": 85, "precip_mm": 5.0, "temp_c": 27.5, "humidity": 82, "wind_kph": 12.6},
                            {"time_epoch": now + 36000, "chance_of_rain": 40, "precip_mm": 1.0, "temp_c": 26.0, "humidity": 85, "wind_kph": 7.2},
                        ]
                    }
                ]
            }
        }
        forecast = normalize_forecast(sample)
        assert forecast.rain_probability_6h == 85
        assert forecast.rainfall_next_6h_mm == 8.0
        assert forecast.rain_probability_12h == 85
        assert forecast.rainfall_next_12h_mm == 9.0
        assert forecast.temperature_max_24h_c == 29.0
        assert forecast.temperature_min_24h_c == 26.0

    def test_location_normalization_from_numeric(self):
        from weather_service import validate_location
        lat, lon = validate_location("23.0225", "72.5714")
        assert lat == 23.0225
        assert lon == 72.5714

    def test_location_invalid_range(self):
        from weather_service import validate_location
        with pytest.raises(ValueError, match="out of range"):
            validate_location(91.0, 0.0)
        with pytest.raises(ValueError, match="out of range"):
            validate_location(0.0, 181.0)

    def test_location_non_numeric(self):
        from weather_service import validate_location
        with pytest.raises(ValueError, match="Must be numbers"):
            validate_location("abc", "xyz")


# =====================================================================
# 2. INTELLIGENCE TESTS
# =====================================================================

class TestIntelligence:
    def _make_ctx(self, temp, humidity, rain_prob_24h, rainfall_24h_mm, wind=3.0):
        """Build a WeatherContext with specified parameters."""
        from schemas import WeatherContext, Location, CurrentWeather, ForecastWeather
        return WeatherContext(
            location=Location(latitude=23.02, longitude=72.57),
            observed_at="2025-01-01T00:00:00Z",
            current=CurrentWeather(
                temperature_c=temp,
                humidity_percent=humidity,
                wind_speed_mps=wind
            ),
            forecast=ForecastWeather(
                rain_probability_24h=rain_prob_24h,
                rainfall_next_24h_mm=rainfall_24h_mm
            ),
            source="test",
            weather_available=True
        )

    def test_high_rain_probability_signals(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(30, 60, 85, 12.0)
        signals = compute_signals(ctx)
        assert signals.rain_likely is True
        assert signals.rain_heavy is True

    def test_low_rain_probability_signals(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(30, 60, 10, 0.0)
        signals = compute_signals(ctx)
        assert signals.rain_likely is False
        assert signals.rain_heavy is False

    def test_high_heat_signal(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(38, 40, 10, 0.0)
        signals = compute_signals(ctx)
        assert signals.high_heat is True

    def test_high_humidity_signal(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(28, 85, 10, 0.0)
        signals = compute_signals(ctx)
        assert signals.high_humidity is True

    def test_disease_favorable(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(28, 85, 10, 0.0)
        signals = compute_signals(ctx)
        assert signals.disease_favorable_weather is True

    def test_disease_not_favorable_cold(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(15, 85, 10, 0.0)
        signals = compute_signals(ctx)
        assert signals.disease_favorable_weather is False

    def test_water_stress_risk_with_dry_soil(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(32, 50, 5, 0.0)
        signals = compute_signals(ctx, farm_context={"soil_moisture": 15})
        assert signals.water_stress_risk is True

    def test_water_stress_risk_suppressed_by_rain(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(32, 50, 80, 8.0)
        signals = compute_signals(ctx, farm_context={"soil_moisture": 15})
        assert signals.water_stress_risk is False

    def test_high_wind_signal(self):
        from intelligence import compute_signals
        ctx = self._make_ctx(30, 50, 10, 0.0, wind=10.0)
        signals = compute_signals(ctx)
        assert signals.high_wind is True

    def test_actions_generated_for_rain(self):
        from intelligence import compute_signals, generate_actions
        ctx = self._make_ctx(30, 60, 85, 12.0)
        signals = compute_signals(ctx)
        actions = generate_actions(signals)
        action_types = [a.type for a in actions]
        assert "irrigation" in action_types
        irrigation_action = next(a for a in actions if a.type == "irrigation")
        assert irrigation_action.action == "delay"

    def test_actions_generated_for_heat(self):
        from intelligence import compute_signals, generate_actions
        ctx = self._make_ctx(38, 40, 5, 0.0)
        signals = compute_signals(ctx)
        actions = generate_actions(signals)
        action_types = [a.type for a in actions]
        assert "heat_management" in action_types


# =====================================================================
# 3. IRRIGATION INTEGRATION TESTS
# =====================================================================

class TestIrrigationIntegration:
    def _make_ctx(self, rain_prob, rain_mm, temp=30, humidity=60):
        from schemas import WeatherContext, Location, CurrentWeather, ForecastWeather
        return WeatherContext(
            location=Location(latitude=23.02, longitude=72.57),
            observed_at="2025-01-01T00:00:00Z",
            current=CurrentWeather(temperature_c=temp, humidity_percent=humidity),
            forecast=ForecastWeather(
                rain_probability_24h=rain_prob,
                rainfall_next_24h_mm=rain_mm
            ),
            source="test",
            weather_available=True
        )

    def test_irrigation_required_rain_likely_delays(self):
        """ML says irrigate + rain likely → delay irrigation."""
        from intelligence import analyze_irrigation_weather
        ctx = self._make_ctx(85, 12.0)
        pred = {"predicted_class": 1, "status": "irrigation_required", "confidence": 0.91}
        result = analyze_irrigation_weather(ctx, pred)
        assert result["final_action"] == "delay_irrigation"
        assert result["weather_override"] is True

    def test_irrigation_required_no_rain_proceeds(self):
        """ML says irrigate + no rain → proceed irrigation."""
        from intelligence import analyze_irrigation_weather
        ctx = self._make_ctx(5, 0.0)
        pred = {"predicted_class": 1, "status": "irrigation_required", "confidence": 0.91}
        result = analyze_irrigation_weather(ctx, pred)
        assert result["final_action"] == "proceed_irrigation"
        assert result["weather_override"] is False

    def test_no_irrigation_rain_likely(self):
        """ML says no irrigation + rain likely → no irrigation."""
        from intelligence import analyze_irrigation_weather
        ctx = self._make_ctx(85, 12.0)
        pred = {"predicted_class": 0, "status": "no_irrigation", "confidence": 0.95}
        result = analyze_irrigation_weather(ctx, pred)
        assert result["final_action"] == "no_irrigation"

    def test_excess_water_rain_likely_drainage_alert(self):
        """ML says excess water + heavy rain → drainage alert."""
        from intelligence import analyze_irrigation_weather
        ctx = self._make_ctx(85, 15.0)
        pred = {"predicted_class": 2, "status": "excess_water", "confidence": 0.88}
        result = analyze_irrigation_weather(ctx, pred)
        assert result["final_action"] == "drainage_alert"
        assert result["weather_override"] is True

    def test_weather_unavailable_falls_back(self):
        """Weather unavailable → use ML prediction only."""
        from intelligence import analyze_irrigation_weather
        from schemas import make_unavailable_context
        ctx = make_unavailable_context(23.02, 72.57, "test", "API timeout")
        pred = {"predicted_class": 1, "status": "irrigation_required", "confidence": 0.91}
        result = analyze_irrigation_weather(ctx, pred)
        assert result["weather_override"] is False
        assert result["weather_available"] is False

    def test_moderate_rain_reduces_irrigation(self):
        """ML says irrigate + moderate rain → reduce irrigation."""
        from intelligence import analyze_irrigation_weather
        ctx = self._make_ctx(55, 3.0)
        pred = {"predicted_class": 1, "status": "irrigation_required", "confidence": 0.85}
        result = analyze_irrigation_weather(ctx, pred)
        assert result["final_action"] == "reduce_irrigation"
        assert result["weather_override"] is True


# =====================================================================
# 4. CACHE TESTS
# =====================================================================

class TestCache:
    def test_cache_stores_and_retrieves(self):
        from weather_service import WeatherCache
        from schemas import WeatherContext, Location, CurrentWeather, ForecastWeather
        cache = WeatherCache(ttl_seconds=60)
        ctx = WeatherContext(
            location=Location(23.02, 72.57),
            observed_at="test",
            current=CurrentWeather(temperature_c=30),
            forecast=ForecastWeather(),
            source="test"
        )
        cache.put(23.02, 72.57, ctx)
        result = cache.get(23.02, 72.57)
        assert result is not None
        assert result.current.temperature_c == 30

    def test_cache_misses_on_different_location(self):
        from weather_service import WeatherCache
        from schemas import WeatherContext, Location, CurrentWeather, ForecastWeather
        cache = WeatherCache(ttl_seconds=60)
        ctx = WeatherContext(
            location=Location(23.02, 72.57),
            observed_at="test",
            current=CurrentWeather(temperature_c=30),
            forecast=ForecastWeather(),
            source="test"
        )
        cache.put(23.02, 72.57, ctx)
        result = cache.get(28.61, 77.21)  # Different location (Delhi)
        assert result is None

    def test_cache_expires(self):
        from weather_service import WeatherCache
        from schemas import WeatherContext, Location, CurrentWeather, ForecastWeather
        cache = WeatherCache(ttl_seconds=1)
        ctx = WeatherContext(
            location=Location(23.02, 72.57),
            observed_at="test",
            current=CurrentWeather(),
            forecast=ForecastWeather(),
            source="test"
        )
        cache.put(23.02, 72.57, ctx)
        time.sleep(1.1)
        assert cache.get(23.02, 72.57) is None


# =====================================================================
# 5. API TESTS
# =====================================================================

class TestAPI:
    @pytest.fixture
    def client(self):
        from weather_api import app
        app.config["TESTING"] = True
        with app.test_client() as c:
            yield c

    def test_health_endpoint(self, client):
        resp = client.get("/api/weather/health")
        assert resp.status_code in [200, 503]
        data = resp.get_json()
        assert "status" in data
        assert "provider" in data
        assert data["provider"] in ["OpenWeatherMap", "WeatherAPI"]
        # API key should NOT be in the response
        assert "WEATHER_API_KEY" not in json.dumps(data)

    def test_context_missing_params(self, client):
        resp = client.get("/api/weather/context")
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_context_invalid_lat(self, client):
        resp = client.get("/api/weather/context?lat=999&lon=72.5714")
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data

    def test_analyze_missing_location(self, client):
        resp = client.post(
            "/api/weather/analyze",
            data=json.dumps({"farm": {"crop": "Tomato"}}),
            content_type="application/json"
        )
        assert resp.status_code == 400

    def test_analyze_non_json(self, client):
        resp = client.post(
            "/api/weather/analyze",
            data="plain text",
            content_type="text/plain"
        )
        assert resp.status_code == 400

    @patch("weather_service.fetch_current_weather", return_value=SAMPLE_CURRENT_RESPONSE)
    @patch("weather_service.fetch_forecast", return_value=SAMPLE_FORECAST_RESPONSE_RAINY)
    def test_context_returns_normalized_weather(self, mock_fc, mock_cur, client):
        from weather_service import clear_cache
        clear_cache()
        resp = client.get("/api/weather/context?lat=23.0225&lon=72.5714")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["weather_available"] is True
        assert data["source"] in ["OpenWeatherMap", "WeatherAPI"]
        assert "current" in data
        assert "forecast" in data
        assert data["current"]["temperature_c"] == 33.5

    @patch("weather_service.fetch_current_weather", return_value=SAMPLE_CURRENT_RESPONSE)
    @patch("weather_service.fetch_forecast", return_value=SAMPLE_FORECAST_RESPONSE_RAINY)
    def test_analyze_returns_full_intelligence(self, mock_fc, mock_cur, client):
        from weather_service import clear_cache
        clear_cache()
        payload = {
            "latitude": 23.0225,
            "longitude": 72.5714,
            "farm": {
                "crop": "Tomato",
                "growth_stage": "Flowering",
                "soil_moisture": 24
            },
            "irrigation_prediction": {
                "predicted_class": 1,
                "status": "irrigation_required",
                "confidence": 0.91
            }
        }
        resp = client.post(
            "/api/weather/analyze",
            data=json.dumps(payload),
            content_type="application/json"
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "weather" in data
        assert "signals" in data
        assert "actions" in data
        assert "irrigation_advice" in data
        # Rain is heavy in the mock → should delay irrigation
        assert data["irrigation_advice"]["final_action"] == "delay_irrigation"
        assert data["irrigation_advice"]["weather_override"] is True


# =====================================================================
# 6. PROVIDER ERROR HANDLING TESTS (Mocked)
# =====================================================================

class TestProviderErrors:
    @patch("weather_service.fetch_current_weather", side_effect=Exception("Connection refused"))
    def test_provider_failure_returns_unavailable(self, mock_cur):
        from weather_service import get_context, clear_cache
        clear_cache()
        ctx = get_context(23.0225, 72.5714)
        assert ctx.weather_available is False
        assert ctx.error_message is not None

    def test_missing_api_key_returns_unavailable(self):
        from weather_service import clear_cache
        clear_cache()
        with patch("config.WEATHER_API_KEY", ""):
            from provider import APIKeyMissingError
            with patch("weather_service.fetch_current_weather", side_effect=APIKeyMissingError("No key")):
                from weather_service import get_context
                ctx = get_context(23.0225, 72.5714)
                assert ctx.weather_available is False

    def test_unavailable_schema_safe_fallback(self):
        from schemas import make_unavailable_context
        ctx = make_unavailable_context(23.02, 72.57, "test", "API timeout")
        d = ctx.to_dict()
        assert d["weather_available"] is False
        assert d["error_message"] == "API timeout"
        assert "current" in d
        assert "forecast" in d
