"""
Comprehensive Edge Case and Boundary Testing.

Tests:
- All 5 crops
- All 7 soil types
- All 8 growth stages
- Boundary MOI values (0, 1, 10, 20, 50, 80, 100)
- Unknown categorical values (graceful handling via ignore strategy)
- Extreme temperature and humidity conditions
"""

import pytest
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from predict import predict_irrigation

ALL_CROPS = ["Wheat", "Potato", "Carrot", "Tomato", "Chilli"]
ALL_SOILS = [
    "Black Soil", "Alluvial Soil", "Sandy Soil", "Red Soil",
    "Clay Soil", "Loam Soil", "Chalky Soil"
]
ALL_STAGES = [
    "Germination", "Seedling Stage",
    "Vegetative Growth / Root or Tuber Development",
    "Flowering", "Pollination", "Fruit/Grain/Bulb Formation",
    "Maturation", "Harvest"
]


@pytest.mark.parametrize("crop", ALL_CROPS)
def test_all_crops_supported(crop):
    """Verify prediction works reliably for all 5 crops."""
    data = {
        "crop": crop,
        "soil_type": "Loam Soil",
        "growth_stage": "Flowering",
        "soil_moisture": 30,
        "temperature": 28,
        "humidity": 65.0
    }
    result = predict_irrigation(data)
    assert result["predicted_class"] in [0, 1, 2]
    assert result["status"] in ["no_irrigation", "irrigation_required", "excess_water"]


@pytest.mark.parametrize("soil", ALL_SOILS)
def test_all_soils_supported(soil):
    """Verify prediction works reliably for all 7 soil types."""
    data = {
        "crop": "Tomato",
        "soil_type": soil,
        "growth_stage": "Vegetative Growth / Root or Tuber Development",
        "soil_moisture": 35,
        "temperature": 26,
        "humidity": 70.0
    }
    result = predict_irrigation(data)
    assert result["predicted_class"] in [0, 1, 2]


@pytest.mark.parametrize("stage", ALL_STAGES)
def test_all_growth_stages_supported(stage):
    """Verify prediction works reliably for all 8 growth stages."""
    data = {
        "crop": "Wheat",
        "soil_type": "Clay Soil",
        "growth_stage": stage,
        "soil_moisture": 25,
        "temperature": 24,
        "humidity": 75.0
    }
    result = predict_irrigation(data)
    assert result["predicted_class"] in [0, 1, 2]


@pytest.mark.parametrize("moi", [0, 1, 10, 20, 50, 80, 100])
def test_moi_boundaries(moi):
    """Verify prediction handles boundary soil moisture values without crashing."""
    data = {
        "crop": "Potato",
        "soil_type": "Alluvial Soil",
        "growth_stage": "Seedling Stage",
        "soil_moisture": moi,
        "temperature": 27,
        "humidity": 60.0
    }
    result = predict_irrigation(data)
    assert result["predicted_class"] in [0, 1, 2]


def test_unknown_categorical_values_handled_gracefully():
    """Verify unseen crop, soil, and stage do not crash pipeline (handle_unknown='ignore')."""
    unseen_data = {
        "crop": "Maize",
        "soil_type": "Volcanic Soil",
        "growth_stage": "Late Maturity",
        "soil_moisture": 25,
        "temperature": 29,
        "humidity": 55.0
    }
    result = predict_irrigation(unseen_data)
    assert result["predicted_class"] in [0, 1, 2]
    assert "status" in result


def test_extreme_environmental_conditions():
    """Verify extreme hot/dry and extreme cold/humid inputs."""
    # Extreme heat wave & drought
    hot_dry = {
        "crop": "Chilli",
        "soil_type": "Sandy Soil",
        "growth_stage": "Flowering",
        "soil_moisture": 5,
        "temperature": 45,
        "humidity": 15.0
    }
    res_hot = predict_irrigation(hot_dry)
    assert res_hot["predicted_class"] in [0, 1, 2]

    # Extreme monsoon humidity & saturated soil
    wet = {
        "crop": "Tomato",
        "soil_type": "Clay Soil",
        "growth_stage": "Harvest",
        "soil_moisture": 95,
        "temperature": 20,
        "humidity": 90.0
    }
    res_wet = predict_irrigation(wet)
    assert res_wet["predicted_class"] in [0, 1, 2]
