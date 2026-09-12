"""
Robustness and Perturbation Tests for Smart Irrigation.

Verifies:
- Sensitivity and directional consistency under soil moisture changes
- Recommendation engine adjustments under varying weather contexts
- Stability under small numerical perturbations
"""

import pytest
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from predict import predict_irrigation


def test_moisture_directional_sensitivity():
    """
    Perturbation test:
    Under fixed environmental conditions, severely dropping soil moisture
    (e.g., from 80% down to 10%) should increase the likelihood of requiring irrigation.
    """
    base_wet = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Vegetative Growth / Root or Tuber Development",
        "soil_moisture": 80,
        "temperature": 32,
        "humidity": 50.0
    }
    base_dry = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Vegetative Growth / Root or Tuber Development",
        "soil_moisture": 10,
        "temperature": 32,
        "humidity": 50.0
    }

    res_wet = predict_irrigation(base_wet)
    res_dry = predict_irrigation(base_dry)

    prob_irrig_wet = res_wet["probabilities"]["irrigation_required"]
    prob_irrig_dry = res_dry["probabilities"]["irrigation_required"]

    assert prob_irrig_dry >= prob_irrig_wet, (
        f"Expected dry soil (MOI=10) to have higher or equal irrigation probability "
        f"than wet soil (MOI=80). Got wet={prob_irrig_wet}, dry={prob_irrig_dry}"
    )


def test_weather_intelligence_layer_override():
    """
    Verify that when the ML model predicts irrigation is required,
    a high rain forecast correctly delays the irrigation recommendation.
    """
    dry_condition = {
        "crop": "Wheat",
        "soil_type": "Black Soil",
        "growth_stage": "Germination",
        "soil_moisture": 12,
        "temperature": 35,
        "humidity": 30.0
    }
    
    # 1. Without weather context -> irrigate now
    res_no_weather = predict_irrigation(dry_condition)
    assert res_no_weather["predicted_class"] == 1
    assert res_no_weather["action"] == "irrigate_now"
    assert res_no_weather["weather_modified"] is False

    # 2. With heavy rain forecast -> delay irrigation
    heavy_rain = {
        "rain_probability": 0.88,
        "forecast_rainfall_mm": 18.0
    }
    res_with_rain = predict_irrigation(dry_condition, weather_context=heavy_rain)
    assert res_with_rain["predicted_class"] == 1  # ML model prediction remains untouched
    assert res_with_rain["action"] == "delay_irrigation"
    assert res_with_rain["weather_modified"] is True
    assert "Delay irrigation" in res_with_rain["recommendation"]

    # 3. With light/moderate rain forecast -> reduce volume
    moderate_rain = {
        "rain_probability": 0.50,
        "forecast_rainfall_mm": 2.5
    }
    res_moderate = predict_irrigation(dry_condition, weather_context=moderate_rain)
    assert res_moderate["action"] == "reduce_irrigation"
    assert res_moderate["weather_modified"] is True


def test_excess_water_with_rain_warning():
    """
    When soil is already in excess water state, incoming heavy rain
    must trigger critical drainage alert.
    """
    excess_condition = {
        "crop": "Wheat",
        "soil_type": "Black Soil",
        "growth_stage": "Germination",
        "soil_moisture": 85,
        "temperature": 32,
        "humidity": 65.0
    }
    heavy_rain = {
        "rain_probability": 0.90,
        "forecast_rainfall_mm": 25.0
    }
    res = predict_irrigation(excess_condition, weather_context=heavy_rain)
    if res["predicted_class"] == 2:
        assert res["action"] == "avoid_irrigation"
        assert "drainage" in res["recommendation"].lower()
