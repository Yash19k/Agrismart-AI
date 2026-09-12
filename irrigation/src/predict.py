"""
Prediction Interface for AgriSmart Smart Irrigation.

Exposes:
- predict_irrigation(data, weather_context=None) -> Dict[str, Any]

Rules:
- Strictly utilizes ONLY features present in training data:
  ['crop', 'soil_type', 'growth_stage', 'soil_moisture', 'temperature', 'humidity']
- Weather forecast features are NOT passed into the ML model; they are passed only to the
  deterministic recommendation layer.
- Handles unknown categories gracefully.
- Performs robust boundary and type validation.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import pandas as pd
import numpy as np
import joblib

from preprocessing import (
    BASE_DIR,
    ALL_FEATURES,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    CLASS_NAMES,
    CLASS_DESCRIPTIONS
)
from recommendations import generate_recommendation

MODEL_PATH = BASE_DIR / "models" / "irrigation_pipeline.joblib"

# Cached pipeline
_CACHED_PIPELINE = None


def get_pipeline(model_path: Path = MODEL_PATH):
    """Load and cache the trained scikit-learn pipeline."""
    global _CACHED_PIPELINE
    if _CACHED_PIPELINE is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Trained model pipeline not found at {model_path}. "
                "Please run train.py first to build the model."
            )
        _CACHED_PIPELINE = joblib.load(model_path)
    return _CACHED_PIPELINE


def normalize_input_keys(data: Dict[str, Any]) -> Dict[str, Any]:
    """Map any legacy or alternative input keys to the canonical feature names."""
    key_aliases = {
        "crop ID": "crop",
        "crop_id": "crop",
        "Crop": "crop",
        "soil": "soil_type",
        "Soil_Type": "soil_type",
        "Seedling Stage": "growth_stage",
        "seedling_stage": "growth_stage",
        "stage": "growth_stage",
        "MOI": "soil_moisture",
        "moi": "soil_moisture",
        "moisture": "soil_moisture",
        "temp": "temperature",
        "Temp": "temperature",
        "hum": "humidity",
        "Humidity": "humidity"
    }
    normalized = {}
    for k, v in data.items():
        canonical = key_aliases.get(k, k)
        normalized[canonical] = v
    return normalized


def validate_features(data: Dict[str, Any]) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Validate and clean input feature dictionary.
    Returns:
    - Single-row DataFrame suitable for pipeline.predict
    - Validation metadata (warnings, flags)
    """
    normalized = normalize_input_keys(data)
    warnings = []

    # Check for missing required features
    missing = [f for f in ALL_FEATURES if f not in normalized]
    if missing:
        raise ValueError(f"Missing required feature(s): {missing}. Expected features: {ALL_FEATURES}")

    # Validate numerical fields
    try:
        moi = float(normalized["soil_moisture"])
        temp = float(normalized["temperature"])
        hum = float(normalized["humidity"])
    except (ValueError, TypeError) as e:
        raise ValueError(f"Numerical features must be numbers. Parsing error: {e}")

    # Bounds validation with defensive capping/warnings
    if moi < 0 or moi > 100:
        warnings.append(f"soil_moisture {moi} is outside standard [0, 100]% range; capped.")
        moi = max(0.0, min(100.0, moi))

    if hum < 0 or hum > 100:
        warnings.append(f"humidity {hum} is outside standard [0, 100]% range; capped.")
        hum = max(0.0, min(100.0, hum))

    if temp < -10 or temp > 60:
        warnings.append(f"temperature {temp}C is unusual for agricultural field operations.")

    row_data = {
        "crop": str(normalized["crop"]).strip(),
        "soil_type": str(normalized["soil_type"]).strip(),
        "growth_stage": str(normalized["growth_stage"]).strip(),
        "soil_moisture": moi,
        "temperature": temp,
        "humidity": hum
    }

    df = pd.DataFrame([row_data])
    return df, {"warnings": warnings}


def predict_irrigation(
    data: Dict[str, Any],
    weather_context: Optional[Dict[str, Any]] = None,
    model_path: Path = MODEL_PATH
) -> Dict[str, Any]:
    """
    Core prediction endpoint function.

    Takes agricultural feature dictionary and optional weather forecast.
    Produces ML classification and actionable agronomic recommendation.
    """
    input_df, val_meta = validate_features(data)
    pipeline = get_pipeline(model_path)

    # ML Inference strictly on input_df features
    pred_class_idx = int(pipeline.predict(input_df)[0])
    
    # Probabilities
    if hasattr(pipeline, "predict_proba"):
        probs_raw = pipeline.predict_proba(input_df)[0]
        confidence = float(np.max(probs_raw))
        probabilities = {
            CLASS_NAMES[i]: round(float(prob), 4)
            for i, prob in enumerate(probs_raw)
        }
    else:
        confidence = 1.0
        probabilities = {
            CLASS_NAMES[i]: 1.0 if i == pred_class_idx else 0.0
            for i in range(3)
        }

    status = CLASS_NAMES.get(pred_class_idx, f"unknown_class_{pred_class_idx}")
    status_description = CLASS_DESCRIPTIONS.get(pred_class_idx, "")

    ml_result = {
        "predicted_class": pred_class_idx,
        "status": status,
        "status_description": status_description,
        "confidence": round(confidence, 4),
        "probabilities": probabilities
    }

    # Pass ML output + weather into recommendation engine
    recommendation_info = generate_recommendation(ml_result, weather_context)

    # Combine into comprehensive response
    response = {
        "predicted_class": pred_class_idx,
        "status": status,
        "confidence": round(confidence, 4),
        "probabilities": probabilities,
        "action": recommendation_info["action"],
        "urgency": recommendation_info["urgency"],
        "recommendation": recommendation_info["recommendation"],
        "explanation": recommendation_info["explanation"],
        "weather_modified": recommendation_info["weather_modified"],
        "confidence_level": recommendation_info["confidence_level"],
        "warnings": val_meta["warnings"]
    }
    return response


if __name__ == "__main__":
    sample_input = {
        "crop": "Tomato",
        "soil_type": "Loam Soil",
        "growth_stage": "Flowering",
        "soil_moisture": 24,
        "temperature": 31,
        "humidity": 55
    }
    print("Testing predict interface with sample input:")
    try:
        res = predict_irrigation(sample_input)
        print("Prediction result:", res)
    except Exception as ex:
        print("Note: Run train.py first if model is not yet saved. Error was:", ex)
