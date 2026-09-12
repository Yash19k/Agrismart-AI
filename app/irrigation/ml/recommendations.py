"""
Deterministic Recommendation and Weather Intelligence Engine.
Combines XGBoost ML model predictions with live weather context.
Pure Python with zero external Flask dependencies.
"""

from typing import Dict, Any, Optional

CONFIDENCE_HIGH_THRESHOLD = 0.75
CONFIDENCE_BORDERLINE_THRESHOLD = 0.55


def evaluate_weather_context(weather_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Parse and standardize weather context inputs.
    Supported keys:
    - rain_probability: float (0.0-1.0) or int (0-100)
    - forecast_rainfall_mm: float (expected mm of rain in next 6-24 hrs)
    - forecast_temp: float (C)
    - forecast_humidity: float (%)
    """
    if not weather_context:
        return {
            "has_weather": False,
            "rain_prob": 0.0,
            "forecast_rain_mm": 0.0,
            "rain_expected": False,
            "rain_significant": False,
            "rain_moderate": False,
        }

    rain_prob = weather_context.get("rain_probability", 0.0)
    if rain_prob > 1.0:
        rain_prob = rain_prob / 100.0
    rain_prob = max(0.0, min(1.0, float(rain_prob)))

    forecast_rain_mm = float(weather_context.get("forecast_rainfall_mm", 0.0) or 0.0)

    rain_significant = (rain_prob >= 0.70) or (forecast_rain_mm >= 5.0)
    rain_moderate = (0.40 <= rain_prob < 0.70) or (1.0 <= forecast_rain_mm < 5.0)

    return {
        "has_weather": True,
        "rain_prob": rain_prob,
        "forecast_rain_mm": forecast_rain_mm,
        "rain_significant": rain_significant,
        "rain_moderate": rain_moderate,
    }


def generate_recommendation(
    ml_prediction: Dict[str, Any],
    weather_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Produces deterministic agronomic advice combining ML prediction with weather context.
    """
    predicted_class = ml_prediction.get("predicted_class", 0)
    confidence = float(ml_prediction.get("confidence", 0.5))
    weather = evaluate_weather_context(weather_context)

    is_high_conf = confidence >= CONFIDENCE_HIGH_THRESHOLD
    is_borderline = confidence < CONFIDENCE_BORDERLINE_THRESHOLD

    if predicted_class == 1:
        # --- CLASS 1: IRRIGATION REQUIRED ---
        if weather["rain_significant"]:
            action = "delay_irrigation"
            urgency = "low"
            prob_pct = int(weather["rain_prob"] * 100)
            recommendation = (
                f"Delay irrigation — significant rainfall expected (rain probability: {prob_pct}%, "
                f"forecast: {weather['forecast_rain_mm']:.1f} mm). Re-evaluate soil moisture after rain."
            )
            explanation = "Crop requires water, but upcoming natural precipitation will suffice, avoiding unnecessary pumping and water waste."
            weather_modified = True

        elif weather["rain_moderate"]:
            action = "reduce_irrigation"
            urgency = "medium"
            prob_pct = int(weather["rain_prob"] * 100)
            recommendation = (
                f"Reduce irrigation volume — light rainfall is expected (rain probability: {prob_pct}%). "
                f"Apply a light watering now or wait 6 hours for weather confirmation."
            )
            explanation = "Moderate precipitation probability suggests applying a partial irrigation cycle to preserve soil aeration while avoiding drought stress."
            weather_modified = True

        else:
            weather_modified = False
            if is_borderline:
                action = "monitor_closely"
                urgency = "medium"
                recommendation = "Borderline irrigation condition — soil moisture is near threshold. Monitor closely and irrigate if moisture drops further."
                explanation = f"The model indicates irrigation may be beneficial, but confidence ({confidence*100:.1f}%) is moderate."
            else:
                action = "irrigate_now"
                urgency = "high"
                recommendation = "Irrigation is required. Apply standard irrigation volume for this crop and growth stage."
                explanation = f"Soil moisture is deficient for the current crop and environmental demand (confidence: {confidence*100:.1f}%)."

    elif predicted_class == 2:
        # --- CLASS 2: EXCESS WATER ---
        action = "avoid_irrigation"
        urgency = "warning"
        weather_modified = False

        if weather["rain_significant"]:
            recommendation = (
                "Excess water detected — STRICTLY AVOID irrigation. Heavy rain is also forecast; "
                "ensure drainage channels and ditches are clear to prevent crop waterlogging and root asphyxiation."
            )
            weather_modified = True
            explanation = "Soil moisture is already at saturation or excess levels and impending rain could cause critical hypoxia or root rot."
        else:
            recommendation = "Excess water detected — avoid irrigation. Allow field to drain and verify soil aeration."
            explanation = f"High soil moisture level detected (confidence: {confidence*100:.1f}%). Additional water risks fungal development and nutrient leaching."

    else:
        # --- CLASS 0: NO IRRIGATION REQUIRED ---
        action = "no_irrigation"
        urgency = "low"
        weather_modified = False

        if is_borderline:
            recommendation = "No irrigation needed immediately, but soil moisture is approaching lower threshold. Inspect again tomorrow."
            explanation = f"Current moisture levels satisfy crop demand, but borderline confidence ({confidence*100:.1f}%) suggests trending toward depletion."
        else:
            recommendation = "No irrigation required at this time. Soil moisture levels are within optimal range."
            explanation = f"Adequate soil moisture detected for current atmospheric conditions (confidence: {confidence*100:.1f}%)."

    return {
        "action": action,
        "urgency": urgency,
        "recommendation": recommendation,
        "explanation": explanation,
        "weather_modified": weather_modified,
        "confidence_level": "high" if is_high_conf else ("borderline" if is_borderline else "moderate"),
    }
