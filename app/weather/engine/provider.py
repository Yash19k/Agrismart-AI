"""
OpenWeatherMap Provider — encapsulates ALL provider-specific HTTP communication.

No other module in AgriSmart should import this file directly.
Only weather_service.py calls into the provider.

API Products Used:
- Current Weather: https://api.openweathermap.org/data/2.5/weather
- 5-Day / 3-Hour Forecast: https://api.openweathermap.org/data/2.5/forecast

Both endpoints are available on the FREE tier of OpenWeatherMap.
"""

import os
import time
import requests
from typing import Dict, Any, Optional, Tuple

from . import config
from .config import (
    WEATHER_API_KEY,
    WEATHER_BASE_URL,
    WEATHER_REQUEST_TIMEOUT,
    WEATHER_MAX_RETRIES,
    WEATHER_PROVIDER_NAME,
    get_provider_info
)


class WeatherProviderError(Exception):
    """Base error for weather provider failures."""
    pass


class APIKeyMissingError(WeatherProviderError):
    """Raised when the WEATHER_API_KEY environment variable is not set."""
    pass


class APIKeyInvalidError(WeatherProviderError):
    """Raised when the provider rejects the API key (HTTP 401)."""
    pass


class ProviderTimeoutError(WeatherProviderError):
    """Raised on connection or read timeout."""
    pass


class ProviderUnavailableError(WeatherProviderError):
    """Raised when the provider returns 5xx or is unreachable."""
    pass


class RateLimitError(WeatherProviderError):
    """Raised when the provider returns HTTP 429 (too many requests)."""
    pass


def _validate_api_key() -> str:
    """Ensure API key is present."""
    key = getattr(config, "WEATHER_API_KEY", "") or os.getenv("WEATHER_API_KEY", "")
    if not key or str(key).strip() == "":
        raise APIKeyMissingError(
            "WEATHER_API_KEY environment variable is not set. "
            "Please add your weather API key to the .env file."
        )
    return str(key).strip()


def _make_request(url: str, params: Dict[str, Any], provider_name: str = "Weather") -> Dict[str, Any]:
    """
    Execute an HTTP GET with retry logic and structured error handling.
    Never exposes the API key in error messages.
    """
    last_error = None
    for attempt in range(1, WEATHER_MAX_RETRIES + 1):
        try:
            resp = requests.get(url, params=params, timeout=WEATHER_REQUEST_TIMEOUT)

            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 401:
                raise APIKeyInvalidError(
                    f"Weather API key was rejected by {provider_name} (HTTP 401). "
                    "Please verify your WEATHER_API_KEY in the .env file."
                )
            elif resp.status_code == 403:
                body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                code = body.get("error", {}).get("code")
                if code in (2006, 2008):
                    raise APIKeyInvalidError(
                        f"Weather API key was rejected by {provider_name}: {body.get('error', {}).get('message')}"
                    )
                elif code == 2007:
                    raise RateLimitError(f"{provider_name} quota exceeded (HTTP 403).")
                raise WeatherProviderError(
                    f"{provider_name} error (HTTP 403): {body.get('error', {}).get('message', resp.text[:200])}"
                )
            elif resp.status_code == 429:
                raise RateLimitError(
                    f"{provider_name} rate limit exceeded (HTTP 429). "
                    "Please wait before making further requests."
                )
            elif resp.status_code >= 500:
                last_error = ProviderUnavailableError(
                    f"{provider_name} server error (HTTP {resp.status_code}). Attempt {attempt}/{WEATHER_MAX_RETRIES}."
                )
            else:
                body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                msg = body.get("message") or body.get("error", {}).get("message") or resp.text[:200]
                raise WeatherProviderError(f"{provider_name} error (HTTP {resp.status_code}): {msg}")

        except requests.exceptions.Timeout:
            last_error = ProviderTimeoutError(
                f"{provider_name} request timed out after {WEATHER_REQUEST_TIMEOUT}s. "
                f"Attempt {attempt}/{WEATHER_MAX_RETRIES}."
            )
        except requests.exceptions.ConnectionError:
            last_error = ProviderUnavailableError(
                f"Unable to connect to {provider_name}. Check internet connection. "
                f"Attempt {attempt}/{WEATHER_MAX_RETRIES}."
            )
        except (APIKeyInvalidError, RateLimitError, WeatherProviderError):
            raise  # Don't retry these — they won't resolve by retrying

        # Brief backoff before retry
        if attempt < WEATHER_MAX_RETRIES:
            time.sleep(1.0 * attempt)

    # All retries exhausted
    raise last_error


def fetch_current_weather(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetch current weather observation.
    Supports WeatherAPI (weatherapi.com) and OpenWeatherMap.
    Returns raw provider JSON dict.
    """
    api_key = _validate_api_key()
    provider_name, base_url = get_provider_info()

    if provider_name == "WeatherAPI":
        url = f"{base_url}/current.json"
        params = {
            "key": api_key,
            "q": f"{latitude},{longitude}",
            "aqi": "no"
        }
    else:
        url = f"{base_url}/weather"
        params = {
            "lat": latitude,
            "lon": longitude,
            "appid": api_key,
            "units": "metric"  # Celsius, m/s, mm
        }
    return _make_request(url, params, provider_name=provider_name)


def fetch_forecast(latitude: float, longitude: float) -> Dict[str, Any]:
    """
    Fetch forecast data.
    Supports WeatherAPI (weatherapi.com) and OpenWeatherMap.
    Returns raw provider JSON dict.
    """
    api_key = _validate_api_key()
    provider_name, base_url = get_provider_info()

    if provider_name == "WeatherAPI":
        url = f"{base_url}/forecast.json"
        params = {
            "key": api_key,
            "q": f"{latitude},{longitude}",
            "days": 2,
            "aqi": "no",
            "alerts": "no"
        }
    else:
        url = f"{base_url}/forecast"
        params = {
            "lat": latitude,
            "lon": longitude,
            "appid": api_key,
            "units": "metric"
        }
    return _make_request(url, params, provider_name=provider_name)


def get_provider_name() -> str:
    """Return the active provider identifier."""
    name, _ = get_provider_info()
    return name
