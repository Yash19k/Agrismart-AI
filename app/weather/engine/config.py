"""
Configuration module for AgriSmart Weather Intelligence Service.

All configurable parameters are loaded from environment variables with sensible defaults.
Thresholds are documented and easily modifiable without changing business logic.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from weather module root, then project root
_WEATHER_ROOT = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _WEATHER_ROOT.parent.parent
for env_path in [_WEATHER_ROOT / ".env", _PROJECT_ROOT / ".env"]:
    if env_path.exists():
        load_dotenv(env_path)

# =====================================================================
# WEATHER PROVIDER CONFIGURATION
# =====================================================================

try:
    from django.conf import settings
    WEATHER_API_KEY: str = getattr(settings, "WEATHER_API_KEY", "") or os.getenv("WEATHER_API_KEY", "")
except Exception:
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")

WEATHER_PROVIDER_NAME: str = "WeatherAPI"
WEATHER_BASE_URL: str = "https://api.weatherapi.com/v1"


def get_provider_info() -> tuple:
    key = globals().get("WEATHER_API_KEY", "") or os.getenv("WEATHER_API_KEY", "")
    provider = os.getenv("WEATHER_PROVIDER", "weatherapi").strip().lower()

    if provider in ("weatherapi", "weatherapi.com") or len(key.strip()) == 31:
        return "WeatherAPI", "https://api.weatherapi.com/v1"
    if provider in ("openweathermap", "owm"):
        return "OpenWeatherMap", "https://api.openweathermap.org/data/2.5"

    return "WeatherAPI", "https://api.weatherapi.com/v1"

# Request timeouts (seconds)
WEATHER_REQUEST_TIMEOUT: int = int(os.getenv("WEATHER_REQUEST_TIMEOUT", "10"))

# Maximum retry attempts for transient failures
WEATHER_MAX_RETRIES: int = int(os.getenv("WEATHER_MAX_RETRIES", "2"))

# =====================================================================
# CACHING CONFIGURATION
# =====================================================================

# Cache TTL in seconds (default 10 minutes — weather doesn't change every second)
WEATHER_CACHE_TTL_SECONDS: int = int(os.getenv("WEATHER_CACHE_TTL_SECONDS", "600"))

# =====================================================================
# AGRICULTURAL DECISION THRESHOLDS
# All thresholds are configurable via environment variables.
# These defaults are agronomic heuristics, NOT scientifically validated
# field-calibrated values. They should be tuned per-region.
# =====================================================================

# Rain probability (0-100%) above which irrigation should be delayed
RAIN_PROBABILITY_DELAY_THRESHOLD: int = int(os.getenv("RAIN_PROBABILITY_DELAY_THRESHOLD", "70"))

# Rain probability (0-100%) above which irrigation volume should be reduced
RAIN_PROBABILITY_REDUCE_THRESHOLD: int = int(os.getenv("RAIN_PROBABILITY_REDUCE_THRESHOLD", "40"))

# Forecast rainfall (mm/24h) above which irrigation should be delayed
RAINFALL_DELAY_THRESHOLD_MM: float = float(os.getenv("RAINFALL_DELAY_THRESHOLD_MM", "5.0"))

# Temperature (°C) above which heat stress warning is triggered
HIGH_HEAT_THRESHOLD_C: float = float(os.getenv("HIGH_HEAT_THRESHOLD", "35.0"))

# Temperature (°C) below which cold/frost warning is triggered
COLD_STRESS_THRESHOLD_C: float = float(os.getenv("COLD_STRESS_THRESHOLD", "5.0"))

# Humidity (%) above which disease-favorable conditions may exist
HIGH_HUMIDITY_THRESHOLD: int = int(os.getenv("HIGH_HUMIDITY_THRESHOLD", "80"))

# Wind speed (m/s) above which spray/irrigation inefficiency warning is raised
HIGH_WIND_THRESHOLD_MPS: float = float(os.getenv("HIGH_WIND_THRESHOLD_MPS", "8.0"))

# Soil moisture (%) below which water stress risk flag is raised
WATER_STRESS_MOISTURE_THRESHOLD: int = int(os.getenv("WATER_STRESS_MOISTURE_THRESHOLD", "25"))
