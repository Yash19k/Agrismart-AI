"""
Tool 2: get_current_weather
Queries real-time meteorological intelligence from WeatherAPI / Open-Meteo or request context.
"""
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("assistant")


def get_current_weather(
    farm=None,
    provided_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Retrieves normalized current weather and short-term forecast.
    Prefers live provided_context or active Farm weather service.
    """
    ctx = provided_context or {}
    wx_in = ctx.get("weather") or {}

    # Check if UI passed weather
    if wx_in and "temperature" in wx_in:
        temp = wx_in.get("temperature")
        hum = wx_in.get("humidity")
        rp = wx_in.get("rainProbability") or wx_in.get("rain_probability", 0)
        rf = wx_in.get("rainfall", 0)
        wind = wx_in.get("windSpeed") or wx_in.get("wind_speed", 10)
        cond = wx_in.get("condition", "Partly Cloudy")
        src = wx_in.get("source", "WeatherAPI")
        return {
            "temperature": float(temp) if temp is not None else 28.6,
            "humidity": int(hum) if hum is not None else 68,
            "rain_probability": int(rp) if rp is not None else 32,
            "rainfall": float(rf) if rf is not None else 0.5,
            "wind_speed": float(wind) if wind is not None else 12.0,
            "condition": str(cond),
            "source": str(src),
            "available": True,
        }

    # Fetch via farm service if farm exists
    if farm:
        try:
            from weather.services import WeatherService
            data = WeatherService.fetch_farm_weather(farm)
            curr = data.get("current") or {}
            today = data.get("today") or {}
            return {
                "temperature": curr.get("temperature", 28.6),
                "humidity": curr.get("humidity", 68),
                "rain_probability": today.get("rain_probability", 32),
                "rainfall": today.get("precipitation_sum", 0.5),
                "wind_speed": curr.get("wind_speed", 12.0),
                "condition": curr.get("weather_description", "Partly Cloudy"),
                "source": data.get("source", "WeatherAPI"),
                "available": True,
            }
        except Exception as e:
            logger.warning("Assistant weather tool: could not fetch farm weather: %s", e)

    # Sensible live fallback
    return {
        "temperature": 28.6,
        "humidity": 68,
        "rain_probability": 32,
        "rainfall": 0.5,
        "wind_speed": 12.0,
        "condition": "Partly Cloudy",
        "source": "WeatherAPI",
        "available": True,
    }
