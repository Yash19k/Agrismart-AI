"""
Weather Data Normalization — transforms raw OpenWeatherMap JSON into internal schemas.

This is the ONLY file that understands the provider's JSON structure.
If the provider changes, only this file needs updating.
"""

from typing import Dict, Any, Optional
from datetime import datetime, timezone

from .schemas import (
    Location,
    CurrentWeather,
    ForecastWeather,
    WeatherContext
)
from .config import WEATHER_PROVIDER_NAME


def normalize_current(raw: Dict[str, Any]) -> tuple:
    """
    Transform raw provider response into (Location, CurrentWeather).
    Supports both WeatherAPI (weatherapi.com) and OpenWeatherMap JSON structures.
    """
    # WeatherAPI structure
    if "current" in raw:
        loc_data = raw.get("location", {})
        location = Location(
            latitude=float(loc_data.get("lat", 0)),
            longitude=float(loc_data.get("lon", 0)),
            name=loc_data.get("name"),
            country=loc_data.get("country")
        )
        curr = raw.get("current", {})
        condition = curr.get("condition", {})
        wind_kph = _safe_float(curr.get("wind_kph"))
        wind_mps = round(wind_kph / 3.6, 1) if wind_kph is not None else None
        vis_km = _safe_float(curr.get("vis_km"))
        visibility_m = int(vis_km * 1000) if vis_km is not None else None

        current = CurrentWeather(
            temperature_c=_safe_float(curr.get("temp_c")),
            feels_like_c=_safe_float(curr.get("feelslike_c")),
            humidity_percent=_safe_int(curr.get("humidity")),
            pressure_hpa=_safe_float(curr.get("pressure_mb")),
            wind_speed_mps=wind_mps,
            wind_direction_deg=_safe_int(curr.get("wind_degree")),
            cloudiness_percent=_safe_int(curr.get("cloud")),
            rainfall_1h_mm=_safe_float(curr.get("precip_mm", 0.0)),
            rainfall_3h_mm=None,
            weather_condition=condition.get("text"),
            weather_description=condition.get("text"),
            visibility_m=visibility_m
        )
        return location, current

    # OpenWeatherMap /weather response structure (metric units):
    coord = raw.get("coord", {})
    location = Location(
        latitude=float(coord.get("lat", 0)),
        longitude=float(coord.get("lon", 0)),
        name=raw.get("name"),
        country=raw.get("sys", {}).get("country")
    )

    main = raw.get("main", {})
    wind = raw.get("wind", {})
    clouds = raw.get("clouds", {})
    rain = raw.get("rain", {})
    weather_list = raw.get("weather", [{}])
    weather_item = weather_list[0] if weather_list else {}

    current = CurrentWeather(
        temperature_c=_safe_float(main.get("temp")),
        feels_like_c=_safe_float(main.get("feels_like")),
        humidity_percent=_safe_int(main.get("humidity")),
        pressure_hpa=_safe_float(main.get("pressure")),
        wind_speed_mps=_safe_float(wind.get("speed")),
        wind_direction_deg=_safe_int(wind.get("deg")),
        cloudiness_percent=_safe_int(clouds.get("all")),
        rainfall_1h_mm=_safe_float(rain.get("1h", 0.0)),
        rainfall_3h_mm=_safe_float(rain.get("3h")),
        weather_condition=weather_item.get("main"),
        weather_description=weather_item.get("description"),
        visibility_m=_safe_int(raw.get("visibility"))
    )

    return location, current


def normalize_forecast(raw: Dict[str, Any]) -> ForecastWeather:
    """
    Aggregate raw forecast response into a single ForecastWeather summary
    covering the next 6h, 12h, and 24h.
    Supports both WeatherAPI (forecast.json) and OpenWeatherMap (/forecast).
    """
    # WeatherAPI format
    if "forecast" in raw:
        forecast_days = raw.get("forecast", {}).get("forecastday", [])
        if not forecast_days:
            return ForecastWeather()

        now_epoch = datetime.now(timezone.utc).timestamp()
        rain_probs_6h = []
        rain_probs_12h = []
        rain_probs_24h = []
        rain_mm_6h = 0.0
        rain_mm_12h = 0.0
        rain_mm_24h = 0.0
        temps_24h = []
        humids_24h = []
        winds_24h = []

        for day in forecast_days:
            for h in day.get("hour", []):
                dt = h.get("time_epoch", 0)
                hours_ahead = (dt - now_epoch) / 3600.0

                if hours_ahead < -0.5 or hours_ahead > 24.5:
                    continue

                pop = _safe_float(h.get("chance_of_rain", 0)) or 0.0
                precip = _safe_float(h.get("precip_mm", 0.0)) or 0.0
                temp = _safe_float(h.get("temp_c"))
                humidity = _safe_int(h.get("humidity"))
                wind_kph = _safe_float(h.get("wind_kph"))
                wind_mps = round(wind_kph / 3.6, 1) if wind_kph is not None else None

                if hours_ahead <= 6.0:
                    rain_probs_6h.append(pop)
                    rain_mm_6h += precip
                if hours_ahead <= 12.0:
                    rain_probs_12h.append(pop)
                    rain_mm_12h += precip
                rain_probs_24h.append(pop)
                rain_mm_24h += precip
                if temp is not None:
                    temps_24h.append(temp)
                if humidity is not None:
                    humids_24h.append(humidity)
                if wind_mps is not None:
                    winds_24h.append(wind_mps)

        # If hourly list had no items, fallback to daily values from day object
        if not rain_probs_24h and forecast_days:
            first_day = forecast_days[0].get("day", {})
            pop_day = _safe_int(first_day.get("daily_chance_of_rain"))
            precip_day = _safe_float(first_day.get("totalprecip_mm"))
            max_t = _safe_float(first_day.get("maxtemp_c"))
            min_t = _safe_float(first_day.get("mintemp_c"))
            avg_h = _safe_int(first_day.get("avghumidity"))
            max_w_kph = _safe_float(first_day.get("maxwind_kph"))
            max_w_mps = round(max_w_kph / 3.6, 1) if max_w_kph is not None else None

            return ForecastWeather(
                rain_probability_6h=pop_day,
                rain_probability_12h=pop_day,
                rain_probability_24h=pop_day,
                rainfall_next_6h_mm=precip_day,
                rainfall_next_12h_mm=precip_day,
                rainfall_next_24h_mm=precip_day,
                temperature_max_24h_c=max_t,
                temperature_min_24h_c=min_t,
                humidity_max_24h=avg_h,
                humidity_min_24h=avg_h,
                wind_max_24h_mps=max_w_mps
            )

        return ForecastWeather(
            rain_probability_6h=int(max(rain_probs_6h)) if rain_probs_6h else None,
            rain_probability_12h=int(max(rain_probs_12h)) if rain_probs_12h else None,
            rain_probability_24h=int(max(rain_probs_24h)) if rain_probs_24h else None,
            rainfall_next_6h_mm=round(rain_mm_6h, 1) if rain_probs_6h else None,
            rainfall_next_12h_mm=round(rain_mm_12h, 1) if rain_probs_12h else None,
            rainfall_next_24h_mm=round(rain_mm_24h, 1) if rain_probs_24h else None,
            temperature_max_24h_c=round(max(temps_24h), 1) if temps_24h else None,
            temperature_min_24h_c=round(min(temps_24h), 1) if temps_24h else None,
            humidity_max_24h=max(humids_24h) if humids_24h else None,
            humidity_min_24h=min(humids_24h) if humids_24h else None,
            wind_max_24h_mps=round(max(winds_24h), 1) if winds_24h else None
        )

    # OpenWeatherMap format
    forecast_list = raw.get("list", [])
    if not forecast_list:
        return ForecastWeather()

    now_epoch = datetime.now(timezone.utc).timestamp()

    # Buckets: 6h, 12h, 24h
    rain_probs_6h = []
    rain_probs_12h = []
    rain_probs_24h = []
    rain_mm_6h = 0.0
    rain_mm_12h = 0.0
    rain_mm_24h = 0.0
    temps_24h = []
    humids_24h = []
    winds_24h = []

    for item in forecast_list:
        dt = item.get("dt", 0)
        hours_ahead = (dt - now_epoch) / 3600.0

        if hours_ahead < 0 or hours_ahead > 24:
            continue

        pop = item.get("pop", 0)  # 0.0 - 1.0
        rain_3h = _safe_float(item.get("rain", {}).get("3h", 0.0)) or 0.0
        temp = _safe_float(item.get("main", {}).get("temp"))
        humidity = _safe_int(item.get("main", {}).get("humidity"))
        wind = _safe_float(item.get("wind", {}).get("speed"))

        if hours_ahead <= 6:
            rain_probs_6h.append(pop)
            rain_mm_6h += rain_3h
        if hours_ahead <= 12:
            rain_probs_12h.append(pop)
            rain_mm_12h += rain_3h
        # Always within 24h at this point
        rain_probs_24h.append(pop)
        rain_mm_24h += rain_3h
        if temp is not None:
            temps_24h.append(temp)
        if humidity is not None:
            humids_24h.append(humidity)
        if wind is not None:
            winds_24h.append(wind)

    def _max_pop_pct(probs):
        """Convert max probability-of-precipitation to percentage."""
        if not probs:
            return None
        return int(max(probs) * 100)

    return ForecastWeather(
        rain_probability_6h=_max_pop_pct(rain_probs_6h),
        rain_probability_12h=_max_pop_pct(rain_probs_12h),
        rain_probability_24h=_max_pop_pct(rain_probs_24h),
        rainfall_next_6h_mm=round(rain_mm_6h, 1) if rain_probs_6h else None,
        rainfall_next_12h_mm=round(rain_mm_12h, 1) if rain_probs_12h else None,
        rainfall_next_24h_mm=round(rain_mm_24h, 1) if rain_probs_24h else None,
        temperature_max_24h_c=round(max(temps_24h), 1) if temps_24h else None,
        temperature_min_24h_c=round(min(temps_24h), 1) if temps_24h else None,
        humidity_max_24h=max(humids_24h) if humids_24h else None,
        humidity_min_24h=min(humids_24h) if humids_24h else None,
        wind_max_24h_mps=round(max(winds_24h), 1) if winds_24h else None
    )


def build_weather_context(
    current_raw: Dict[str, Any],
    forecast_raw: Dict[str, Any],
    source: Optional[str] = None
) -> WeatherContext:
    """
    Build a complete WeatherContext from raw provider responses.
    This is the ONLY public function downstream code should use.
    """
    location, current = normalize_current(current_raw)
    forecast = normalize_forecast(forecast_raw)

    if source is None:
        source = "WeatherAPI" if "current" in current_raw else WEATHER_PROVIDER_NAME

    return WeatherContext(
        location=location,
        observed_at=datetime.now(timezone.utc).isoformat() + "Z",
        current=current,
        forecast=forecast,
        source=source,
        weather_available=True
    )


# =====================================================================
# Private helper utilities
# =====================================================================

def _safe_float(val) -> Optional[float]:
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None
