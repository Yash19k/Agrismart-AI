"""
Flask REST API for AgriSmart Weather Intelligence Service (Module C).

Endpoints:
- GET  /api/weather/health   — Service health check (no API key exposed)
- GET  /api/weather/context  — Normalized weather context for a location
- POST /api/weather/analyze  — Full weather intelligence with farm context

All endpoints are independently usable. No frontend dependency.
"""

import sys
from pathlib import Path
from flask import Flask, request, jsonify

# Add src to sys.path
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from weather_service import (
    get_context,
    validate_location,
    get_irrigation_weather_context,
    get_context_for_crop_recommendation
)
from intelligence import analyze, analyze_irrigation_weather
import config
from provider import get_provider_name
from config import WEATHER_API_KEY, WEATHER_PROVIDER_NAME

app = Flask(__name__)


# =====================================================================
# Health Check
# =====================================================================

@app.route("/api/weather/health", methods=["GET"])
def health():
    """Service health check. Never exposes the API key."""
    curr_key = getattr(config, "WEATHER_API_KEY", "") or os.getenv("WEATHER_API_KEY", "")
    key_configured = bool(curr_key and str(curr_key).strip())
    status = "ok" if key_configured else "degraded"
    code = 200 if key_configured else 503

    return jsonify({
        "status": status,
        "provider": get_provider_name(),
        "api_key_configured": key_configured,
        "service": "AgriSmart Weather Intelligence API"
    }), code


# =====================================================================
# Weather Context Endpoint
# =====================================================================

@app.route("/api/weather/context", methods=["GET"])
def weather_context():
    """
    GET /api/weather/context?lat=23.0225&lon=72.5714
    
    Returns the unified, normalized weather context for the given location.
    This is the primary reusable endpoint consumed by all modules.
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if lat is None or lon is None:
        return jsonify({
            "error": "Missing required query parameters: lat and lon.",
            "example": "/api/weather/context?lat=23.0225&lon=72.5714"
        }), 400

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    ctx = get_context(lat_f, lon_f)
    return jsonify(ctx.to_dict()), 200


# =====================================================================
# Weather Intelligence / Analyze Endpoint
# =====================================================================

@app.route("/api/weather/analyze", methods=["POST"])
def weather_analyze():
    """
    POST /api/weather/analyze
    
    Full weather intelligence analysis combining weather + farm context + optional
    irrigation ML prediction.
    
    Request body:
    {
        "latitude": 23.0225,
        "longitude": 72.5714,
        "farm": {
            "crop": "Tomato",
            "growth_stage": "Flowering",
            "soil_moisture": 24
        },
        "irrigation_prediction": {         // optional
            "predicted_class": 1,
            "status": "irrigation_required",
            "confidence": 0.91
        }
    }
    """
    if not request.is_json:
        return jsonify({"error": "Request body must be JSON."}), 400

    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({"error": "Malformed JSON payload."}), 400

    lat = data.get("latitude")
    lon = data.get("longitude")
    if lat is None or lon is None:
        return jsonify({
            "error": "Missing required fields: latitude and longitude."
        }), 400

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    farm_context = data.get("farm")
    irrigation_prediction = data.get("irrigation_prediction")

    weather = get_context(lat_f, lon_f)
    result = analyze(weather, farm_context, irrigation_prediction)

    return jsonify(result.to_dict()), 200


# =====================================================================
# Crop Recommendation Context Endpoint
# =====================================================================

@app.route("/api/weather/crop-context", methods=["GET"])
def crop_recommendation_context():
    """
    GET /api/weather/crop-context?lat=23.0225&lon=72.5714
    
    Returns a flat environmental context dictionary tailored for crop recommendation
    modules. Module A can consume this without knowing the weather provider.
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if lat is None or lon is None:
        return jsonify({"error": "Missing required query parameters: lat and lon."}), 400

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    ctx = get_context_for_crop_recommendation(lat_f, lon_f)
    return jsonify(ctx), 200


# =====================================================================
# Irrigation Weather Context Endpoint
# =====================================================================

@app.route("/api/weather/irrigation-context", methods=["GET"])
def irrigation_weather_context():
    """
    GET /api/weather/irrigation-context?lat=23.0225&lon=72.5714
    
    Returns weather context in the exact format Module B's recommendation engine expects:
    {rain_probability, forecast_rainfall_mm, forecast_temp, forecast_humidity}
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if lat is None or lon is None:
        return jsonify({"error": "Missing required query parameters: lat and lon."}), 400

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    ctx = get_irrigation_weather_context(lat_f, lon_f)
    if ctx is None:
        return jsonify({
            "weather_available": False,
            "message": "Weather data could not be retrieved."
        }), 200

    return jsonify(ctx), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
