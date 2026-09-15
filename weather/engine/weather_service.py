"""
Weather Service — the single shared gateway for all weather data in AgriSmart.

Architecture:
    Module A (Crop Recommendation)  ──┐
    Module B (Smart Irrigation)     ──┤──▶  WeatherService.get_context(lat, lon)
    Module D (Sustainability)       ──┤            │
    Module E (Farmer Assistant)     ──┘            ▼
                                          Weather Provider (OpenWeatherMap)

Features:
- In-process cache with configurable TTL to prevent redundant API calls
- Graceful fallback on provider failure (weather_available=false)
- Location validation
- Single normalized WeatherContext contract for all consumers
"""

import time
import hashlib
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone

from .schemas import WeatherContext, Location, make_unavailable_context
from .provider import (
    fetch_current_weather,
    fetch_forecast,
    get_provider_name,
    WeatherProviderError,
    APIKeyMissingError
)
from .normalization import build_weather_context
from .config import WEATHER_CACHE_TTL_SECONDS


# =====================================================================
# In-process weather cache
# =====================================================================

class WeatherCache:
    """Simple in-process cache keyed by (lat, lon) with configurable TTL."""

    def __init__(self, ttl_seconds: int = WEATHER_CACHE_TTL_SECONDS):
        self._store: Dict[str, Tuple[float, WeatherContext]] = {}
        self._ttl = ttl_seconds

    def _make_key(self, latitude: float, longitude: float) -> str:
        # Round to 2 decimal places (~1.1km resolution) to share cache for nearby points
        rounded = f"{latitude:.2f},{longitude:.2f}"
        return rounded

    def get(self, latitude: float, longitude: float) -> Optional[WeatherContext]:
        key = self._make_key(latitude, longitude)
        if key in self._store:
            timestamp, context = self._store[key]
            if time.time() - timestamp < self._ttl:
                return context
            else:
                del self._store[key]
        return None

    def put(self, latitude: float, longitude: float, context: WeatherContext):
        key = self._make_key(latitude, longitude)
        self._store[key] = (time.time(), context)

    def clear(self):
        self._store.clear()


# Module-level cache instance
_cache = WeatherCache()


# =====================================================================
# Location validation
# =====================================================================

def validate_location(latitude: Any, longitude: Any) -> Tuple[float, float]:
    """Validate and normalize location coordinates."""
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid coordinates: latitude={latitude}, longitude={longitude}. Must be numbers.")

    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"Latitude {lat} is out of range [-90, 90].")
    if not (-180.0 <= lon <= 180.0):
        raise ValueError(f"Longitude {lon} is out of range [-180, 180].")

    return lat, lon


# =====================================================================
# Core public API — consumed by all modules
# =====================================================================

def get_context(latitude: float, longitude: float) -> WeatherContext:
    """
    Primary weather entry point for ALL AgriSmart modules.
    
    Returns a complete, normalized WeatherContext.
    If the provider is unavailable, returns a safe fallback with weather_available=False.
    
    Usage (from any module):
        from bonus.weather.src.weather_service import get_context
        ctx = get_context(lat=23.0225, lon=72.5714)
    """
    lat, lon = validate_location(latitude, longitude)
    source = get_provider_name()

    # Check cache first
    cached = _cache.get(lat, lon)
    if cached is not None:
        return cached

    # Fetch from provider
    try:
        current_raw = fetch_current_weather(lat, lon)
        forecast_raw = fetch_forecast(lat, lon)
        context = build_weather_context(current_raw, forecast_raw, source=source)
        _cache.put(lat, lon, context)
        return context

    except APIKeyMissingError as e:
        return make_unavailable_context(lat, lon, source, str(e))
    except WeatherProviderError as e:
        return make_unavailable_context(lat, lon, source, str(e))
    except Exception as e:
        return make_unavailable_context(lat, lon, source, f"Unexpected error: {str(e)}")


def get_context_for_crop_recommendation(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Integration contract for Module A (Crop Recommendation).
    
    Returns a flat dictionary of environmental parameters that crop recommendation
    modules can use for context enrichment, ranking adjustment, or advisory.
    
    The crop recommendation model should NOT add these as trained features unless
    it was trained on the same feature definitions.
    """
    ctx = get_context(latitude, longitude)

    if not ctx.weather_available:
        return {
            "weather_available": False,
            "error": ctx.error_message
        }

    return {
        "weather_available": True,
        "temperature_c": ctx.current.temperature_c,
        "humidity_percent": ctx.current.humidity_percent,
        "rainfall_recent_mm": ctx.current.rainfall_1h_mm or 0.0,
        "wind_speed_mps": ctx.current.wind_speed_mps,
        "weather_condition": ctx.current.weather_condition,
        "forecast_rain_probability_24h": ctx.forecast.rain_probability_24h,
        "forecast_rainfall_24h_mm": ctx.forecast.rainfall_next_24h_mm,
        "forecast_temp_max_c": ctx.forecast.temperature_max_24h_c,
        "forecast_temp_min_c": ctx.forecast.temperature_min_24h_c,
        "source": ctx.source
    }


def get_irrigation_weather_context(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Integration contract for Module B (Smart Irrigation).
    
    Returns the weather context dictionary that the existing irrigation
    recommendation engine already understands (rain_probability, forecast_rainfall_mm).
    
    Module B's ML model is NOT modified — this context feeds into the
    deterministic recommendation layer only.
    """
    ctx = get_context(latitude, longitude)

    if not ctx.weather_available:
        return None  # Module B handles None weather_context gracefully

    # Map to the keys that Module B's recommendations.py already expects
    rain_prob = ctx.forecast.rain_probability_24h
    if rain_prob is not None:
        rain_prob = rain_prob / 100.0  # Module B expects 0.0-1.0

    return {
        "rain_probability": rain_prob or 0.0,
        "forecast_rainfall_mm": ctx.forecast.rainfall_next_24h_mm or 0.0,
        "forecast_temp": ctx.forecast.temperature_max_24h_c,
        "forecast_humidity": ctx.forecast.humidity_max_24h
    }


def clear_cache():
    """Clear the weather cache (useful for testing)."""
    _cache.clear()
