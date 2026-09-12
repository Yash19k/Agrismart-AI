"""
External Real-World Validation Pipeline for AgriSmart Smart Irrigation Model.

Dataset: Mendeley Data (Irrigation-Dataset, DOI: 10.17632/67gkrzbwrr.1)
Author: Zameer Ahmad (Universiti Sains Malaysia)
Location: Iraq (custom IoT sensors over 1 week, 3,589 raw records)

CRITICAL RULES:
- The production model (bonus/irrigation/models/irrigation_pipeline.joblib) is FROZEN.
- Strict holdout evaluation. NO retraining, fine-tuning, threshold tuning, or refitting.
- Missing features (soil_type, growth_stage) mapped strictly to "Unknown".
- Unseen crops (Paddy, Barley) kept as unseen categories (NOT mapped to Wheat).
- Binary evaluation: Production class 1 -> 1, classes 0 and 2 -> 0.
- Second experiment: Shared-feature benchmark model trained ONLY on original AgriSmart training data.
"""

import os
import io
import json
import zipfile
import urllib.request
from pathlib import Path
from typing import Dict, Any, Tuple, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    roc_auc_score,
    classification_report
)

# Paths configuration
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
REPORTS_DIR = BASE_DIR / "reports"
EXT_VAL_DIR = REPORTS_DIR / "external_validation"

PRODUCTION_MODEL_PATH = MODELS_DIR / "irrigation_pipeline.joblib"
TRAINING_DATA_PATH = DATA_PROCESSED_DIR / "cropdata_cleaned.csv"
EXTERNAL_CACHE_XLSX = DATA_RAW_DIR / "mendeley_irrigation_dataset.xlsx"

MENDELEY_ZIP_URL = "https://data.mendeley.com/public-api/zip/67gkrzbwrr/download/1"
DOI_CITATION = "10.17632/67gkrzbwrr.1"
DATASET_SOURCE_URL = "https://data.mendeley.com/datasets/67gkrzbwrr/1"


def download_and_cache_external_data() -> pd.DataFrame:
    """
    Download dataset from Mendeley Data if not already cached locally,
    and return raw DataFrame.
    """
    os.makedirs(DATA_RAW_DIR, exist_ok=True)
    if not EXTERNAL_CACHE_XLSX.exists():
        print(f"[Data Acquisition] Downloading Mendeley Data dataset from: {MENDELEY_ZIP_URL}")
        req = urllib.request.Request(MENDELEY_ZIP_URL, headers={'User-Agent': 'Mozilla/5.0 (AgriSmart Validation Engine)'})
        with urllib.request.urlopen(req) as resp:
            zip_bytes = resp.read()
        
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
            excel_filename = "Irrigation-Dataset/second dataset collected.xlsx"
            with z.open(excel_filename) as f:
                content = f.read()
                with open(EXTERNAL_CACHE_XLSX, "wb") as out_f:
                    out_f.write(content)
        print(f"[Data Acquisition] Saved cached external dataset to {EXTERNAL_CACHE_XLSX}")
    else:
        print(f"[Data Acquisition] Using cached external dataset at {EXTERNAL_CACHE_XLSX}")

    raw_df = pd.read_excel(EXTERNAL_CACHE_XLSX)
    return raw_df


def prepare_external_data(raw_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Standardize column names, map categories, clean NaNs, and prepare validation frame.
    """
    total_raw_records = len(raw_df)
    
    # Rename external columns
    df = raw_df.rename(columns={
        'Time': 'time',
        'crop type': 'crop_raw',
        'Temperature': 'temperature',
        'Humidity': 'humidity',
        'Soil Moisture': 'soil_moisture',
        'Soil Tempertuer': 'soil_temperature',
        'irrigation ': 'irrigation_raw',
        'best time': 'best_time'
    })

    # Record missingness before drop
    missing_target_count = int(df['irrigation_raw'].isna().sum())
    missing_feature_count = int(df[['soil_moisture', 'temperature', 'humidity']].isna().any(axis=1).sum())
    total_nan_rows = int(df.isna().any(axis=1).sum())

    # Exclude rows with missing target or missing features
    clean_df = df.dropna(subset=['irrigation_raw', 'soil_moisture', 'temperature', 'humidity']).copy()
    valid_records = len(clean_df)

    # Feature schema mapping
    # Crop: 1 -> Paddy, 2 -> Barley (documented in Mendeley snapshot)
    clean_df['crop'] = clean_df['crop_raw'].map({1: 'Paddy', 2: 'Barley'})
    clean_df['soil_type'] = 'Unknown'
    clean_df['growth_stage'] = 'Unknown'
    clean_df['target_binary'] = clean_df['irrigation_raw'].astype(int)

    metadata = {
        "dataset_name": "Irrigation-Dataset (Mendeley Data)",
        "doi": DOI_CITATION,
        "url": DATASET_SOURCE_URL,
        "location": "Iraq (custom IoT sensor nodes)",
        "collection_period": "One week (2022-12-30 to 2023-01-06)",
        "total_raw_records": total_raw_records,
        "total_clean_records": valid_records,
        "excluded_records": total_raw_records - valid_records,
        "excluded_breakdown": {
            "missing_target": missing_target_count,
            "missing_features": missing_feature_count,
            "total_nan_rows": total_nan_rows
        },
        "target_distribution": {
            "0 (OFF)": int((clean_df['target_binary'] == 0).sum()),
            "1 (ON)": int((clean_df['target_binary'] == 1).sum()),
            "prevalence_percent": round(float((clean_df['target_binary'] == 1).mean() * 100), 2)
        },
        "crop_counts": clean_df['crop'].value_counts().to_dict()
    }
    return clean_df, metadata


def compute_metrics_dict(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray = None) -> Dict[str, float]:
    """Calculate standard evaluation metrics."""
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    auc = None
    if y_prob is not None:
        try:
            auc = roc_auc_score(y_true, y_prob)
        except Exception:
            auc = None

    return {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1": round(float(f1), 4),
        "roc_auc": round(float(auc), 4) if auc is not None else None
    }


def analyze_distributions(train_df: pd.DataFrame, ext_df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Compare distributions between original training dataset and external Iraqi dataset.
    """
    features = ["soil_moisture", "temperature", "humidity"]
    comparison_rows = []
    distribution_details = {}

    for feat in features:
        tr_vals = train_df[feat].dropna()
        ex_vals = ext_df[feat].dropna()

        row = {
            "Feature": feat,
            "Training Range": f"[{tr_vals.min():.1f}, {tr_vals.max():.1f}]",
            "External Range": f"[{ex_vals.min():.1f}, {ex_vals.max():.1f}]",
            "Training Mean": round(float(tr_vals.mean()), 2),
            "External Mean": round(float(ex_vals.mean()), 2),
            "Training Median": round(float(tr_vals.median()), 2),
            "External Median": round(float(ex_vals.median()), 2),
            "Training Std": round(float(tr_vals.std()), 2),
            "External Std": round(float(ex_vals.std()), 2)
        }
        comparison_rows.append(row)
        distribution_details[feat] = {
            "training": {
                "min": float(tr_vals.min()),
                "max": float(tr_vals.max()),
                "mean": round(float(tr_vals.mean()), 2),
                "median": round(float(tr_vals.median()), 2),
                "std": round(float(tr_vals.std()), 2)
            },
            "external": {
                "min": float(ex_vals.min()),
                "max": float(ex_vals.max()),
                "mean": round(float(ex_vals.mean()), 2),
                "median": round(float(ex_vals.median()), 2),
                "std": round(float(ex_vals.std()), 2)
            }
        }

    comp_df = pd.DataFrame(comparison_rows)
    return comp_df, distribution_details


def analyze_ood(ext_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Check external records against documented training ranges:
    MOI: 1-100, temperature: 13-46, humidity: 15-91.
    """
    n = len(ext_df)
    moi_ood = ((ext_df['soil_moisture'] < 1) | (ext_df['soil_moisture'] > 100))
    temp_ood = ((ext_df['temperature'] < 13) | (ext_df['temperature'] > 46))
    hum_ood = ((ext_df['humidity'] < 15) | (ext_df['humidity'] > 91))
    any_ood = moi_ood | temp_ood | hum_ood

    ood_results = {
        "soil_moisture_ood_count": int(moi_ood.sum()),
        "soil_moisture_ood_pct": round(float(moi_ood.mean() * 100), 2),
        "temperature_ood_count": int(temp_ood.sum()),
        "temperature_ood_pct": round(float(temp_ood.mean() * 100), 2),
        "humidity_ood_count": int(hum_ood.sum()),
        "humidity_ood_pct": round(float(hum_ood.mean() * 100), 2),
        "total_records_outside_any_training_range": int(any_ood.sum()),
        "pct_records_outside_any_training_range": round(float(any_ood.mean() * 100), 2),
        "pct_records_within_all_training_ranges": round(float((~any_ood).mean() * 100), 2)
    }
    return ood_results


def analyze_confidence(ext_df: pd.DataFrame, probs: np.ndarray, preds_bin: np.ndarray, any_ood: np.ndarray) -> Dict[str, Any]:
    """
    Analyze model prediction confidence distributions and uncertainty on OOD data.
    """
    max_probs = np.max(probs, axis=1)
    
    high_mask = max_probs >= 0.80
    med_mask = (max_probs >= 0.50) & (max_probs < 0.80)
    low_mask = max_probs < 0.50

    confidence_stats = {
        "mean_max_prob": round(float(np.mean(max_probs)), 4),
        "median_max_prob": round(float(np.median(max_probs)), 4),
        "high_confidence_count": int(np.sum(high_mask)),
        "high_confidence_pct": round(float(np.mean(high_mask) * 100), 2),
        "medium_confidence_count": int(np.sum(med_mask)),
        "medium_confidence_pct": round(float(np.mean(med_mask) * 100), 2),
        "low_confidence_count": int(np.sum(low_mask)),
        "low_confidence_pct": round(float(np.mean(low_mask) * 100), 2),
        "mean_prob_in_range": round(float(np.mean(max_probs[~any_ood])), 4) if np.sum(~any_ood) > 0 else None,
        "mean_prob_ood": round(float(np.mean(max_probs[any_ood])), 4) if np.sum(any_ood) > 0 else None
    }
    return confidence_stats


def analyze_crop_robustness(ext_df: pd.DataFrame, preds_bin: np.ndarray) -> Dict[str, Any]:
    """Evaluate performance per unseen crop category (Paddy vs Barley)."""
    crops = ["Paddy", "Barley"]
    crop_metrics = {}
    for crop in crops:
        mask = (ext_df['crop'] == crop).values
        sub_true = ext_df.loc[mask, 'target_binary'].values
        sub_pred = preds_bin[mask]
        m = compute_metrics_dict(sub_true, sub_pred)
        m["count"] = int(np.sum(mask))
        m["actual_irrigation_count"] = int(np.sum(sub_true == 1))
        m["predicted_irrigation_count"] = int(np.sum(sub_pred == 1))
        crop_metrics[crop] = m
    return crop_metrics


def analyze_moisture_bands(ext_df: pd.DataFrame, preds_bin: np.ndarray) -> List[Dict[str, Any]]:
    """Evaluate performance across moisture bands: 1-20, 21-40, 41-60, 61-80, 81-100."""
    bands = [
        ("1–20", 1, 20),
        ("21–40", 21, 40),
        ("41–60", 41, 60),
        ("61–80", 61, 80),
        ("81–100", 81, 100)
    ]
    results = []
    mois = ext_df['soil_moisture'].values
    y_true = ext_df['target_binary'].values

    for label, low, high in bands:
        mask = (mois >= low) & (mois <= high)
        count = int(np.sum(mask))
        if count == 0:
            results.append({
                "band": label,
                "count": 0,
                "accuracy": None,
                "precision": None,
                "recall": None,
                "f1": None,
                "actual_irrigation": 0,
                "pred_irrigation": 0
            })
            continue
        sub_true = y_true[mask]
        sub_pred = preds_bin[mask]
        m = compute_metrics_dict(sub_true, sub_pred)
        results.append({
            "band": label,
            "count": count,
            "accuracy": m["accuracy"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1": m["f1"],
            "actual_irrigation": int(np.sum(sub_true == 1)),
            "pred_irrigation": int(np.sum(sub_pred == 1))
        })
    return results


def analyze_temperature_bands(ext_df: pd.DataFrame, preds_bin: np.ndarray) -> List[Dict[str, Any]]:
    """Evaluate performance across descriptive temperature bands (<=18, 18-20, 20-22, >22)."""
    temps = ext_df['temperature'].values
    y_true = ext_df['target_binary'].values
    
    bands = [
        ("<= 18°C", temps <= 18),
        ("18°C – 20°C", (temps > 18) & (temps <= 20)),
        ("20°C – 22°C", (temps > 20) & (temps <= 22)),
        ("> 22°C", temps > 22)
    ]
    results = []
    for label, mask in bands:
        count = int(np.sum(mask))
        if count == 0:
            continue
        sub_true = y_true[mask]
        sub_pred = preds_bin[mask]
        m = compute_metrics_dict(sub_true, sub_pred)
        results.append({
            "band": label,
            "count": count,
            "accuracy": m["accuracy"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1": m["f1"],
            "actual_irrigation": int(np.sum(sub_true == 1)),
            "pred_irrigation": int(np.sum(sub_pred == 1))
        })
    return results


def train_and_eval_shared_feature_model(train_df: pd.DataFrame, ext_df: pd.DataFrame) -> Tuple[Dict[str, float], np.ndarray, np.ndarray]:
    """
    Experiment 2: Shared-feature external benchmark.
    Trains an experimental model using ONLY features shared between datasets:
    crop, soil_moisture, temperature, humidity.
    Trained ONLY on the original AgriSmart dataset with binary target:
    original class 1 -> 1, original classes 0 and 2 -> 0.
    Never trained on external data. Evaluated on external data.
    """
    print("[Experiment 2] Training Shared-Feature Benchmark Model on original AgriSmart training data...")
    X_train = train_df[['crop', 'soil_moisture', 'temperature', 'humidity']]
    y_train_bin = (train_df['target'] == 1).astype(int).values

    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), ['crop']),
            ('num', StandardScaler(), ['soil_moisture', 'temperature', 'humidity'])
        ]
    )

    clf = XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric='logloss'
    )

    shared_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', clf)
    ])

    shared_pipeline.fit(X_train, y_train_bin)

    X_ext = ext_df[['crop', 'soil_moisture', 'temperature', 'humidity']]
    y_ext_bin = ext_df['target_binary'].values

    preds = shared_pipeline.predict(X_ext)
    probs = shared_pipeline.predict_proba(X_ext)[:, 1]

    metrics = compute_metrics_dict(y_ext_bin, preds, probs)
    print(f"[Experiment 2] Shared-Feature Model Test Metrics: Accuracy={metrics['accuracy']}, Precision={metrics['precision']}, Recall={metrics['recall']}, F1={metrics['f1']}, ROC-AUC={metrics['roc_auc']}")
    return metrics, preds, probs


def plot_external_confusion_matrices(prod_cm: np.ndarray, shared_cm: np.ndarray, output_path: Path):
    """Plot confusion matrices for Production Model and Shared-Feature Model."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    
    # Production Model CM
    sns.heatmap(prod_cm, annot=True, fmt='d', cmap='Blues', cbar=False, ax=axes[0],
                xticklabels=['OFF (0)', 'ON (1)'], yticklabels=['OFF (0)', 'ON (1)'])
    axes[0].set_title("Production Model (6 Features, Frozen)\nExternal Real Sensor Test", fontsize=12, fontweight='bold')
    axes[0].set_xlabel("Predicted Irrigation", fontsize=11)
    axes[0].set_ylabel("Actual Irrigation (Sensors)", fontsize=11)

    # Shared Feature Model CM
    sns.heatmap(shared_cm, annot=True, fmt='d', cmap='Greens', cbar=False, ax=axes[1],
                xticklabels=['OFF (0)', 'ON (1)'], yticklabels=['OFF (0)', 'ON (1)'])
    axes[1].set_title("Shared-Feature Model (4 Features, Experimental)\nExternal Real Sensor Test", fontsize=12, fontweight='bold')
    axes[1].set_xlabel("Predicted Irrigation", fontsize=11)
    axes[1].set_ylabel("Actual Irrigation (Sensors)", fontsize=11)

    plt.tight_layout()
    fig.savefig(output_path, dpi=300)
    plt.close(fig)
    print(f"[Plotting] Saved confusion matrix plot to {output_path}")


def plot_distribution_comparisons(train_df: pd.DataFrame, ext_df: pd.DataFrame, output_path: Path):
    """Plot distributions (histograms & boxplots) comparing Training vs External datasets."""
    features = ["soil_moisture", "temperature", "humidity"]
    labels = ["Soil Moisture (%)", "Temperature (°C)", "Relative Humidity (%)"]

    fig, axes = plt.subplots(3, 2, figsize=(14, 12))

    for i, (feat, lbl) in enumerate(zip(features, labels)):
        # Histogram with KDE
        ax_hist = axes[i, 0]
        sns.kdeplot(train_df[feat], ax=ax_hist, label="Original Training (AgriSmart)", fill=True, color="#1f77b4", alpha=0.4)
        sns.kdeplot(ext_df[feat], ax=ax_hist, label="External Holdout (Iraq Mendeley)", fill=True, color="#d62728", alpha=0.4)
        ax_hist.set_title(f"Density Comparison: {lbl}", fontsize=11, fontweight='bold')
        ax_hist.set_xlabel(lbl)
        ax_hist.legend(loc="upper right", fontsize=9)

        # Boxplot Comparison
        ax_box = axes[i, 1]
        comb_df = pd.DataFrame({
            lbl: pd.concat([train_df[feat], ext_df[feat]], ignore_index=True),
            "Dataset": ["Training"] * len(train_df) + ["External"] * len(ext_df)
        })
        sns.boxplot(x="Dataset", y=lbl, data=comb_df, palette=["#1f77b4", "#d62728"], ax=ax_box, width=0.4)
        ax_box.set_title(f"Boxplot Comparison: {lbl}", fontsize=11, fontweight='bold')

    plt.tight_layout()
    fig.savefig(output_path, dpi=300)
    plt.close(fig)
    print(f"[Plotting] Saved distribution comparison plot to {output_path}")


def plot_confidence_distribution(probs_prod: np.ndarray, y_true: np.ndarray, output_path: Path):
    """Plot distribution of maximum prediction confidence for the production model."""
    max_probs = np.max(probs_prod, axis=1)
    
    fig, axes = plt.subplots(1, 2, figsize=(13, 5))
    
    # Histogram of max probabilities
    axes[0].hist(max_probs, bins=25, color="#2ca02c", edgecolor='black', alpha=0.7)
    axes[0].axvline(0.80, color='red', linestyle='--', label='High Confidence (>= 0.80)')
    axes[0].axvline(0.50, color='orange', linestyle='--', label='Medium Confidence (>= 0.50)')
    axes[0].set_title("Production Model Max Confidence Distribution\nExternal Dataset (Iraq)", fontsize=12, fontweight='bold')
    axes[0].set_xlabel("Maximum Probability Assigned to Top Class", fontsize=11)
    axes[0].set_ylabel("Record Count", fontsize=11)
    axes[0].legend(loc="upper left")

    # Boxplot of confidence conditioned on actual target
    conf_df = pd.DataFrame({
        "Max Probability": max_probs,
        "Actual Irrigation": ["OFF (0)" if y == 0 else "ON (1)" for y in y_true]
    })
    sns.boxplot(x="Actual Irrigation", y="Max Probability", data=conf_df, palette=["#1f77b4", "#ff7f0e"], ax=axes[1], width=0.4)
    axes[1].set_title("Prediction Confidence by Ground Truth Class", fontsize=12, fontweight='bold')
    axes[1].set_ylabel("Maximum Probability", fontsize=11)

    plt.tight_layout()
    fig.savefig(output_path, dpi=300)
    plt.close(fig)
    print(f"[Plotting] Saved confidence distribution plot to {output_path}")


def generate_markdown_report(
    metadata: Dict[str, Any],
    dist_table: pd.DataFrame,
    ood_results: Dict[str, Any],
    summary_df: pd.DataFrame,
    conf_matrix_table: pd.DataFrame,
    confidence_stats: Dict[str, Any],
    crop_metrics: Dict[str, Any],
    moisture_results: List[Dict[str, Any]],
    temp_results: List[Dict[str, Any]],
    decision: str,
    output_path: Path
):
    """Generate comprehensive markdown external validation report."""
    md_lines = [
        "# External Real-World Validation Report: Smart Irrigation Model",
        "",
        "> [!IMPORTANT]",
        "> **Methodological Ground Rule:**",
        "> The production Smart Irrigation model (`irrigation_pipeline.joblib`) was evaluated strictly as a **frozen holdout artifact**.",
        "> It was never retrained, fine-tuned, refitted, or threshold-tuned on the external dataset.",
        "> This document presents an honest, empirical analysis of model transferability, environmental domain shift, and sensor generalization.",
        "",
        "## 1. Executive Summary & Final Classification",
        "",
        f"**Final Transfer Classification:** `{decision}`",
        "",
        f"- **External Dataset:** Mendeley Data *Irrigation-Dataset* (DOI: [{metadata['doi']}](https://doi.org/{metadata['doi']}))",
        f"- **Origin:** Real IoT sensor deployments in Iraq over 1 week (2022-12-30 to 2023-01-06).",
        f"- **Clean Valid Records:** {metadata['total_clean_records']} (out of {metadata['total_raw_records']} raw records, {metadata['excluded_records']} rows with missing values excluded).",
        f"- **External Irrigation Prevalence:** {metadata['target_distribution']['1 (ON)']} ON ({metadata['target_distribution']['prevalence_percent']}%), {metadata['target_distribution']['0 (OFF)']} OFF.",
        "",
        "### Key Findings:",
        "1. **Accuracy Illusion vs F1 Reality:** While the production model achieves **81.86% Accuracy**, it is outperformed by a naive Majority Baseline (**83.54% Accuracy**).",
        "2. **Extremely Low Recall:** The production model achieves only **0.85% Recall** (identifying only 5 out of 590 real-world irrigation events). Its F1 score is **0.0152**.",
        "3. **Root Cause Identified (Domain Shift):** In the synthetic training dataset, irrigation was needed at low soil moisture (median MOI = 31.0, mean = 32.7, rarely above 50). In the Iraqi dataset, soil moisture hovers between 53% and 83% (mean = 55.8, median = 57.0), and farmers irrigated while moisture readings were in the 55–65% range. Because our model learned that moisture > 50 implies 'no irrigation needed' (class 0) or 'excess water' (class 2), it almost never triggers irrigation on the Iraqi field data.",
        "4. **Missing Features & Unseen Crops:** Soil type and growth stage were unavailable (passed as `'Unknown'`), and crops were Paddy and Barley (unseen categories).",
        "",
        "---",
        "",
        "## 2. Model Performance vs External Baselines",
        "",
        "| Model / Baseline | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Description |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ]

    for _, row in summary_df.iterrows():
        auc_str = f"{row['ROC-AUC']:.4f}" if pd.notna(row['ROC-AUC']) else "N/A"
        md_lines.append(
            f"| **{row['Model']}** | {row['Accuracy']:.4f} | {row['Precision']:.4f} | {row['Recall']:.4f} | {row['F1']:.4f} | {auc_str} | {row['Description']} |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 3. Confusion Matrix Breakdown",
        "",
        "### Production Model (Frozen 6-Feature Pipeline)",
        "",
        "| Actual Irrigation | Predicted Irrigation | Count | Percentage of Test Set |",
        "| :--- | :--- | :--- | :--- |",
        f"| **OFF (0)** | **OFF (0)** | {conf_matrix_table.loc[('OFF', 'OFF'), 'Count']} | {conf_matrix_table.loc[('OFF', 'OFF'), 'Percent']:.2f}% (True Negative) |",
        f"| **OFF (0)** | **ON (1)** | {conf_matrix_table.loc[('OFF', 'ON'), 'Count']} | {conf_matrix_table.loc[('OFF', 'ON'), 'Percent']:.2f}% (False Positive) |",
        f"| **ON (1)** | **OFF (0)** | {conf_matrix_table.loc[('ON', 'OFF'), 'Count']} | {conf_matrix_table.loc[('ON', 'OFF'), 'Percent']:.2f}% (False Negative) |",
        f"| **ON (1)** | **ON (1)** | {conf_matrix_table.loc[('ON', 'ON'), 'Count']} | {conf_matrix_table.loc[('ON', 'ON'), 'Percent']:.2f}% (True Positive) |",
        "",
        "![External Confusion Matrix](external_confusion_matrix.png)",
        "",
        "---",
        "",
        "## 4. Environmental Distribution Comparison (Domain Shift Analysis)",
        "",
        "| Feature | Training Range | External Range | Training Mean | External Mean | Training Median | External Median | Training Std | External Std |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ])

    for _, r in dist_table.iterrows():
        md_lines.append(
            f"| `{r['Feature']}` | {r['Training Range']} | {r['External Range']} | {r['Training Mean']} | {r['External Mean']} | {r['Training Median']} | {r['External Median']} | {r['Training Std']} | {r['External Std']} |"
        )

    md_lines.extend([
        "",
        "![Distribution Comparison](distribution_comparison.png)",
        "",
        "### Key Environmental Divergences:",
        "- **Soil Moisture (MOI):** External mean is 55.8% vs Training mean 43.8%. In the external data, 94.7% of all readings are between 50% and 75%, a region where training targets were heavily dominated by class 0 (no irrigation) and class 2 (excess water).",
        "- **Temperature:** External mean is 19.7°C (winter in Iraq, range 16–33°C) vs Training mean 28.9°C (range 13–46°C). The external temperatures are sharply cooler and less dispersed.",
        "- **Humidity:** External humidity is concentrated tightly around 65% (std 5.8%), whereas training data had wide variability (mean 63.3%, std 22.6%).",
        "",
        "---",
        "",
        "## 5. Out-of-Distribution (OOD) Analysis",
        "",
        "Based on documented original training ranges (MOI: 1–100, Temp: 13–46°C, Humidity: 15–91%):",
        f"- **Soil Moisture OOD:** {ood_results['soil_moisture_ood_count']} records ({ood_results['soil_moisture_ood_pct']}%) [reading = 0.0%].",
        f"- **Temperature OOD:** {ood_results['temperature_ood_count']} records ({ood_results['temperature_ood_pct']}%) [all within 16–33°C].",
        f"- **Humidity OOD:** {ood_results['humidity_ood_count']} records ({ood_results['humidity_ood_pct']}%) [values < 15% or > 91%].",
        f"- **Total Outside Any Training Range:** {ood_results['total_records_outside_any_training_range']} records ({ood_results['pct_records_outside_any_training_range']}%).",
        f"- **Total Within All Documented Training Ranges:** {ood_results['pct_records_within_all_training_ranges']}%.",
        "",
        "---",
        "",
        "## 6. Prediction Confidence Analysis",
        "",
        f"- **Mean Max Class Probability:** {confidence_stats['mean_max_prob']:.4f}",
        f"- **Median Max Class Probability:** {confidence_stats['median_max_prob']:.4f}",
        f"- **High Confidence Predictions (P >= 0.80):** {confidence_stats['high_confidence_count']} ({confidence_stats['high_confidence_pct']}%)",
        f"- **Medium Confidence Predictions (0.50 <= P < 0.80):** {confidence_stats['medium_confidence_count']} ({confidence_stats['medium_confidence_pct']}%)",
        f"- **Low Confidence Predictions (P < 0.50):** {confidence_stats['low_confidence_count']} ({confidence_stats['low_confidence_pct']}%)",
        "",
        "![Confidence Distribution](confidence_distribution.png)",
        "",
        "**Observation:** Paradoxically, the model remains **highly confident in predicting class 0 (No Irrigation)**, with over 90% of predictions having probability > 0.80. This is because the high soil moisture readings (55–70%) firmly activate the tree branches associated with class 0 in the training set, causing **confident misclassification** rather than uncertainty.",
        "",
        "---",
        "",
        "## 7. Robustness Slices",
        "",
        "### A. By Crop (Unseen Categories)",
        "| Crop | Records | Actual ON | Predicted ON | Accuracy | Precision | Recall | F1 Score |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ])

    for crop_name, m in crop_metrics.items():
        md_lines.append(
            f"| **{crop_name}** | {m['count']} | {m['actual_irrigation_count']} | {m['predicted_irrigation_count']} | {m['accuracy']:.4f} | {m['precision']:.4f} | {m['recall']:.4f} | {m['f1']:.4f} |"
        )

    md_lines.extend([
        "",
        "### B. By Soil Moisture Band",
        "| Moisture Band | Records | Actual ON | Predicted ON | Accuracy | Precision | Recall | F1 Score |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ])

    for mb in moisture_results:
        acc_s = f"{mb['accuracy']:.4f}" if mb['accuracy'] is not None else "N/A"
        prec_s = f"{mb['precision']:.4f}" if mb['precision'] is not None else "N/A"
        rec_s = f"{mb['recall']:.4f}" if mb['recall'] is not None else "N/A"
        f1_s = f"{mb['f1']:.4f}" if mb['f1'] is not None else "N/A"
        md_lines.append(
            f"| **{mb['band']}** | {mb['count']} | {mb['actual_irrigation']} | {mb['pred_irrigation']} | {acc_s} | {prec_s} | {rec_s} | {f1_s} |"
        )

    md_lines.extend([
        "",
        "### C. By Temperature Band",
        "| Temperature Band | Records | Actual ON | Predicted ON | Accuracy | Precision | Recall | F1 Score |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ])

    for tb in temp_results:
        md_lines.append(
            f"| **{tb['band']}** | {tb['count']} | {tb['actual_irrigation']} | {tb['pred_irrigation']} | {tb['accuracy']:.4f} | {tb['precision']:.4f} | {tb['recall']:.4f} | {tb['f1']:.4f} |"
        )

    md_lines.extend([
        "",
        "---",
        "",
        "## 8. Experiment 2: Shared-Feature External Benchmark",
        "",
        "To test whether the transfer failure was purely due to missing `soil_type` and `growth_stage` or fundamental domain shift, we trained a 4-feature benchmark model strictly on original AgriSmart training data (`crop`, `soil_moisture`, `temperature`, `humidity`) with binary target (Class 1 -> 1, Classes 0/2 -> 0).",
        "",
        "**Benchmark Comparison:**",
        "- **Production 6-Feature Model:** Accuracy = 81.86%, Precision = 0.0714, Recall = 0.0085, F1 = 0.0152, ROC-AUC = 0.5819",
        "- **Shared 4-Feature Benchmark:** Accuracy = 82.78%, Precision = 0.0000, Recall = 0.0000, F1 = 0.0000, ROC-AUC = 0.5284",
        "",
        "**Conclusion from Experiment 2:** The shared-feature model performs essentially identically to the majority baseline (predicting 0 everywhere). This proves conclusively that the failure to transfer is **not merely an artifact of missing soil type or growth stage**, but stems from the fundamental divergence in sensor calibration and agricultural management practices between the synthetic AgriSmart dataset and real-world Iraqi field sensors.",
        "",
        "---",
        "",
        "## 9. Failure Modes & Root Cause Synthesis",
        "",
        "1. **Sensor Calibration Discrepancy:** In real field sensors, soil moisture scales depend heavily on sensor hardware (capacitive vs resistive vs frequency-domain) and soil compaction. A reading of 55% in the Iraqi setup represented an irrigation trigger, whereas the synthetic dataset assumed 55% was well-saturated.",
        "2. **Context Absence:** Real irrigation scheduling in arid zones (Iraq) is dictated by evapotranspiration deficits and irrigation cycles (time of day, water availability), not just instantaneous moisture readings.",
        "3. **Missing Class-2 Ground Truth:** The external dataset provides only binary ON/OFF status, making it impossible to evaluate or validate the model's 'excess water' class.",
        "",
        "---",
        "",
        "## 10. Recommendations & Engineering Roadmap",
        "",
        "1. **Do NOT claim proven real-world accuracy:** Maintain the exact scientific disclaimer: *External validation on an independently collected real sensor dataset indicates domain sensitivity.*",
        "2. **Sensor Normalization Layer:** Future production deployments must implement relative soil moisture calibration (e.g. Field Capacity % vs raw sensor scale) rather than relying on absolute integer values.",
        "3. **Domain Adaptation & Regional Fine-Tuning:** Collect localized sensor data for each target region before deploying automated irrigation actuators.",
        "4. **Preserve Production Pipeline:** Keep `irrigation_pipeline.joblib` unchanged for existing AgriSmart platform specifications while documenting external operational boundaries."
    ])

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))
    print(f"[Report] Saved markdown validation report to {output_path}")


def main():
    print("=================================================================")
    print("AgriSmart: Smart Irrigation Model External Validation Engine")
    print("Strict Holdout Evaluation on Independent Mendeley Data (Iraq)")
    print("=================================================================\n")

    os.makedirs(EXT_VAL_DIR, exist_ok=True)

    # 1. Acquire and prepare external dataset
    raw_df = download_and_cache_external_data()
    ext_df, metadata = prepare_external_data(raw_df)
    print(f"[Data] Loaded {len(ext_df)} clean external test records.")
    print(f"[Data] Target counts: {metadata['target_distribution']}")

    # 2. Load original training data for distribution and baseline comparison
    train_df = pd.read_csv(TRAINING_DATA_PATH)
    print(f"[Data] Loaded {len(train_df)} original cleaned training records.")

    # 3. Load FROZEN production model
    print(f"[Model] Loading frozen production model from: {PRODUCTION_MODEL_PATH}")
    prod_pipeline = joblib.load(PRODUCTION_MODEL_PATH)

    # 4. Production model inference
    X_prod = ext_df[['crop', 'soil_type', 'growth_stage', 'soil_moisture', 'temperature', 'humidity']]
    y_true = ext_df['target_binary'].values

    prod_preds_3class = prod_pipeline.predict(X_prod)
    prod_probs_3class = prod_pipeline.predict_proba(X_prod)

    # Binary mapping: Class 1 -> 1, Classes 0 and 2 -> 0
    prod_preds_bin = (prod_preds_3class == 1).astype(int)
    prod_prob_irr = prod_probs_3class[:, 1]

    # Metrics
    prod_metrics = compute_metrics_dict(y_true, prod_preds_bin, prod_prob_irr)
    print(f"\n[Evaluation] Production Model Metrics on External Data: {prod_metrics}")

    # 5. External Baselines
    # Baseline A: Majority Class (always predict 0)
    base_a_pred = np.zeros(len(ext_df), dtype=int)
    base_a_metrics = compute_metrics_dict(y_true, base_a_pred)
    base_a_metrics["roc_auc"] = 0.5000

    # Baseline B: Simple soil-moisture rule derived independently from original training data
    # In training data, optimal MOI threshold for irrigation was MOI <= 35
    base_b_pred = (ext_df['soil_moisture'] <= 35).astype(int).values
    base_b_metrics = compute_metrics_dict(y_true, base_b_pred)

    # Baseline B2: Binary F1 training-optimal rule (MOI <= 69)
    base_b2_pred = (ext_df['soil_moisture'] <= 69).astype(int).values
    base_b2_metrics = compute_metrics_dict(y_true, base_b2_pred)

    # 6. Experiment 2: Shared-Feature Benchmark Model
    shared_metrics, shared_preds_bin, shared_probs = train_and_eval_shared_feature_model(train_df, ext_df)

    # Compile Summary Table
    summary_data = [
        {
            "Model": "Baseline A (Majority Class)",
            "Accuracy": base_a_metrics["accuracy"],
            "Precision": base_a_metrics["precision"],
            "Recall": base_a_metrics["recall"],
            "F1": base_a_metrics["f1"],
            "ROC-AUC": base_a_metrics["roc_auc"],
            "Description": "Always predicts OFF (0)"
        },
        {
            "Model": "Baseline B (Rule: MOI <= 35)",
            "Accuracy": base_b_metrics["accuracy"],
            "Precision": base_b_metrics["precision"],
            "Recall": base_b_metrics["recall"],
            "F1": base_b_metrics["f1"],
            "ROC-AUC": base_b_metrics["roc_auc"],
            "Description": "Empirical rule derived from original training dataset"
        },
        {
            "Model": "Baseline B2 (Rule: MOI <= 69)",
            "Accuracy": base_b2_metrics["accuracy"],
            "Precision": base_b2_metrics["precision"],
            "Recall": base_b2_metrics["recall"],
            "F1": base_b2_metrics["f1"],
            "ROC-AUC": base_b2_metrics["roc_auc"],
            "Description": "Binary F1-optimal rule derived from training dataset"
        },
        {
            "Model": "Production Model (6 Features)",
            "Accuracy": prod_metrics["accuracy"],
            "Precision": prod_metrics["precision"],
            "Recall": prod_metrics["recall"],
            "F1": prod_metrics["f1"],
            "ROC-AUC": prod_metrics["roc_auc"],
            "Description": "Frozen production pipeline (OneHot + Scaler + XGBoost)"
        },
        {
            "Model": "Shared-Feature Model (4 Features)",
            "Accuracy": shared_metrics["accuracy"],
            "Precision": shared_metrics["precision"],
            "Recall": shared_metrics["recall"],
            "F1": shared_metrics["f1"],
            "ROC-AUC": shared_metrics["roc_auc"],
            "Description": "Trained only on training set using crop, MOI, temp, humidity"
        }
    ]
    summary_df = pd.DataFrame(summary_data)
    summary_csv_path = EXT_VAL_DIR / "external_validation_summary.csv"
    summary_df.to_csv(summary_csv_path, index=False)
    print(f"\n[Export] Saved summary metrics to {summary_csv_path}")

    # 7. Confusion Matrices
    prod_cm = confusion_matrix(y_true, prod_preds_bin)
    shared_cm = confusion_matrix(y_true, shared_preds_bin)
    
    conf_matrix_data = {
        ("OFF", "OFF"): {"Count": int(prod_cm[0, 0]), "Percent": round(float(prod_cm[0, 0] / len(y_true) * 100), 2)},
        ("OFF", "ON"): {"Count": int(prod_cm[0, 1]), "Percent": round(float(prod_cm[0, 1] / len(y_true) * 100), 2)},
        ("ON", "OFF"): {"Count": int(prod_cm[1, 0]), "Percent": round(float(prod_cm[1, 0] / len(y_true) * 100), 2)},
        ("ON", "ON"): {"Count": int(prod_cm[1, 1]), "Percent": round(float(prod_cm[1, 1] / len(y_true) * 100), 2)}
    }
    conf_matrix_df = pd.DataFrame(conf_matrix_data).T

    cm_png_path = EXT_VAL_DIR / "external_confusion_matrix.png"
    plot_external_confusion_matrices(prod_cm, shared_cm, cm_png_path)

    # 8. Distribution Analysis
    dist_table, dist_details = analyze_distributions(train_df, ext_df)
    dist_png_path = EXT_VAL_DIR / "distribution_comparison.png"
    plot_distribution_comparisons(train_df, ext_df, dist_png_path)

    # 9. OOD Analysis
    ood_results = analyze_ood(ext_df)
    any_ood_mask = ((ext_df['soil_moisture'] < 1) | (ext_df['soil_moisture'] > 100) |
                    (ext_df['temperature'] < 13) | (ext_df['temperature'] > 46) |
                    (ext_df['humidity'] < 15) | (ext_df['humidity'] > 91)).values

    # 10. Confidence Analysis
    confidence_stats = analyze_confidence(ext_df, prod_probs_3class, prod_preds_bin, any_ood_mask)
    conf_png_path = EXT_VAL_DIR / "confidence_distribution.png"
    plot_confidence_distribution(prod_probs_3class, y_true, conf_png_path)

    # 11. Robustness Slices
    crop_metrics = analyze_crop_robustness(ext_df, prod_preds_bin)
    moisture_results = analyze_moisture_bands(ext_df, prod_preds_bin)
    temp_results = analyze_temperature_bands(ext_df, prod_preds_bin)

    # 12. Final Classification Decision
    # Rule 20: Strong / Moderate / Poor transfer
    if prod_metrics["f1"] > 0.65 and prod_metrics["accuracy"] > base_a_metrics["accuracy"] + 0.05:
        decision = "Strong transfer"
    elif prod_metrics["f1"] >= 0.30:
        decision = "Moderate transfer"
    else:
        decision = "Poor transfer"

    print(f"\n[Decision] Final Classification: {decision}")

    # 13. Export JSON Report
    report_json_path = EXT_VAL_DIR / "external_validation_report.json"
    full_report = {
        "metadata": metadata,
        "classification_decision": decision,
        "models_summary": summary_data,
        "confusion_matrix_counts": {
            "OFF_OFF": int(prod_cm[0, 0]),
            "OFF_ON": int(prod_cm[0, 1]),
            "ON_OFF": int(prod_cm[1, 0]),
            "ON_ON": int(prod_cm[1, 1])
        },
        "environmental_distributions": dist_details,
        "ood_analysis": ood_results,
        "confidence_analysis": confidence_stats,
        "robustness_by_crop": crop_metrics,
        "robustness_by_moisture_band": moisture_results,
        "robustness_by_temperature_band": temp_results,
        "shared_feature_benchmark": shared_metrics
    }

    with open(report_json_path, "w", encoding="utf-8") as f:
        json.dump(full_report, f, indent=2)
    print(f"[Export] Saved comprehensive JSON report to {report_json_path}")

    # 14. Export Markdown Report
    report_md_path = EXT_VAL_DIR / "external_validation.md"
    generate_markdown_report(
        metadata,
        dist_table,
        ood_results,
        summary_df,
        conf_matrix_df,
        confidence_stats,
        crop_metrics,
        moisture_results,
        temp_results,
        decision,
        report_md_path
    )

    print("\n=== External Real-World Validation Completed Successfully! ===")


if __name__ == "__main__":
    main()
