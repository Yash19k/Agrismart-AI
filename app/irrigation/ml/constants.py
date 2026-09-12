"""
ML Pipeline feature definitions and class semantics for AgriSmart Smart Irrigation.
Pure Python/scikit-learn metadata with zero external Flask dependencies.
"""

from typing import List, Dict

CATEGORICAL_FEATURES: List[str] = ["crop", "soil_type", "growth_stage"]
NUMERICAL_FEATURES: List[str] = ["soil_moisture", "temperature", "humidity"]
ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
TARGET_COLUMN: str = "target"

CLASS_NAMES: Dict[int, str] = {
    0: "no_irrigation",
    1: "irrigation_required",
    2: "excess_water"
}

CLASS_DESCRIPTIONS: Dict[int, str] = {
    0: "No irrigation required",
    1: "Irrigation required",
    2: "Excess water detected / avoid irrigation"
}
