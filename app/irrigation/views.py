"""
Django REST Framework views for the Smart Irrigation module.

Endpoints (all under /api/irrigation/):
  GET  health/        — pipeline readiness check
  GET  meta/          — supported crops, soil types, growth stages, class info
  GET  insights/      — dataset statistics, feature importances, and model benchmark comparisons
  GET  live-weather/  — fetch live weather context from WeatherAPI for farm or coordinates
  GET  history/       — list user's past irrigation recommendations
  POST predict/       — run ML inference + agronomic recommendation + save record
"""

import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm
from weather.services import WeatherService, WeatherServiceError

from .ml_engine import get_insights, get_metadata, is_model_ready, predict_irrigation
from .models import SmartIrrigationRecord

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# GET /api/irrigation/health/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Returns pipeline readiness.
    200 if model file is present and loadable, 503 otherwise.
    """
    ready = is_model_ready()
    payload = {
        "status": "healthy" if ready else "degraded",
        "service": "AgriSmart Smart Irrigation",
        "pipeline_ready": ready,
    }
    http_status = status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return Response(payload, status=http_status)


# ---------------------------------------------------------------------------
# GET /api/irrigation/meta/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def get_meta(request):
    """Returns metadata: supported crops, soil types, growth stages, class definitions."""
    return Response(get_metadata(), status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# GET /api/irrigation/insights/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def get_insights_view(request):
    """Returns dataset metrics, champion XGBoost feature importance, and benchmarks."""
    return Response(get_insights(), status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# GET /api/irrigation/live-weather/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def get_live_weather(request):
    """
    Fetch live weather data from WeatherAPI (key: 093b53ee057a4907ab9104918261209).
    Query params:
        farm_id: optional Farm ID
        lat, lon: optional latitude and longitude coordinates
    """
    farm_id = request.query_params.get("farm_id")
    lat = request.query_params.get("lat")
    lon = request.query_params.get("lon")

    try:
        user = request.user if request.user and request.user.is_authenticated else None
        farm = None
        if farm_id:
            if user:
                farm = Farm.objects.filter(id=farm_id, user=user).first()
            if not farm:
                farm = Farm.objects.filter(id=farm_id).first()

        if farm:
            wdata = WeatherService.fetch_farm_weather(farm)
            location_label = farm.farm_name
            soil_lat, soil_lon = farm.latitude, farm.longitude
        elif lat and lon:
            soil_lat, soil_lon = float(lat), float(lon)
            wdata = WeatherService.fetch_coordinates(soil_lat, soil_lon)
            location_label = f"{round(soil_lat, 2)}, {round(soil_lon, 2)}"
        elif user:
            farm = Farm.objects.filter(user=user).first()
            if farm:
                wdata = WeatherService.fetch_farm_weather(farm)
                location_label = farm.farm_name
                soil_lat, soil_lon = farm.latitude, farm.longitude
            else:
                soil_lat, soil_lon = 20.5937, 78.9629
                wdata = WeatherService.fetch_coordinates(soil_lat, soil_lon)
                location_label = "Field Station (India)"
        else:
            soil_lat, soil_lon = 20.5937, 78.9629
            wdata = WeatherService.fetch_coordinates(soil_lat, soil_lon)
            location_label = "Field Station (India)"

        cur = wdata.get("current", {})
        soil = wdata.get("soil", {})
        today = wdata.get("today", {})
        meta = wdata.get("meta", {})

        # WeatherAPI does not expose the soil-moisture field used by the
        # irrigation model, so supplement it from Open-Meteo when necessary.
        soil_moisture = soil.get("moisture_percent")
        if soil_moisture is None:
            try:
                soil_data = WeatherService.fetch_coordinates(
                    soil_lat, soil_lon, provider="open-meteo"
                )
                soil_moisture = (soil_data.get("soil") or {}).get("moisture_percent")
            except Exception as e:
                logger.warning("Soil moisture supplement unavailable: %s", e)

        # Robust agronomic estimate if neither provider had a direct soil moisture reading
        if soil_moisture is None:
            hum = cur.get("humidity", 60) or 60
            precip = today.get("rainfall", 0) or cur.get("precipitation", 0) or 0
            soil_moisture = round(min(52.0, max(18.0, (float(hum) * 0.32) + (float(precip) * 2.5))), 1)

        rain_prob = today.get("rain_probability")
        if isinstance(rain_prob, (int, float)) and rain_prob > 1:
            rain_prob_normalized = round(rain_prob / 100.0, 2)
        elif isinstance(rain_prob, (int, float)):
            rain_prob_normalized = float(rain_prob)
        else:
            rain_prob_normalized = None

        return Response({
            "temperature": cur.get("temperature"),
            "humidity": cur.get("humidity"),
            "precipitation": cur.get("precipitation"),
            "condition": cur.get("condition"),
            "rain_probability": rain_prob_normalized,
            "rain_probability_pct": (
                int(rain_prob_normalized * 100)
                if rain_prob_normalized is not None else None
            ),
            "forecast_rainfall_mm": today.get("rainfall"),
            "forecast": (wdata.get("daily") or [])[:3],
            "soil_moisture": soil_moisture,
            "location": location_label,
            "provider": meta.get("provider"),
        }, status=status.HTTP_200_OK)

    except WeatherServiceError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as exc:
        logger.exception("Failed to fetch live weather: %s", exc)
        return Response({"error": str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# GET /api/irrigation/history/
# ---------------------------------------------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def get_history(request):
    """Returns the user's latest 20 smart irrigation recommendations."""
    if not (request.user and request.user.is_authenticated):
        return Response([], status=status.HTTP_200_OK)
    records = SmartIrrigationRecord.objects.filter(user=request.user)[:20]
    data = []
    for r in records:
        data.append({
            "id": r.id,
            "crop": r.crop,
            "soil_type": r.soil_type,
            "growth_stage": r.growth_stage,
            "soil_moisture": r.soil_moisture,
            "temperature": r.temperature,
            "humidity": r.humidity,
            "predicted_class": r.predicted_class,
            "status": r.status,
            "action": r.action,
            "urgency": r.urgency,
            "confidence": r.confidence,
            "recommendation": r.recommendation,
            "explanation": r.explanation,
            "weather_modified": r.weather_modified,
            "created_at": r.created_at.strftime("%b %d, %Y %I:%M %p"),
        })
    return Response(data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# POST /api/irrigation/predict/
# ---------------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def predict(request):
    """
    Run the irrigation ML model (trained XGBoost champion pipeline) and return an agronomic recommendation.
    If authenticated, also saves a SmartIrrigationRecord.
    """
    data = request.data
    if not isinstance(data, dict):
        return Response(
            {"error": "Request body must be a JSON object."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    weather_context = data.get("weather_context", None)
    farm_id = data.get("farm_id", None)

    feature_data = {
        k: v for k, v in data.items()
        if k not in ("weather_context", "farm_id")
    }

    try:
        result = predict_irrigation(feature_data, weather_context=weather_context)
        user_id = request.user.id if request.user and request.user.is_authenticated else "guest"
        logger.info(
            "Irrigation prediction: user=%s action=%s confidence=%.2f",
            user_id,
            result.get("action"),
            result.get("confidence", 0),
        )

        # Save record if user is authenticated
        if request.user and request.user.is_authenticated:
            farm = None
            if farm_id:
                farm = Farm.objects.filter(id=farm_id, user=request.user).first()

            rain_p = 0.0
            rain_mm = 0.0
            if weather_context and isinstance(weather_context, dict):
                rain_p = float(weather_context.get("rain_probability", 0.0) or 0.0)
                rain_mm = float(weather_context.get("forecast_rainfall_mm", 0.0) or 0.0)

            record = SmartIrrigationRecord.objects.create(
                user=request.user,
                farm=farm,
                crop=str(data.get("crop", "")),
                soil_type=str(data.get("soil_type", "")),
                growth_stage=str(data.get("growth_stage", "")),
                soil_moisture=float(data.get("soil_moisture", 0)),
                temperature=float(data.get("temperature", 0)),
                humidity=float(data.get("humidity", 0)),
                rain_probability=rain_p,
                forecast_rainfall_mm=rain_mm,
                predicted_class=result["predicted_class"],
                status=result["status"],
                action=result["action"],
                urgency=result["urgency"],
                confidence=result["confidence"],
                recommendation=result["recommendation"],
                explanation=result["explanation"],
                weather_modified=result["weather_modified"],
            )
            result["record_id"] = record.id
        else:
            result["record_id"] = None

        return Response(result, status=status.HTTP_200_OK)

    except ValueError as exc:
        return Response(
            {"error": "Validation error", "message": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except FileNotFoundError as exc:
        return Response(
            {"error": "Model not available", "message": str(exc)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as exc:
        logger.exception("Irrigation prediction failed: %s", exc)
        return Response(
            {"error": "Prediction failure", "message": str(exc)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
