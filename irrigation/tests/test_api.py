"""
Tests for Flask REST API endpoints and error responses.
"""

import sys
import json
import pytest
from pathlib import Path

# Add api and src to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / "src"
API_DIR = BASE_DIR / "api"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(API_DIR) not in sys.path:
    sys.path.insert(0, str(API_DIR))

from irrigation_api import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_health(client):
    """GET /api/irrigation/health returns 200 and healthy status."""
    response = client.get("/api/irrigation/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert data["pipeline_ready"] is True


def test_api_meta(client):
    """GET /api/irrigation/meta returns module metadata and classes."""
    response = client.get("/api/irrigation/meta")
    assert response.status_code == 200
    data = response.get_json()
    assert "classes" in data
    assert "0" in data["classes"] or 0 in data["classes"]
    assert "known_crops" in data
    assert "known_soil_types" in data


def test_api_predict_valid_request(client):
    """POST /api/irrigation/predict returns 200 with complete response schema."""
    payload = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Flowering",
        "soil_moisture": 24,
        "temperature": 31,
        "humidity": 55.0
    }
    response = client.post(
        "/api/irrigation/predict",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()
    assert "predicted_class" in data
    assert "status" in data
    assert "confidence" in data
    assert "recommendation" in data
    assert "action" in data
    assert "urgency" in data


def test_api_predict_with_weather_context(client):
    """POST /api/irrigation/predict with rain forecast modifies recommendation."""
    payload = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Flowering",
        "soil_moisture": 24,
        "temperature": 31,
        "humidity": 55.0,
        "weather_context": {
            "rain_probability": 0.85,
            "forecast_rainfall_mm": 12.0
        }
    }
    response = client.post(
        "/api/irrigation/predict",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["weather_modified"] is True
    assert "Delay irrigation" in data["recommendation"]


def test_api_predict_missing_feature(client):
    """POST with missing feature returns 400 Bad Request."""
    payload = {
        "crop": "Tomato",
        # missing soil_type and growth_stage
        "soil_moisture": 24,
        "temperature": 31,
        "humidity": 55.0
    }
    response = client.post(
        "/api/irrigation/predict",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_api_non_json_content_type(client):
    """POST with non-JSON content type returns 400."""
    response = client.post(
        "/api/irrigation/predict",
        data="plain text string",
        content_type="text/plain"
    )
    assert response.status_code == 400
