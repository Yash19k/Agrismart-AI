"""
Unit tests for predict.py and model pipeline loading.
"""

import os
import pytest
import sys
from pathlib import Path

# Add src to sys.path
SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from predict import predict_irrigation, get_pipeline, MODEL_PATH


def test_pipeline_exists_and_loads():
    """Verify that the trained pipeline file exists and loads properly."""
    assert os.path.exists(MODEL_PATH), "Pipeline file does not exist"
    pipeline = get_pipeline()
    assert pipeline is not None
    assert hasattr(pipeline, "predict")


def test_valid_prediction_structure():
    """Verify prediction return schema on standard input."""
    data = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Flowering",
        "soil_moisture": 25,
        "temperature": 30,
        "humidity": 60.0
    }
    result = predict_irrigation(data)
    
    assert "predicted_class" in result
    assert result["predicted_class"] in [0, 1, 2]
    assert "status" in result
    assert result["status"] in ["no_irrigation", "irrigation_required", "excess_water"]
    assert "confidence" in result
    assert 0.0 <= result["confidence"] <= 1.0
    assert "probabilities" in result
    assert "recommendation" in result
    assert isinstance(result["recommendation"], str)
    assert len(result["recommendation"]) > 0
    assert "action" in result
    assert "urgency" in result


def test_legacy_column_name_normalization():
    """Ensure dataset aliases like MOI, temp, crop ID, Seedling Stage are supported."""
    legacy_data = {
        "crop ID": "Wheat",
        "soil_type": "Black Soil",
        "Seedling Stage": "Germination",
        "MOI": 15,
        "temp": 28,
        "humidity": 70.0
    }
    result = predict_irrigation(legacy_data)
    assert result["predicted_class"] in [0, 1, 2]


def test_missing_required_feature_raises_error():
    """Missing a required feature must raise a descriptive ValueError."""
    bad_data = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        # growth_stage is missing
        "soil_moisture": 25,
        "temperature": 30,
        "humidity": 60.0
    }
    with pytest.raises(ValueError) as excinfo:
        predict_irrigation(bad_data)
    assert "Missing required feature" in str(excinfo.value)


def test_invalid_numerical_type_raises_error():
    """Non-numeric string in numerical field must raise ValueError."""
    bad_data = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Flowering",
        "soil_moisture": "NOT_A_NUMBER",
        "temperature": 30,
        "humidity": 60.0
    }
    with pytest.raises(ValueError) as excinfo:
        predict_irrigation(bad_data)
    assert "Numerical features must be numbers" in str(excinfo.value)
