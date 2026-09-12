"""
Preprocessing and Data Preparation Module for AgriSmart Smart Irrigation.

Handles:
- Dataset loading and deduplication
- Column normalization
- Preprocessing pipelines (OneHotEncoder + StandardScaler)
- Evaluation splitting:
    1. Stratified random 80/20 holdout (Split A)
    2. Group-aware split by (crop, soil_type, growth_stage) (Split B: unseen combinations)
"""

import os
from pathlib import Path
from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GroupShuffleSplit
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# Default paths relative to this file
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_PATH = BASE_DIR / "data" / "raw" / "cropdata_updated.csv"
PROCESSED_DATA_PATH = BASE_DIR / "data" / "processed" / "cropdata_cleaned.csv"

# Feature definitions
CATEGORICAL_FEATURES: List[str] = ["crop", "soil_type", "growth_stage"]
NUMERICAL_FEATURES: List[str] = ["soil_moisture", "temperature", "humidity"]
ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERICAL_FEATURES
TARGET_COLUMN: str = "target"

# Raw column mapping
COLUMN_MAPPING: Dict[str, str] = {
    "crop ID": "crop",
    "soil_type": "soil_type",
    "Seedling Stage": "growth_stage",
    "MOI": "soil_moisture",
    "temp": "temperature",
    "humidity": "humidity",
    "result": "target"
}

# Verified class semantics
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


def load_and_clean_data(raw_path: Path = RAW_DATA_PATH, save_processed: bool = True) -> pd.DataFrame:
    """
    Load raw crop data, remove exact duplicates, standardize column names,
    and optionally persist processed dataset.
    """
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"Raw data file not found at: {raw_path}")

    df = pd.read_csv(raw_path)
    initial_rows = len(df)

    # Standardize columns
    df = df.rename(columns=COLUMN_MAPPING)

    # Deduplicate
    df = df.drop_duplicates().reset_index(drop=True)
    dedup_rows = len(df)
    duplicates_removed = initial_rows - dedup_rows

    # Ensure types
    df["crop"] = df["crop"].astype(str).str.strip()
    df["soil_type"] = df["soil_type"].astype(str).str.strip()
    df["growth_stage"] = df["growth_stage"].astype(str).str.strip()
    df["soil_moisture"] = df["soil_moisture"].astype(int)
    df["temperature"] = df["temperature"].astype(int)
    df["humidity"] = df["humidity"].astype(float)
    df["target"] = df["target"].astype(int)

    # Create composite group identifier for group-aware evaluation
    df["group_id"] = df["crop"] + "__" + df["soil_type"] + "__" + df["growth_stage"]

    if save_processed:
        os.makedirs(PROCESSED_DATA_PATH.parent, exist_ok=True)
        df.to_csv(PROCESSED_DATA_PATH, index=False)
        print(f"[Preprocessing] Saved cleaned dataset to {PROCESSED_DATA_PATH} "
              f"({dedup_rows} rows, {duplicates_removed} duplicates removed)")

    return df


def get_feature_preprocessor() -> ColumnTransformer:
    """
    Construct scikit-learn ColumnTransformer for feature preprocessing.
    Categorical: OneHotEncoder (handle_unknown='ignore')
    Numerical: StandardScaler
    """
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
            ("num", StandardScaler(), NUMERICAL_FEATURES)
        ],
        remainder="drop"
    )
    return preprocessor


def create_stratified_split(
    df: pd.DataFrame, 
    test_size: float = 0.20, 
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split A: Conventional stratified random 80/20 holdout based on target class distribution.
    """
    train_df, test_df = train_test_split(
        df,
        test_size=test_size,
        stratify=df[TARGET_COLUMN],
        random_state=random_state
    )
    return train_df.reset_index(drop=True), test_df.reset_index(drop=True)


def create_grouped_split(
    df: pd.DataFrame, 
    test_size: float = 0.20, 
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split B: Unseen crop/soil/stage combination evaluation.
    Uses GroupShuffleSplit on group_id (crop + soil_type + growth_stage) so entire
    combinations are held out from training.
    """
    gss = GroupShuffleSplit(n_splits=1, test_size=test_size, random_state=random_state)
    train_idx, test_idx = next(gss.split(df, groups=df["group_id"]))
    train_df = df.iloc[train_idx].reset_index(drop=True)
    test_df = df.iloc[test_idx].reset_index(drop=True)
    return train_df, test_df


if __name__ == "__main__":
    df_cleaned = load_and_clean_data()
    print("Class counts:\n", df_cleaned[TARGET_COLUMN].value_counts())
    train_strat, test_strat = create_stratified_split(df_cleaned)
    print(f"Stratified split: train={len(train_strat)}, test={len(test_strat)}")
    train_grp, test_grp = create_grouped_split(df_cleaned)
    print(f"Grouped split: train={len(train_grp)} ({train_grp['group_id'].nunique()} groups), "
          f"test={len(test_grp)} ({test_grp['group_id'].nunique()} groups)")
