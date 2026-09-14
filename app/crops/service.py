import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger("crops.service")

CROP_DICT = {
    1: 'rice', 2: 'maize', 3: 'jute', 4: 'cotton', 5: 'coconut',
    6: 'papaya', 7: 'orange', 8: 'apple', 9: 'muskmelon', 10: 'watermelon',
    11: 'grapes', 12: 'mango', 13: 'banana', 14: 'pomegranate', 15: 'lentil',
    16: 'blackgram', 17: 'mungbean', 18: 'mothbeans', 19: 'pigeonpeas',
    20: 'kidneybeans', 21: 'chickpea', 22: 'coffee'
}

REGIONAL_PRESETS = [
    {
        "id": "gangetic_alluvial",
        "name": "Indo-Gangetic Alluvial Plain",
        "region": "Punjab, UP, Bihar, West Bengal",
        "description": "Fertile deep silty loam with balanced organic matter and good canal irrigation.",
        "params": {
            "N": 90, "P": 42, "K": 43,
            "temperature": 23.5, "humidity": 80.0,
            "ph": 6.8, "rainfall": 190.0
        }
    },
    {
        "id": "deccan_black_cotton",
        "name": "Deccan Black Cotton Soil (Regur)",
        "region": "Maharashtra, Gujarat, MP",
        "description": "Heavy clayey vertisol with high moisture retention and rich mineral potassium.",
        "params": {
            "N": 115, "P": 48, "K": 22,
            "temperature": 26.0, "humidity": 78.0,
            "ph": 7.2, "rainfall": 88.0
        }
    },
    {
        "id": "coastal_humid",
        "name": "Coastal Tropical Belt",
        "region": "Kerala, Coastal Karnataka, Tamil Nadu",
        "description": "High relative humidity, porous sandy loam, and prolonged tropical precipitation.",
        "params": {
            "N": 20, "P": 25, "K": 30,
            "temperature": 27.5, "humidity": 94.0,
            "ph": 6.1, "rainfall": 175.0
        }
    },
    {
        "id": "arid_semiarid",
        "name": "Semi-Arid Dryland",
        "region": "Rajasthan, North Gujarat, Rayalaseema",
        "description": "Sandy loam with low organic nitrogen, moderate phosphorus, and low erratic monsoon.",
        "params": {
            "N": 22, "P": 75, "K": 20,
            "temperature": 29.5, "humidity": 55.0,
            "ph": 7.5, "rainfall": 52.0
        }
    },
    {
        "id": "temperate_himalayan",
        "name": "Himalayan Hill Valley",
        "region": "Himachal Pradesh, Kashmir, Uttarakhand",
        "description": "Cool temperate upland soil with high chill factor and well-drained gravelly loam.",
        "params": {
            "N": 25, "P": 130, "K": 195,
            "temperature": 18.0, "humidity": 65.0,
            "ph": 6.0, "rainfall": 115.0
        }
    }
]


class CropRecommendationService:
    """
    Production inference service for Crop Recommendation.
    Singleton pattern ensures single memory footprint.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(CropRecommendationService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False) and getattr(self, "model", None) is not None:
            return

        # Resolve paths
        script_dir = Path(__file__).resolve().parent
        app_dir = script_dir.parent  # app
        project_root = app_dir.parent  # Agrismart-AI

        self.model_dir = project_root / "model" / "crop_recommendation"
        self.model_path = self.model_dir / "crop_model.pkl"
        self.minmax_path = self.model_dir / "crop_minmax_scaler.pkl"
        self.standard_path = self.model_dir / "crop_standard_scaler.pkl"
        self.metadata_path = self.model_dir / "crop_metadata.json"

        # Fallback to root model if model_dir files not found
        if not self.model_path.exists():
            self.model_path = project_root / "crop_model.pkl"
        if not self.minmax_path.exists():
            self.minmax_path = project_root / "crop_minmax_scaler.pkl"
        if not self.standard_path.exists():
            self.standard_path = project_root / "crop_standard_scaler.pkl"

        self.model = None
        self.minmax_scaler = None
        self.standard_scaler = None
        self.metadata = {}

        self._load_artifacts()
        self._initialized = True

    def _load_artifacts(self):
        """Loads model, scalers, and metadata."""
        logger.info("Loading Crop Recommendation model from %s", self.model_path)
        if not self.model_path.exists():
            raise FileNotFoundError(f"Crop model not found at {self.model_path}")

        self.model = joblib.load(self.model_path)
        self.minmax_scaler = joblib.load(self.minmax_path)
        self.standard_scaler = joblib.load(self.standard_path)

        if self.metadata_path.exists():
            with open(self.metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
        else:
            self.metadata = {}

        logger.info(
            "CropRecommendationService initialized successfully | Total classes: %d",
            len(self.model.classes_)
        )

    def evaluate_soil_health(self, n: float, p: float, k: float, ph: float) -> Dict[str, Any]:
        """Diagnoses soil N-P-K & pH status."""
        # Nitrogen status (Standard Indian ICAR guidelines kg/ha)
        if n < 30:
            n_status = {"level": "Low / Deficient", "status": "low", "advice": "Apply farmyard manure or neem-coated urea in split applications."}
        elif n <= 90:
            n_status = {"level": "Optimal / Balanced", "status": "optimal", "advice": "Maintain steady organic matter recycling."}
        else:
            n_status = {"level": "High / Surplus", "status": "high", "advice": "Avoid excess nitrogen fertilizer to prevent vegetative lodging and pest susceptibility."}

        # Phosphorus status
        if p < 25:
            p_status = {"level": "Low / Deficient", "status": "low", "advice": "Apply single superphosphate (SSP) or rock phosphate near root zone."}
        elif p <= 75:
            p_status = {"level": "Optimal / Balanced", "status": "optimal", "advice": "Phosphorus level supports healthy early root development."}
        else:
            p_status = {"level": "High / Surplus", "status": "high", "advice": "Adequate phosphorus reserve present; reduce basal phosphate fertilizer."}

        # Potassium status
        if k < 25:
            k_status = {"level": "Low / Deficient", "status": "low", "advice": "Apply muriate of potash (MOP) or wood ash to enhance stress and drought tolerance."}
        elif k <= 65:
            k_status = {"level": "Optimal / Balanced", "status": "optimal", "advice": "Good potassium availability for stomatal regulation and grain filling."}
        else:
            k_status = {"level": "High / Rich", "status": "high", "advice": "Naturally abundant potassium reservoir present in soil."}

        # pH status
        if ph < 5.8:
            ph_status = {"level": "Moderately Acidic", "type": "acidic", "advice": "Consider agricultural lime (calcium carbonate) application to neutralize acidity."}
        elif ph <= 7.5:
            ph_status = {"level": "Neutral / Ideal", "type": "neutral", "advice": "Excellent soil pH; optimal bioavailability for all macro and micro nutrients."}
        else:
            ph_status = {"level": "Moderately Alkaline / Calcareous", "type": "alkaline", "advice": "Apply agricultural gypsum and organic mulches to alleviate alkalinity."}

        return {
            "nitrogen": n_status,
            "phosphorus": p_status,
            "potassium": k_status,
            "ph": ph_status,
        }

    def predict(
        self,
        nitrogen: float,
        phosphorus: float,
        potassium: float,
        temperature: float,
        humidity: float,
        ph: float,
        rainfall: float
    ) -> Dict[str, Any]:
        """
        Runs ML inference and enriches with agronomic advisory.
        Feature Order: [N, P, K, temperature, humidity, ph, rainfall]
        """
        if self.model is None or self.minmax_scaler is None or self.standard_scaler is None:
            self._load_artifacts()

        # Format input vector matching training feature names
        raw_features = pd.DataFrame([{
            "N": float(nitrogen),
            "P": float(phosphorus),
            "K": float(potassium),
            "temperature": float(temperature),
            "humidity": float(humidity),
            "ph": float(ph),
            "rainfall": float(rainfall),
        }])

        # Preprocessing: MinMaxScaler -> StandardScaler
        scaled_minmax = self.minmax_scaler.transform(raw_features)
        scaled_final = self.standard_scaler.transform(scaled_minmax)

        # Inference
        prediction_label = int(self.model.predict(scaled_final)[0])
        probabilities = self.model.predict_proba(scaled_final)[0]
        classes = self.model.classes_

        # Rank all crops by probability
        ranked_indices = np.argsort(probabilities)[::-1]

        primary_crop_key = CROP_DICT.get(prediction_label, "unknown")
        primary_conf = float(probabilities[np.where(classes == prediction_label)[0][0]])

        # Top 3 recommendations
        top_3 = []
        for i in range(min(3, len(ranked_indices))):
            idx = ranked_indices[i]
            label = int(classes[idx])
            crop_key = CROP_DICT.get(label, "unknown")
            conf = float(probabilities[idx])
            meta = self.metadata.get(crop_key, {})

            top_3.append({
                "rank": i + 1,
                "crop_key": crop_key,
                "name": meta.get("name", crop_key.capitalize()),
                "hindi_name": meta.get("hindi_name", ""),
                "botanical_name": meta.get("botanical_name", ""),
                "emoji": meta.get("emoji", "🌱"),
                "category": meta.get("category", "Field Crop"),
                "confidence": round(conf, 4),
                "confidence_percent": f"{conf * 100:.1f}%",
                "season": meta.get("season", "Kharif / Rabi"),
                "water_requirement": meta.get("water_requirement", "Moderate"),
                "expected_yield": meta.get("expected_yield", "High Yield"),
            })

        # Enrich primary crop
        primary_meta = self.metadata.get(primary_crop_key, {})
        soil_eval = self.evaluate_soil_health(nitrogen, phosphorus, potassium, ph)

        return {
            "recommended_crop": primary_meta.get("name", primary_crop_key.capitalize()),
            "crop_key": primary_crop_key,
            "hindi_name": primary_meta.get("hindi_name", ""),
            "botanical_name": primary_meta.get("botanical_name", ""),
            "emoji": primary_meta.get("emoji", "🌾"),
            "category": primary_meta.get("category", "Agricultural Crop"),
            "confidence": round(primary_conf, 4),
            "confidence_percent": f"{primary_conf * 100:.1f}%",
            "match_quality": "High Match" if primary_conf > 0.7 else ("Moderate Match" if primary_conf > 0.4 else "Alternative Option"),

            "agronomic_profile": {
                "season": primary_meta.get("season", "Kharif"),
                "growth_duration_days": primary_meta.get("growth_duration_days", "90-120 days"),
                "water_requirement": primary_meta.get("water_requirement", "Moderate"),
                "soil_type": primary_meta.get("soil_type", "Loamy Soil"),
                "ideal_ph_range": primary_meta.get("ideal_ph_range", [6.0, 7.5]),
                "ideal_temp_range": primary_meta.get("ideal_temp_range", [20, 32]),
                "ideal_rainfall_mm": primary_meta.get("ideal_rainfall_mm", [80, 150]),
                "expected_yield": primary_meta.get("expected_yield", "Standard"),
                "economic_value": primary_meta.get("economic_value", "Commercial Value"),
                "farming_tips": primary_meta.get("farming_tips", "Ensure balanced soil nutrition and weed management."),
            },

            "input_parameters": {
                "nitrogen": nitrogen,
                "phosphorus": phosphorus,
                "potassium": potassium,
                "temperature": temperature,
                "humidity": humidity,
                "ph": ph,
                "rainfall": rainfall,
            },

            "soil_diagnosis": soil_eval,
            "top_3_recommendations": top_3,
            "model_metadata": {
                "algorithm": "Random Forest Classifier (100 Estimators)",
                "test_accuracy": "99.32%",
                "supported_crops_count": len(CROP_DICT),
                "features_evaluated": ["Nitrogen", "Phosphorus", "Potassium", "Temperature", "Humidity", "pH", "Rainfall"]
            }
        }


# Global Singleton Accessor
_service_instance = None


def get_crop_recommendation_service() -> CropRecommendationService:
    global _service_instance
    if _service_instance is None or getattr(_service_instance, "model", None) is None:
        _service_instance = CropRecommendationService()
    return _service_instance
