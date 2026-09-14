"""
ML Engine for AgriSmart Smart Irrigation — Native Django Module.
Uses the trained XGBoost champion pipeline with live WeatherAPI intelligence.
Self-contained in app/irrigation/ml/ with zero Flask dependencies.
"""

from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from .ml.constants import (
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    CLASS_DESCRIPTIONS,
    CLASS_NAMES,
    NUMERICAL_FEATURES,
)
from .ml.recommendations import generate_recommendation

PROJECT_ROOT: Path = Path(__file__).resolve().parent.parent.parent
MODEL_PATH: Path = PROJECT_ROOT / "model" / "irrigation" / "irrigation_pipeline.joblib"
if not MODEL_PATH.exists():
    # Fallback to internal app path if present
    MODEL_PATH = Path(__file__).resolve().parent / "ml" / "irrigation_pipeline.joblib"

# Module-level pipeline cache (loaded once per process)
_PIPELINE = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_pipeline():
    """Load and cache the trained scikit-learn pipeline."""
    global _PIPELINE
    if _PIPELINE is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained irrigation model not found at {MODEL_PATH}. "
                "Ensure model/irrigation/irrigation_pipeline.joblib is present."
            )
        _PIPELINE = joblib.load(MODEL_PATH)
    return _PIPELINE


_KEY_ALIASES: Dict[str, str] = {
    "crop ID": "crop",
    "crop_id": "crop",
    "crop_type": "crop",
    "cropType": "crop",
    "crop_name": "crop",
    "Crop": "crop",
    "soil": "soil_type",
    "soilType": "soil_type",
    "Soil_Type": "soil_type",
    "soil_name": "soil_type",
    "stage": "growth_stage",
    "growthStage": "growth_stage",
    "growth_phase": "growth_stage",
    "MOI": "soil_moisture",
    "moi": "soil_moisture",
    "moisture": "soil_moisture",
    "soilMoisture": "soil_moisture",
    "temp": "temperature",
    "Temp": "temperature",
    "hum": "humidity",
    "Humidity": "humidity",
}


def _normalize_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    return {_KEY_ALIASES.get(k, k): v for k, v in data.items()}


def _validate(data: Dict[str, Any]) -> Tuple[pd.DataFrame, list]:
    normalized = _normalize_keys(data)
    warnings: list = []

    missing = [f for f in ALL_FEATURES if f not in normalized]
    if missing:
        raise ValueError(f"Missing required feature(s): {missing}")

    try:
        moi = float(normalized["soil_moisture"])
        temp = float(normalized["temperature"])
        hum = float(normalized["humidity"])
    except (ValueError, TypeError) as exc:
        raise ValueError(f"Numerical features must be numbers: {exc}") from exc

    if not (0 <= moi <= 100):
        warnings.append(f"soil_moisture {moi} outside [0,100]; capped.")
        moi = max(0.0, min(100.0, moi))

    if not (0 <= hum <= 100):
        warnings.append(f"humidity {hum} outside [0,100]; capped.")
        hum = max(0.0, min(100.0, hum))

    if not (-10 <= temp <= 60):
        warnings.append(f"temperature {temp}°C is unusual for field operations.")

    row = {
        "crop": str(normalized["crop"]).strip(),
        "soil_type": str(normalized["soil_type"]).strip(),
        "growth_stage": str(normalized["growth_stage"]).strip(),
        "soil_moisture": moi,
        "temperature": temp,
        "humidity": hum,
    }
    return pd.DataFrame([row]), warnings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def predict_irrigation(
    data: Dict[str, Any],
    weather_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Core prediction function — identical logic to the Flask version.

    Parameters
    ----------
    data : dict
        Crop feature dictionary with keys:
        crop, soil_type, growth_stage, soil_moisture, temperature, humidity
    weather_context : dict, optional
        Keys: rain_probability, forecast_rainfall_mm, forecast_temp, forecast_humidity

    Returns
    -------
    dict
        Full prediction response (matches original Flask /api/irrigation/predict shape).
    """
    input_df, val_warnings = _validate(data)
    pipeline = _get_pipeline()

    pred_class_idx = int(pipeline.predict(input_df)[0])

    if hasattr(pipeline, "predict_proba"):
        probs_raw = pipeline.predict_proba(input_df)[0]
        confidence = float(np.max(probs_raw))
        probabilities = {
            CLASS_NAMES[i]: round(float(p), 4) for i, p in enumerate(probs_raw)
        }
    else:
        confidence = 1.0
        probabilities = {
            CLASS_NAMES[i]: (1.0 if i == pred_class_idx else 0.0) for i in range(3)
        }

    ml_result = {
        "predicted_class": pred_class_idx,
        "status": CLASS_NAMES.get(pred_class_idx, f"unknown_{pred_class_idx}"),
        "status_description": CLASS_DESCRIPTIONS.get(pred_class_idx, ""),
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
    }

    rec = generate_recommendation(ml_result, weather_context)

    return {
        "predicted_class": pred_class_idx,
        "status": ml_result["status"],
        "status_description": ml_result["status_description"],
        "confidence": round(confidence, 4),
        "confidence_level": rec["confidence_level"],
        "probabilities": probabilities,
        "action": rec["action"],
        "urgency": rec["urgency"],
        "recommendation": rec["recommendation"],
        "explanation": rec["explanation"],
        "weather_modified": rec["weather_modified"],
        "warnings": val_warnings,
    }


def get_metadata() -> Dict[str, Any]:
    """Return static metadata for the irrigation module (mirrors /meta endpoint)."""
    return {
        "module": "Smart Irrigation (AgriSmart)",
        "formulation": "3-class classification",
        "classes": {
            str(i): {"name": CLASS_NAMES[i], "description": CLASS_DESCRIPTIONS[i]}
            for i in range(3)
        },
        "required_features": ALL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "known_crops": ["Wheat", "Potato", "Carrot", "Tomato", "Chilli"],
        "known_soil_types": [
            "Black Soil", "Alluvial Soil", "Sandy Soil", "Red Soil",
            "Clay Soil", "Loam Soil", "Chalky Soil",
        ],
        "known_growth_stages": [
            "Germination", "Seedling Stage",
            "Vegetative Growth / Root or Tuber Development",
            "Flowering", "Pollination", "Fruit/Grain/Bulb Formation",
            "Maturation", "Harvest",
        ],
    }


def is_model_ready() -> bool:
    """Return True if the trained model file exists and can be loaded."""
    return MODEL_PATH.exists()


_EVAL_REPORT_PATH: Path = Path(__file__).resolve().parent / "ml" / "evaluation_report.json"
_INSIGHTS_CACHE = None


def get_insights() -> Dict[str, Any]:
    """Return evaluation metrics, benchmark comparison, and feature importance data."""
    global _INSIGHTS_CACHE
    if _INSIGHTS_CACHE is not None:
        return _INSIGHTS_CACHE

    if not _EVAL_REPORT_PATH.exists():
        return {
            "available": False,
            "message": "Evaluation report not found.",
        }

    import json
    try:
        with open(_EVAL_REPORT_PATH, "r", encoding="utf-8") as f:
            raw = json.load(f)

        dataset = raw.get("dataset_metadata", {})
        selected = raw.get("selected_model", {})
        multiclass = raw.get("multiclass_metrics_stratified", [])

        # Simplify metrics table for UI display
        benchmarks = []
        for m in multiclass:
            benchmarks.append({
                "model": m.get("model"),
                "accuracy": round(m.get("accuracy", 0) * 100, 2),
                "macro_f1": round(m.get("macro_f1", 0) * 100, 2),
                "weighted_f1": round(m.get("weighted_f1", 0) * 100, 2),
                "class_0_f1": round(m.get("class_0_f1", 0) * 100, 2),
                "class_1_f1": round(m.get("class_1_f1", 0) * 100, 2),
                "class_2_f1": round(m.get("class_2_f1", 0) * 100, 2),
            })

        top_features = selected.get("top_features", {})

        _INSIGHTS_CACHE = {
            "available": True,
            "model_name": selected.get("name", "XGBoost Classifier"),
            "dataset": {
                "total_rows_raw": dataset.get("total_rows_raw", 16411),
                "total_rows_cleaned": dataset.get("total_rows_cleaned", 16283),
                "duplicates_removed": dataset.get("duplicates_removed", 128),
                "target_distribution": {
                    "no_irrigation": dataset.get("target_distribution", {}).get("0", 8934),
                    "irrigation_required": dataset.get("target_distribution", {}).get("1", 6227),
                    "excess_water": dataset.get("target_distribution", {}).get("2", 1122),
                },
            },
            "top_features": [
                {"name": k.replace("_", " "), "importance": round(v * 100, 2)}
                for k, v in top_features.items()
            ],
            "benchmarks": benchmarks,
        }
        return _INSIGHTS_CACHE
    except Exception as ex:
        return {
            "available": False,
            "error": str(ex),
        }

