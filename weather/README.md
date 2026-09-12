# Weather Intelligence Module — AgriSmart AI (Module C)

> **Bonus Module C — Live & Forecast Weather Intelligence for Sustainable Agriculture**
>
> A modular, provider-abstracted weather service that delivers current conditions,
> precipitation forecasts, and structured agricultural signals to ALL AgriSmart modules.

---

## Table of Contents

1. [Problem & Scope](#1-problem--scope)
2. [Architecture](#2-architecture)
3. [Weather Data Source](#3-weather-data-source)
4. [Quick Start](#4-quick-start)
5. [API Endpoints](#5-api-endpoints)
6. [Normalized Weather Schema](#6-normalized-weather-schema)
7. [Weather Intelligence & Rule Engine](#7-weather-intelligence--rule-engine)
8. [Integration Contracts](#8-integration-contracts)
9. [Configuration & Thresholds](#9-configuration--thresholds)
10. [Error Handling & Fallback](#10-error-handling--fallback)
11. [Testing](#11-testing)
12. [Limitations](#12-limitations)

---

## 1. Problem & Scope

The hackathon requirement is:

> Combine live/forecast weather with farm conditions to produce actions such as
> "delay irrigation — rain likely" or "raised disease risk — monitor."
> Name the weather data source.

This module:
- Fetches **current weather** and **5-day / 3-hour forecast** from a live API
- Normalizes provider-specific JSON into a **stable internal schema**
- Generates **structured boolean signals** (rain_likely, high_heat, disease_favorable, etc.)
- Produces **ordered, deterministic agricultural actions** (delay irrigation, increase monitoring, etc.)
- Integrates cleanly with Module B (Smart Irrigation) **without modifying the trained ML model**
- Provides integration interfaces for Module A (Crop Recommendation) and future modules D/E/G

---

## 2. Architecture

```
                         ┌──────────────────────────────┐
                         │    OpenWeatherMap API         │
                         │  (Current + 5-day Forecast)   │
                         └──────────┬───────────────────┘
                                    │
                         ┌──────────▼───────────────────┐
                         │     provider.py               │
                         │  (HTTP, retries, error types) │
                         └──────────┬───────────────────┘
                                    │ raw JSON
                         ┌──────────▼───────────────────┐
                         │     normalization.py           │
                         │  (Provider JSON → schema)     │
                         └──────────┬───────────────────┘
                                    │ WeatherContext
                         ┌──────────▼───────────────────┐
                         │     weather_service.py        │
                         │  (Cache, validation, gateway) │
                         └──────────┬───────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
    ┌─────────▼──────┐   ┌─────────▼──────┐   ┌─────────▼──────┐
    │  Module A      │   │  Module B      │   │  Modules D/E/G │
    │  Crop Rec.     │   │  Irrigation    │   │  (Future)      │
    │  (context)     │   │  (weather_ctx) │   │                │
    └────────────────┘   └────────────────┘   └────────────────┘
```

**Key principle**: No module other than `provider.py` knows the external API. Switching providers requires changing ONLY `provider.py` and `normalization.py`.

---

## 3. Weather Data Source

| Property | WeatherAPI (Default with your key) | OpenWeatherMap |
|---|---|---|
| **Provider** | **WeatherAPI.com** | **OpenWeatherMap** |
| **Current API** | `https://api.weatherapi.com/v1/current.json` | `https://api.openweathermap.org/data/2.5/weather` |
| **Forecast API** | `https://api.weatherapi.com/v1/forecast.json` | `https://api.openweathermap.org/data/2.5/forecast` |
| **Resolution** | Hourly forecast, 0-100% rain chance | 3-hour forecast intervals |
| **Tier** | Free tier | Free tier (60 calls/min) |
| **Units** | Metric (°C, m/s, mm, hPa) | Metric (°C, m/s, mm, hPa) |
| **Auto-Detection** | Keys with 31 characters, or `WEATHER_PROVIDER=weatherapi` | Default / 32-character keys |

**The API key is NEVER stored in source code.** It is loaded from `.env` at runtime and ignored by Git.

---

## 4. Quick Start

### 1. Set your API key

In `c:\Maithil\Agri-Smart\.env`:

```env
WEATHER_API_KEY=093b53ee057a4907ab9104918261209
WEATHER_PROVIDER=weatherapi
```

### 2. Start the Weather API

```bash
cd bonus/weather
python api/weather_api.py
```

Server starts on `http://localhost:5001`.

### 3. Test

```bash
# Health check
curl http://localhost:5001/api/weather/health

# Get weather for a farm location
curl "http://localhost:5001/api/weather/context?lat=23.0225&lon=72.5714"

# Full intelligence analysis
curl -X POST http://localhost:5001/api/weather/analyze \
  -H "Content-Type: application/json" \
  -d '{"latitude": 23.0225, "longitude": 72.5714, "farm": {"crop": "Tomato", "growth_stage": "Flowering", "soil_moisture": 24}}'
```

---

## 5. API Endpoints

### `GET /api/weather/health`

Health check. Never exposes the API key.

```json
{
  "status": "ok",
  "provider": "OpenWeatherMap",
  "api_key_configured": true,
  "service": "AgriSmart Weather Intelligence API"
}
```

### `GET /api/weather/context?lat=...&lon=...`

Returns normalized weather context for any farm location.

### `POST /api/weather/analyze`

Full weather intelligence analysis with farm context and optional irrigation prediction.

### `GET /api/weather/crop-context?lat=...&lon=...`

Flat environmental context tailored for crop recommendation modules.

### `GET /api/weather/irrigation-context?lat=...&lon=...`

Weather context in the exact format Module B's recommendation engine expects.

---

## 6. Normalized Weather Schema

All modules consume this single schema — never raw provider JSON:

```json
{
  "location": {
    "latitude": 23.02,
    "longitude": 72.57,
    "name": "Ahmedabad",
    "country": "IN"
  },
  "observed_at": "2025-01-01T12:00:00Z",
  "current": {
    "temperature_c": 33.5,
    "feels_like_c": 36.2,
    "humidity_percent": 62,
    "pressure_hpa": 1008.0,
    "wind_speed_mps": 4.1,
    "cloudiness_percent": 40,
    "rainfall_1h_mm": 0.5,
    "weather_condition": "Clouds",
    "weather_description": "scattered clouds"
  },
  "forecast": {
    "rain_probability_6h": 90,
    "rain_probability_24h": 90,
    "rainfall_next_6h_mm": 10.0,
    "rainfall_next_24h_mm": 15.0,
    "temperature_max_24h_c": 30.0,
    "temperature_min_24h_c": 26.0,
    "humidity_max_24h": 85,
    "wind_max_24h_mps": 4.0
  },
  "source": "OpenWeatherMap",
  "weather_available": true,
  "error_message": null
}
```

Fields that the provider doesn't supply are represented as `null`.

---

## 7. Weather Intelligence & Rule Engine

### Signals (structured boolean flags)

| Signal | Condition | Default Threshold |
|---|---|---|
| `rain_likely` | Rain probability ≥ 40% OR forecast rain ≥ 2mm | Configurable |
| `rain_heavy` | Rain probability ≥ 70% OR forecast rain ≥ 5mm | Configurable |
| `high_heat` | Temperature ≥ 35°C | Configurable |
| `cold_stress` | Temperature ≤ 5°C | Configurable |
| `high_humidity` | Humidity ≥ 80% | Configurable |
| `high_wind` | Wind ≥ 8 m/s | Configurable |
| `water_stress_risk` | Soil moisture ≤ 25% AND no heavy rain | Configurable |
| `disease_favorable_weather` | Humidity ≥ 80% AND temp ≥ 20°C | Configurable |

### Actions (deterministic rule engine output)

| Condition | Action Type | Action | Urgency |
|---|---|---|---|
| Heavy rain expected | `irrigation` | `delay` | high |
| Moderate rain expected | `irrigation` | `reduce` | medium |
| High temperature | `heat_management` | `increase_monitoring` | high |
| Cold/frost risk | `frost_protection` | `protect_crop` | critical |
| High humidity + warm | `disease_monitoring` | `monitor` | medium |
| High wind | `spray_management` | `postpone_spraying` | medium |
| Low soil moisture + no rain | `irrigation` | `irrigate_soon` | high |

All thresholds are documented and configurable via environment variables.

---

## 8. Integration Contracts

### Module B (Smart Irrigation)

```python
# From Module B or any caller:
from bonus.weather.src.weather_service import get_irrigation_weather_context

# Returns dict compatible with existing Module B recommendation engine
weather_ctx = get_irrigation_weather_context(lat=23.0225, lon=72.5714)
# -> {"rain_probability": 0.85, "forecast_rainfall_mm": 12.0, ...}
```

**The ML model is NEVER modified.** Weather context feeds into the recommendation layer only.

### Module A (Crop Recommendation)

```python
from bonus.weather.src.weather_service import get_context_for_crop_recommendation

ctx = get_context_for_crop_recommendation(lat=23.0225, lon=72.5714)
# -> {"temperature_c": 33.5, "humidity_percent": 62, ...}
```

### Future Modules (D/E/G)

```python
from bonus.weather.src.weather_service import get_context

ctx = get_context(lat=23.0225, lon=72.5714)
# Returns full WeatherContext schema
```

---

## 9. Configuration & Thresholds

All configurable via environment variables in `.env`:

| Variable | Default | Description |
|---|---|---|
| `WEATHER_API_KEY` | (required) | OpenWeatherMap API key |
| `WEATHER_REQUEST_TIMEOUT` | 10 | HTTP timeout in seconds |
| `WEATHER_MAX_RETRIES` | 2 | Max retry attempts |
| `WEATHER_CACHE_TTL_SECONDS` | 600 | Cache TTL (10 minutes) |
| `RAIN_PROBABILITY_DELAY_THRESHOLD` | 70 | Rain % to delay irrigation |
| `RAIN_PROBABILITY_REDUCE_THRESHOLD` | 40 | Rain % to reduce irrigation |
| `RAINFALL_DELAY_THRESHOLD_MM` | 5.0 | Rainfall mm to delay irrigation |
| `HIGH_HEAT_THRESHOLD` | 35 | °C for heat stress warning |
| `COLD_STRESS_THRESHOLD` | 5 | °C for cold/frost warning |
| `HIGH_HUMIDITY_THRESHOLD` | 80 | % for disease-favorable flag |
| `HIGH_WIND_THRESHOLD_MPS` | 8.0 | m/s for spray/wind warning |
| `WATER_STRESS_MOISTURE_THRESHOLD` | 25 | Soil moisture % for stress |

---

## 10. Error Handling & Fallback

| Error | Handling |
|---|---|
| Missing API key | Returns `weather_available: false` with message |
| Invalid API key (401) | Raises `APIKeyInvalidError`, returns unavailable |
| Provider timeout | Retries up to `WEATHER_MAX_RETRIES`, then returns unavailable |
| Provider 5xx | Retries with backoff, then returns unavailable |
| Rate limit (429) | Returns `RateLimitError`, no retry |
| Invalid coordinates | Returns `400 Bad Request` with validation message |
| No internet | Returns unavailable; Module B ML prediction works independently |

**Weather failure NEVER breaks Module B.** The irrigation ML model always produces its prediction; weather modifies only the recommendation layer.

---

## 11. Testing

```bash
cd bonus/weather
python -m pytest tests/ -v
```

**39 tests** across 6 categories:

| Category | Tests | Covers |
|---|---|---|
| Normalization | 9 | Provider JSON → schema, missing fields, location validation |
| Intelligence | 11 | Rain, heat, humidity, wind, disease, water stress signals + actions |
| Irrigation Integration | 6 | ML+weather→delay, proceed, reduce, drainage, fallback |
| Cache | 3 | Store/retrieve, miss on different location, TTL expiry |
| API | 7 | Health, context, analyze, validation, error codes |
| Provider Errors | 3 | Failure fallback, missing key, unavailable schema |

All tests use mocked provider responses — no live API calls during testing.

---

## 12. Limitations

1. **Free Tier Rate Limits**: OpenWeatherMap free tier allows 60 calls/minute. The 10-minute cache TTL mitigates this for typical usage.
2. **Forecast Granularity**: The free tier provides 3-hour forecast intervals (not hourly). Rain probability aggregation uses max-PoP within 6h/12h/24h windows.
3. **Threshold Calibration**: Agricultural thresholds are agronomic heuristics, not field-validated calibrations. They should be tuned per-region and crop variety before commercial deployment.
4. **No Historical Weather**: This module provides current + forecast only. Historical weather analysis (growing degree days, seasonal trends) would require additional API products.
