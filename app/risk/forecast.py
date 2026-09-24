"""
7-Day Risk Progression Forecast Engine.
Generates multi-day risk projections using daily meteorological forecasts and pathogen biology.
"""
from datetime import datetime, timedelta
from .engine import calculate_risk


def generate_7day_forecast(
    base_crop_stage: str = 'vegetative',
    disease_confidence: float = 0.0,
    disease_severity: str = 'low',
    is_healthy: bool = True,
    pest_count: int = 0,
    local_incidence_count: int = 0,
    daily_weather_forecast: list = None,
    current_weather: dict = None,
) -> list:
    """
    Computes a 7-day risk progression trajectory.
    Uses daily weather parameters if provided by weather service, otherwise projects
    realistic diurnal weather patterns from current conditions.
    """
    forecast_days = []
    today = datetime.now()

    # Fallback weather defaults if daily forecast is sparse
    base_temp = float(current_weather.get('temperature', 28.0) if current_weather else 28.0)
    base_hum = float(current_weather.get('humidity', 65.0) if current_weather else 65.0)
    base_rain = float(current_weather.get('precipitation', 10.0) if current_weather else 10.0)

    # Simulated pathogen pressure drift over 7 days if no intervention is taken
    # In humid conditions (>70%), disease pressure amplifies; in dry/hot conditions, it slows.
    effective_confidence = disease_confidence
    effective_pest = pest_count

    for i in range(7):
        day_date = today + timedelta(days=i)
        day_label = f"Day {i + 1}"
        weekday = day_date.strftime("%a")

        # Weather for day i
        if daily_weather_forecast and i < len(daily_weather_forecast):
            dw = daily_weather_forecast[i]
            t_max = dw.get('temperature_max', dw.get('temp_max', base_temp + 2))
            t_min = dw.get('temperature_min', dw.get('temp_min', base_temp - 4))
            day_temp = (t_max + t_min) / 2.0
            day_rain = dw.get('rain_probability', dw.get('precipitation_probability_max', dw.get('rainfall', base_rain)))
            day_hum = dw.get('humidity', dw.get('relative_humidity_2m', base_hum))
        else:
            # Realistic day-to-day weather variation
            variation = (i % 3 - 1) * 3
            day_temp = max(18.0, min(38.0, base_temp + variation * 0.5))
            day_hum = max(40.0, min(95.0, base_hum + variation * 2.0))
            day_rain = max(0.0, min(100.0, base_rain + variation * 4.0))

        # Biological progression dynamics
        if not is_healthy and effective_confidence > 0:
            if day_hum > 75 and 20 <= day_temp <= 30:
                # Favorable for spread
                effective_confidence = min(1.0, effective_confidence + 0.04)
            elif day_hum < 50:
                effective_confidence = max(0.2, effective_confidence - 0.02)

        if effective_pest > 0:
            # Pest breeding cycle drift
            if 25 <= day_temp <= 32 and day_hum > 60:
                effective_pest = min(150, int(effective_pest * 1.05))

        calc = calculate_risk(
            crop_stage=base_crop_stage,
            humidity=day_hum,
            temperature=day_temp,
            rainfall_prob=day_rain,
            disease_confidence=effective_confidence,
            disease_severity=disease_severity,
            is_healthy=is_healthy,
            pest_count=effective_pest,
            local_incidence_count=local_incidence_count,
        )

        forecast_days.append({
            "day": day_label,
            "weekday": weekday,
            "date": day_date.strftime("%Y-%m-%d"),
            "risk": calc["level_display"],
            "level": calc["level"],
            "value": calc["score"],
            "weather": {
                "temperature": round(day_temp, 1),
                "humidity": round(day_hum, 1),
                "rain_prob": round(day_rain, 1),
            },
            "summary": calc["summary"]
        })

    return forecast_days
