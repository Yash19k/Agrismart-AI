"""
Flask REST API for AgriSmart Smart Irrigation Module.

Endpoints:
- POST /api/irrigation/predict : Run inference and generate agronomic recommendation
- GET  /api/irrigation/health  : Service health check and pipeline status
- GET  /api/irrigation/meta    : Metadata, supported categories, and class definitions
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify

# Add src to sys.path to allow clean imports
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from predict import predict_irrigation, MODEL_PATH
from preprocessing import (
    CLASS_NAMES,
    CLASS_DESCRIPTIONS,
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES
)

app = Flask(__name__)


@app.route("/api/irrigation/health", methods=["GET"])
def health_check():
    """Health check endpoint confirming pipeline readiness."""
    model_exists = os.path.exists(MODEL_PATH)
    status_code = 200 if model_exists else 503
    return jsonify({
        "status": "healthy" if model_exists else "degraded",
        "service": "AgriSmart Smart Irrigation API",
        "pipeline_ready": model_exists,
        "model_file": str(MODEL_PATH.name)
    }), status_code


@app.route("/api/irrigation/meta", methods=["GET"])
def get_metadata():
    """Returns supported categorical options, required features, and class definitions."""
    return jsonify({
        "module": "Smart Irrigation (AgriSmart Bonus)",
        "formulation": "3-class classification",
        "classes": {
            0: {"name": CLASS_NAMES[0], "description": CLASS_DESCRIPTIONS[0]},
            1: {"name": CLASS_NAMES[1], "description": CLASS_DESCRIPTIONS[1]},
            2: {"name": CLASS_NAMES[2], "description": CLASS_DESCRIPTIONS[2]}
        },
        "required_features": ALL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "known_crops": ["Wheat", "Potato", "Carrot", "Tomato", "Chilli"],
        "known_soil_types": [
            "Black Soil", "Alluvial Soil", "Sandy Soil", "Red Soil",
            "Clay Soil", "Loam Soil", "Chalky Soil"
        ],
        "known_growth_stages": [
            "Germination", "Seedling Stage",
            "Vegetative Growth / Root or Tuber Development",
            "Flowering", "Pollination", "Fruit/Grain/Bulb Formation",
            "Maturation", "Harvest"
        ],
        "weather_intelligence_keys": ["rain_probability", "forecast_rainfall_mm", "forecast_temp", "forecast_humidity"]
    }), 200


@app.route("/api/irrigation/predict", methods=["POST"])
def predict():
    """
    Main prediction endpoint.
    Accepts JSON body with crop features and optional weather_context.
    """
    if not request.is_json:
        return jsonify({
            "error": "Invalid Content-Type. Request body must be JSON."
        }), 400

    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({
            "error": "Malformed JSON payload. Expected JSON object."
        }), 400

    # Extract optional weather context if supplied inside payload
    weather_context = data.pop("weather_context", None)

    try:
        result = predict_irrigation(data, weather_context=weather_context)
        return jsonify(result), 200
    except ValueError as ve:
        return jsonify({
            "error": "Validation error",
            "message": str(ve)
        }), 400
    except FileNotFoundError as fe:
        return jsonify({
            "error": "Model not available",
            "message": str(fe)
        }), 503
    except Exception as ex:
        return jsonify({
            "error": "Prediction failure",
            "message": str(ex)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
