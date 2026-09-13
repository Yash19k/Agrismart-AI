"""
Agricultural Weather Intelligence Engine.

Takes normalized weather data + farm context and produces:
1. Structured boolean signals (rain_likely, high_heat, disease_favorable, etc.)
2. Ordered list of actionable agricultural recommendations
3. Irrigation-specific advice combining ML prediction with weather override

All thresholds are loaded from config.py (environment-variable configurable).
The rule engine is deterministic — no stochastic or ML decisions here.
"""

from typing import Dict, Any, Optional, List

from .schemas import (
    WeatherContext,
    WeatherSignals,
    WeatherAction,
    WeatherIntelligenceResult
)
from .config import (
    RAIN_PROBABILITY_DELAY_THRESHOLD,
    RAIN_PROBABILITY_REDUCE_THRESHOLD,
    RAINFALL_DELAY_THRESHOLD_MM,
    HIGH_HEAT_THRESHOLD_C,
    COLD_STRESS_THRESHOLD_C,
    HIGH_HUMIDITY_THRESHOLD,
    HIGH_WIND_THRESHOLD_MPS,
    WATER_STRESS_MOISTURE_THRESHOLD
)


def compute_signals(
    weather: WeatherContext,
    farm_context: Optional[Dict[str, Any]] = None
) -> WeatherSignals:
    """
    Derive structured agricultural signal flags from normalized weather.
    
    Thresholds are configurable via environment variables (see config.py).
    """
    current = weather.current
    forecast = weather.forecast
    farm = farm_context or {}
    soil_moisture = farm.get("soil_moisture")

    # Rain signals
    rain_prob_24h = forecast.rain_probability_24h or 0
    rain_mm_24h = forecast.rainfall_next_24h_mm or 0.0
    rain_likely = (rain_prob_24h >= RAIN_PROBABILITY_REDUCE_THRESHOLD) or (rain_mm_24h >= 2.0)
    rain_heavy = (rain_prob_24h >= RAIN_PROBABILITY_DELAY_THRESHOLD) or (rain_mm_24h >= RAINFALL_DELAY_THRESHOLD_MM)

    # Temperature signals
    temp = current.temperature_c
    high_heat = (temp is not None and temp >= HIGH_HEAT_THRESHOLD_C)
    cold_stress = (temp is not None and temp <= COLD_STRESS_THRESHOLD_C)

    # Humidity signal
    humidity = current.humidity_percent
    high_humidity = (humidity is not None and humidity >= HIGH_HUMIDITY_THRESHOLD)

    # Wind signal
    wind = current.wind_speed_mps
    high_wind = (wind is not None and wind >= HIGH_WIND_THRESHOLD_MPS)

    # Water stress — uses farm context if soil moisture is provided
    water_stress_risk = False
    if soil_moisture is not None:
        water_stress_risk = (float(soil_moisture) <= WATER_STRESS_MOISTURE_THRESHOLD) and not rain_heavy

    # Disease-favorable: warm + humid is classically favorable for fungal/bacterial pathogens
    disease_favorable = high_humidity and (temp is not None and temp >= 20)

    return WeatherSignals(
        rain_likely=rain_likely,
        rain_heavy=rain_heavy,
        high_heat=high_heat,
        cold_stress=cold_stress,
        high_humidity=high_humidity,
        high_wind=high_wind,
        water_stress_risk=water_stress_risk,
        disease_favorable_weather=disease_favorable
    )


def generate_actions(
    signals: WeatherSignals,
    farm_context: Optional[Dict[str, Any]] = None
) -> List[WeatherAction]:
    """
    Generate ordered list of agricultural actions from weather signals.
    Actions are deterministic and documented.
    """
    actions: List[WeatherAction] = []
    crop = (farm_context or {}).get("crop", "crop")

    # --- Rain / Irrigation Actions ---
    if signals.rain_heavy:
        actions.append(WeatherAction(
            type="irrigation",
            action="delay",
            reason="Significant rainfall is expected in the next 24 hours. Delay irrigation to avoid waterlogging and conserve water.",
            urgency="high"
        ))
    elif signals.rain_likely:
        actions.append(WeatherAction(
            type="irrigation",
            action="reduce",
            reason="Moderate rainfall probability detected. Consider reducing irrigation volume or delaying by 6 hours.",
            urgency="medium"
        ))

    # --- Heat Stress ---
    if signals.high_heat:
        actions.append(WeatherAction(
            type="heat_management",
            action="increase_monitoring",
            reason=f"High temperature detected (≥{HIGH_HEAT_THRESHOLD_C}°C). Increase water-stress monitoring. Consider evening/early-morning irrigation to reduce evaporative loss.",
            urgency="high"
        ))

    # --- Cold / Frost ---
    if signals.cold_stress:
        actions.append(WeatherAction(
            type="frost_protection",
            action="protect_crop",
            reason=f"Low temperature detected (≤{COLD_STRESS_THRESHOLD_C}°C). Frost-sensitive crops may require protective cover or micro-irrigation for frost mitigation.",
            urgency="critical"
        ))

    # --- Disease Risk ---
    if signals.disease_favorable_weather:
        actions.append(WeatherAction(
            type="disease_monitoring",
            action="monitor",
            reason=f"Warm, humid conditions (humidity ≥{HIGH_HUMIDITY_THRESHOLD}%) are favorable for fungal and bacterial crop diseases. Increase field scouting frequency.",
            urgency="medium"
        ))

    # --- Wind ---
    if signals.high_wind:
        actions.append(WeatherAction(
            type="spray_management",
            action="postpone_spraying",
            reason=f"High wind speed detected (≥{HIGH_WIND_THRESHOLD_MPS} m/s). Postpone foliar spraying to prevent drift. Sprinkler irrigation efficiency may also be reduced.",
            urgency="medium"
        ))

    # --- Water Stress ---
    if signals.water_stress_risk:
        actions.append(WeatherAction(
            type="irrigation",
            action="irrigate_soon",
            reason=f"Soil moisture is low (≤{WATER_STRESS_MOISTURE_THRESHOLD}%) and significant rainfall is not expected. Irrigate within the next 6-12 hours to prevent crop stress.",
            urgency="high"
        ))

    return actions


def analyze_irrigation_weather(
    weather_context: WeatherContext,
    irrigation_prediction: Dict[str, Any],
    farm_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Integration contract for Module B (Smart Irrigation).
    
    Combines ML irrigation prediction with live weather intelligence
    WITHOUT modifying the ML model's prediction itself.
    
    The ML model answers: "What class does the model predict?"
    This function answers: "Given the weather, what should the farmer actually do?"
    
    Input:
        irrigation_prediction: {
            "predicted_class": 1,
            "status": "irrigation_required",
            "confidence": 0.91
        }
        weather_context: WeatherContext from get_context()
        farm_context: optional dict with crop, growth_stage, soil_moisture
    
    Returns:
        {
            "final_action": "delay_irrigation" | "proceed_irrigation" | ...,
            "reason": "...",
            "weather_override": true/false,
            "original_prediction": {...}
        }
    """
    pred_class = irrigation_prediction.get("predicted_class", 0)
    confidence = float(irrigation_prediction.get("confidence", 0.5))

    # Compute weather signals taking into account farm context (soil_moisture, crop)
    signals = compute_signals(weather_context, farm_context)

    if not weather_context.weather_available:
        return {
            "final_action": irrigation_prediction.get("status", "unknown"),
            "reason": "Live weather data unavailable. Proceeding with ML prediction only.",
            "weather_override": False,
            "original_prediction": irrigation_prediction,
            "weather_available": False
        }

    # Decision matrix
    if pred_class == 1:
        # ML says: irrigation required
        if signals.rain_heavy:
            return {
                "final_action": "delay_irrigation",
                "reason": "Significant rainfall is expected. Delay irrigation to avoid waste and waterlogging.",
                "weather_override": True,
                "original_prediction": irrigation_prediction
            }
        elif signals.rain_likely:
            return {
                "final_action": "reduce_irrigation",
                "reason": "Moderate rainfall probability detected. Reduce irrigation volume or delay by 6 hours.",
                "weather_override": True,
                "original_prediction": irrigation_prediction
            }
        else:
            return {
                "final_action": "proceed_irrigation",
                "reason": "No significant rainfall expected. Irrigation can proceed as recommended by the model.",
                "weather_override": False,
                "original_prediction": irrigation_prediction
            }

    elif pred_class == 2:
        # ML says: excess water
        if signals.rain_heavy:
            return {
                "final_action": "drainage_alert",
                "reason": "Soil is already over-saturated AND heavy rain is forecast. Ensure drainage channels are clear.",
                "weather_override": True,
                "original_prediction": irrigation_prediction
            }
        else:
            return {
                "final_action": "avoid_irrigation",
                "reason": "Excess water detected. Avoid irrigation and allow natural drainage.",
                "weather_override": False,
                "original_prediction": irrigation_prediction
            }

    else:
        # ML says: no irrigation needed
        return {
            "final_action": "no_irrigation",
            "reason": "Soil moisture is adequate. No irrigation action required.",
            "weather_override": False,
            "original_prediction": irrigation_prediction
        }


def analyze(
    weather: WeatherContext,
    farm_context: Optional[Dict[str, Any]] = None,
    irrigation_prediction: Optional[Dict[str, Any]] = None
) -> WeatherIntelligenceResult:
    """
    Full weather intelligence analysis — the primary high-level API.
    
    Combines:
    1. Weather signals (boolean flags)
    2. Agricultural actions (deterministic rule engine)
    3. Optional irrigation-specific advice
    """
    signals = compute_signals(weather, farm_context)
    actions = generate_actions(signals, farm_context)

    irrigation_advice = None
    if irrigation_prediction:
        irrigation_advice = analyze_irrigation_weather(weather, irrigation_prediction, farm_context)

    return WeatherIntelligenceResult(
        weather=weather,
        signals=signals,
        actions=actions,
        irrigation_advice=irrigation_advice
    )
