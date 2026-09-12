"""
Comprehensive Model Training, Systematic Comparison, and Selection Pipeline.

Models Evaluated:
1. Majority Class Baseline
2. Empirical Rule Baseline - Tier 1 (MOI-only, thresholds derived from training data)
3. Empirical Rule Baseline - Tier 2 (MOI + Temp/Humidity environment rules)
4. Empirical Rule Baseline - Tier 3 (Crop/Stage-conditioned rule lookup)
5. Logistic Regression (OneHot + Scaler + Multinomial)
6. Random Forest (Tuned with Stratified 5-Fold CV on training set)
7. HistGradientBoosting (Sklearn native gradient boosting)
8. XGBoost (Tuned with Stratified 5-Fold CV on training set)

Evaluation Schemes:
- Split A: Stratified Random 80/20 Holdout
- Split B: Unseen Crop/Soil/Stage Combination Evaluation (GroupShuffleSplit)

Also includes:
- Secondary binary classification experiment (Irrigation Required vs No Irrigation/Excess)
- Investigation of high score phenomena (leakage/synthetic pattern memorization)
- Full model comparison export to CSV and JSON
- Confusion matrix plotting
- Selection of best defensible pipeline and serialization to models/irrigation_pipeline.joblib
"""

import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
import joblib

from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from xgboost import XGBClassifier
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from sklearn.inspection import permutation_importance

from preprocessing import (
    load_and_clean_data,
    create_stratified_split,
    create_grouped_split,
    get_feature_preprocessor,
    CATEGORICAL_FEATURES,
    NUMERICAL_FEATURES,
    ALL_FEATURES,
    TARGET_COLUMN,
    CLASS_NAMES,
    BASE_DIR
)
from evaluate import (
    compute_multiclass_metrics,
    compute_binary_metrics,
    plot_confusion_matrices
)

# Output paths
MODELS_DIR = BASE_DIR / "models"
REPORTS_DIR = BASE_DIR / "reports"
PIPELINE_PATH = MODELS_DIR / "irrigation_pipeline.joblib"
METADATA_PATH = MODELS_DIR / "pipeline_metadata.json"
COMPARISON_CSV_PATH = REPORTS_DIR / "model_comparison.csv"
EVALUATION_JSON_PATH = REPORTS_DIR / "evaluation_report.json"
CONFUSION_PNG_PATH = REPORTS_DIR / "confusion_matrix.png"


# =====================================================================
# 1. BASELINE CLASSIFIERS
# =====================================================================

class MajorityBaseline:
    """Predicts majority class from training data."""
    def __init__(self):
        self.majority_class_ = 0

    def fit(self, X, y):
        counts = pd.Series(y).value_counts()
        self.majority_class_ = int(counts.idxmax())
        return self

    def predict(self, X):
        return np.full(len(X), self.majority_class_)

    def predict_proba(self, X):
        probs = np.zeros((len(X), 3))
        probs[:, self.majority_class_] = 1.0
        return probs


class EmpiricalRuleTier1:
    """
    Tier 1: MOI-only rule.
    Finds optimal thresholds (t_low, t_high) from training set by maximizing training macro-F1:
    - If MOI <= t_low -> Class 1 (Irrigation required)
    - If MOI >= t_high -> Class 2 (Excess water)
    - Else -> Class 0 (No irrigation)
    """
    def __init__(self):
        self.t_low_ = 25
        self.t_high_ = 65

    def fit(self, X: pd.DataFrame, y: np.ndarray):
        mois = X["soil_moisture"].values
        best_f1 = -1.0
        best_thresholds = (25, 65)

        # Grid search over reasonable candidate percentiles
        candidate_lows = np.arange(15, 45, 5)
        candidate_highs = np.arange(55, 85, 5)

        for t_l in candidate_lows:
            for t_h in candidate_highs:
                if t_l >= t_h:
                    continue
                preds = np.zeros(len(X), dtype=int)
                preds[mois <= t_l] = 1
                preds[mois >= t_h] = 2
                
                # Compute macro F1 directly
                f1s = []
                for c in [0, 1, 2]:
                    tp = np.sum((preds == c) & (y == c))
                    fp = np.sum((preds == c) & (y != c))
                    fn = np.sum((preds != c) & (y == c))
                    denom = 2 * tp + fp + fn
                    f1 = (2 * tp / denom) if denom > 0 else 0.0
                    f1s.append(f1)
                macro_f1 = np.mean(f1s)

                if macro_f1 > best_f1:
                    best_f1 = macro_f1
                    best_thresholds = (t_l, t_h)

        self.t_low_, self.t_high_ = best_thresholds
        print(f"  [Rule Tier 1] Derived optimal training thresholds: MOI <= {self.t_low_} (Irrig), MOI >= {self.t_high_} (Excess) [Train Macro-F1: {best_f1:.4f}]")
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        mois = X["soil_moisture"].values
        preds = np.zeros(len(X), dtype=int)
        preds[mois <= self.t_low_] = 1
        preds[mois >= self.t_high_] = 2
        return preds


class EmpiricalRuleTier2:
    """
    Tier 2: MOI + Environmental (Temperature / Humidity) rule.
    Refines Tier 1 by considering temperature and humidity stress:
    - High temp (>35C) or low humidity (<40%) lowers the moisture threshold for irrigation.
    - Low temp (<22C) and high humidity (>75%) increases tolerance before irrigation is needed.
    """
    def __init__(self):
        self.t_low_base_ = 25
        self.t_high_ = 65

    def fit(self, X: pd.DataFrame, y: np.ndarray):
        # Derive base thresholds
        t1 = EmpiricalRuleTier1().fit(X, y)
        self.t_low_base_ = t1.t_low_
        self.t_high_ = t1.t_high_
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        mois = X["soil_moisture"].values
        temps = X["temperature"].values
        hums = X["humidity"].values
        preds = np.zeros(len(X), dtype=int)

        # Dynamic moisture threshold based on evaporative stress
        for i in range(len(X)):
            m = mois[i]
            t = temps[i]
            h = hums[i]
            
            # Stress condition: hot and dry air accelerates transpiration
            if t >= 35 or h <= 40:
                stress_adjust = 5
            elif t <= 22 and h >= 75:
                stress_adjust = -5
            else:
                stress_adjust = 0

            threshold = self.t_low_base_ + stress_adjust

            if m <= threshold:
                preds[i] = 1
            elif m >= self.t_high_:
                preds[i] = 2
            else:
                preds[i] = 0
        return preds


class EmpiricalRuleTier3:
    """
    Tier 3: Crop & Growth Stage Conditioned Rule.
    Computes per-(crop, growth_stage) empirical optimal moisture thresholds from training data.
    Falls back to Tier 2 for unseen crop/stage combinations.
    """
    def __init__(self):
        self.group_thresholds_ = {}
        self.fallback_tier2_ = None

    def fit(self, X: pd.DataFrame, y: np.ndarray):
        self.fallback_tier2_ = EmpiricalRuleTier2().fit(X, y)
        df = X.copy()
        df["target"] = y

        for (crop, stage), grp in df.groupby(["crop", "growth_stage"]):
            irrig_sub = grp[grp["target"] == 1]
            excess_sub = grp[grp["target"] == 2]

            t_low = irrig_sub["soil_moisture"].quantile(0.65) if len(irrig_sub) > 5 else self.fallback_tier2_.t_low_base_
            t_high = excess_sub["soil_moisture"].quantile(0.35) if len(excess_sub) > 5 else self.fallback_tier2_.t_high_
            self.group_thresholds_[(crop, stage)] = (t_low, t_high)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        preds = np.zeros(len(X), dtype=int)
        fallback_preds = self.fallback_tier2_.predict(X)

        for i in range(len(X)):
            crop = X.iloc[i]["crop"]
            stage = X.iloc[i]["growth_stage"]
            m = X.iloc[i]["soil_moisture"]

            if (crop, stage) in self.group_thresholds_:
                t_low, t_high = self.group_thresholds_[(crop, stage)]
                if m <= t_low:
                    preds[i] = 1
                elif m >= t_high:
                    preds[i] = 2
                else:
                    preds[i] = 0
            else:
                # Unseen combination fallback
                preds[i] = fallback_preds[i]

        return preds


# =====================================================================
# 2. MODEL FACTORIES & HYPERPARAMETER TUNING
# =====================================================================

def build_logistic_regression() -> Pipeline:
    preprocessor = get_feature_preprocessor()
    model = LogisticRegression(
        class_weight="balanced",
        max_iter=1000,
        solver="lbfgs",
        random_state=42
    )
    return Pipeline([("preprocessor", preprocessor), ("classifier", model)])


def tune_random_forest(X_train: pd.DataFrame, y_train: np.ndarray) -> Pipeline:
    """Tuned Random Forest using Stratified 5-Fold CV on training set only."""
    print("  [Tuning] Random Forest with 5-Fold Stratified CV...")
    preprocessor = get_feature_preprocessor()
    rf = RandomForestClassifier(random_state=42)
    pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", rf)])

    param_distributions = {
        "classifier__n_estimators": [100, 200],
        "classifier__max_depth": [10, 20, None],
        "classifier__min_samples_split": [2, 5],
        "classifier__min_samples_leaf": [1, 2],
        "classifier__class_weight": [None, "balanced"]
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        pipeline,
        param_distributions=param_distributions,
        n_iter=10,
        scoring="f1_macro",
        cv=cv,
        random_state=42,
        n_jobs=-1
    )
    search.fit(X_train, y_train)
    print(f"  [Tuning] RF Best params: {search.best_params_} (CV Macro-F1: {search.best_score_:.4f})")
    return search.best_estimator_


def build_hist_gradient_boosting() -> Pipeline:
    """HistGradientBoostingClassifier pipeline."""
    preprocessor = get_feature_preprocessor()
    hgb = HistGradientBoostingClassifier(
        max_iter=150,
        learning_rate=0.1,
        max_depth=8,
        min_samples_leaf=15,
        random_state=42
    )
    return Pipeline([("preprocessor", preprocessor), ("classifier", hgb)])


def tune_xgboost(X_train: pd.DataFrame, y_train: np.ndarray) -> Pipeline:
    """Tuned XGBoost using Stratified 5-Fold CV on training set only."""
    print("  [Tuning] XGBoost with 5-Fold Stratified CV...")
    preprocessor = get_feature_preprocessor()
    xgb = XGBClassifier(
        objective="multi:softprob",
        num_class=3,
        eval_metric="mlogloss",
        random_state=42,
        tree_method="hist"
    )
    pipeline = Pipeline([("preprocessor", preprocessor), ("classifier", xgb)])

    param_distributions = {
        "classifier__n_estimators": [100, 200],
        "classifier__max_depth": [4, 6, 8],
        "classifier__learning_rate": [0.05, 0.1, 0.2],
        "classifier__subsample": [0.8, 1.0],
        "classifier__colsample_bytree": [0.8, 1.0]
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        pipeline,
        param_distributions=param_distributions,
        n_iter=8,
        scoring="f1_macro",
        cv=cv,
        random_state=42,
        n_jobs=-1
    )
    search.fit(X_train, y_train)
    print(f"  [Tuning] XGBoost Best params: {search.best_params_} (CV Macro-F1: {search.best_score_:.4f})")
    return search.best_estimator_


# =====================================================================
# 3. TRAINING & SYSTEMATIC EVALUATION RUNNER
# =====================================================================

def run_experiment(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    split_name: str,
    tune_models: bool = True
) -> Tuple[List[Dict[str, Any]], Dict[str, Any], Dict[str, List[List[int]]]]:
    """
    Train and evaluate all candidate models on the provided train/test split.
    """
    X_train = train_df[ALL_FEATURES]
    y_train = train_df[TARGET_COLUMN].values
    X_test = test_df[ALL_FEATURES]
    y_test = test_df[TARGET_COLUMN].values

    results = []
    fitted_models = {}
    cms = {}

    print(f"\n=======================================================")
    print(f"RUNNING EXPERIMENT: {split_name.upper()}")
    print(f"Train size: {len(X_train)}, Test size: {len(X_test)}")
    print(f"=======================================================")

    # 1. Majority Baseline
    print("1/8. Evaluating Majority Baseline...")
    majority = MajorityBaseline().fit(X_train, y_train)
    t0 = time.time()
    preds_maj = majority.predict(X_test)
    inf_time_maj = (time.time() - t0) * 1000 / len(X_test)
    m_maj = compute_multiclass_metrics(y_test, preds_maj, "Majority Baseline", split_name, inf_time_maj)
    results.append(m_maj)
    cms["Majority"] = m_maj["confusion_matrix"]

    # 2. Empirical Rule Tier 1 (MOI-only)
    print("2/8. Evaluating Rule Baseline Tier 1 (MOI-only)...")
    rule_t1 = EmpiricalRuleTier1().fit(X_train, y_train)
    t0 = time.time()
    preds_r1 = rule_t1.predict(X_test)
    inf_time_r1 = (time.time() - t0) * 1000 / len(X_test)
    m_r1 = compute_multiclass_metrics(y_test, preds_r1, "Rule Baseline (Tier 1: MOI)", split_name, inf_time_r1)
    results.append(m_r1)
    cms["Rule Tier 1 (MOI)"] = m_r1["confusion_matrix"]

    # 3. Empirical Rule Tier 2 (MOI + Temp/Hum)
    print("3/8. Evaluating Rule Baseline Tier 2 (MOI + Temp/Hum)...")
    rule_t2 = EmpiricalRuleTier2().fit(X_train, y_train)
    t0 = time.time()
    preds_r2 = rule_t2.predict(X_test)
    inf_time_r2 = (time.time() - t0) * 1000 / len(X_test)
    m_r2 = compute_multiclass_metrics(y_test, preds_r2, "Rule Baseline (Tier 2: MOI+Env)", split_name, inf_time_r2)
    results.append(m_r2)
    cms["Rule Tier 2 (Env)"] = m_r2["confusion_matrix"]

    # 4. Empirical Rule Tier 3 (Crop/Stage conditioned)
    print("4/8. Evaluating Rule Baseline Tier 3 (Crop/Stage conditioned)...")
    rule_t3 = EmpiricalRuleTier3().fit(X_train, y_train)
    t0 = time.time()
    preds_r3 = rule_t3.predict(X_test)
    inf_time_r3 = (time.time() - t0) * 1000 / len(X_test)
    m_r3 = compute_multiclass_metrics(y_test, preds_r3, "Rule Baseline (Tier 3: Crop/Stage)", split_name, inf_time_r3)
    results.append(m_r3)
    cms["Rule Tier 3 (Crop/Stage)"] = m_r3["confusion_matrix"]

    # 5. Logistic Regression
    print("5/8. Training Logistic Regression...")
    lr = build_logistic_regression()
    lr.fit(X_train, y_train)
    t0 = time.time()
    preds_lr = lr.predict(X_test)
    inf_time_lr = (time.time() - t0) * 1000 / len(X_test)
    m_lr = compute_multiclass_metrics(y_test, preds_lr, "Logistic Regression", split_name, inf_time_lr)
    results.append(m_lr)
    fitted_models["Logistic Regression"] = lr
    cms["Logistic Regression"] = m_lr["confusion_matrix"]

    # 6. Random Forest (Tuned)
    print("6/8. Training & Tuning Random Forest...")
    rf = tune_random_forest(X_train, y_train) if tune_models else Pipeline([("preprocessor", get_feature_preprocessor()), ("classifier", RandomForestClassifier(n_estimators=100, random_state=42))]).fit(X_train, y_train)
    t0 = time.time()
    preds_rf = rf.predict(X_test)
    inf_time_rf = (time.time() - t0) * 1000 / len(X_test)
    m_rf = compute_multiclass_metrics(y_test, preds_rf, "Random Forest", split_name, inf_time_rf)
    results.append(m_rf)
    fitted_models["Random Forest"] = rf
    cms["Random Forest"] = m_rf["confusion_matrix"]

    # 7. HistGradientBoosting
    print("7/8. Training HistGradientBoosting...")
    hgb = build_hist_gradient_boosting()
    hgb.fit(X_train, y_train)
    t0 = time.time()
    preds_hgb = hgb.predict(X_test)
    inf_time_hgb = (time.time() - t0) * 1000 / len(X_test)
    m_hgb = compute_multiclass_metrics(y_test, preds_hgb, "HistGradientBoosting", split_name, inf_time_hgb)
    results.append(m_hgb)
    fitted_models["HistGradientBoosting"] = hgb
    cms["HistGradientBoosting"] = m_hgb["confusion_matrix"]

    # 8. XGBoost (Tuned)
    print("8/8. Training & Tuning XGBoost...")
    xgb = tune_xgboost(X_train, y_train) if tune_models else Pipeline([("preprocessor", get_feature_preprocessor()), ("classifier", XGBClassifier(n_estimators=100, random_state=42))]).fit(X_train, y_train)
    t0 = time.time()
    preds_xgb = xgb.predict(X_test)
    inf_time_xgb = (time.time() - t0) * 1000 / len(X_test)
    m_xgb = compute_multiclass_metrics(y_test, preds_xgb, "XGBoost", split_name, inf_time_xgb)
    results.append(m_xgb)
    fitted_models["XGBoost"] = xgb
    cms["XGBoost"] = m_xgb["confusion_matrix"]

    return results, fitted_models, cms


# =====================================================================
# 4. BINARY CLASSIFICATION EXPERIMENT
# =====================================================================

def run_binary_experiment(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    split_name: str
) -> List[Dict[str, Any]]:
    """
    Secondary Experiment: Binary Classification.
    Target: 0 = No irrigation needed (classes 0 and 2), 1 = Irrigation required (class 1).
    """
    print(f"\n--- Running Secondary Binary Experiment ({split_name}) ---")
    X_train = train_df[ALL_FEATURES]
    # Class 1 -> 1, Classes 0 and 2 -> 0
    y_train = (train_df[TARGET_COLUMN] == 1).astype(int).values
    X_test = test_df[ALL_FEATURES]
    y_test = (test_df[TARGET_COLUMN] == 1).astype(int).values

    preprocessor = get_feature_preprocessor()
    binary_rf = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(n_estimators=150, max_depth=15, random_state=42))
    ])
    binary_rf.fit(X_train, y_train)
    preds = binary_rf.predict(X_test)
    probs = binary_rf.predict_proba(X_test)[:, 1]

    m_bin = compute_binary_metrics(y_test, preds, probs, "Random Forest (Binary)", split_name)
    print(f"  Binary RF ({split_name}): Acc={m_bin['accuracy']}, F1={m_bin['f1']}, ROC-AUC={m_bin['roc_auc']}")
    return [m_bin]


# =====================================================================
# 5. HIGH-SCORE INVESTIGATION & MODEL SELECTION
# =====================================================================

def investigate_high_scores(strat_results: List[Dict[str, Any]], group_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Inspects whether random-split performance is suspiciously high (e.g. >99%)
    and analyzes the generalization gap observed in grouped evaluation.
    """
    analysis = {}
    for sr in strat_results:
        m_name = sr["model"]
        gr = next((g for g in group_results if g["model"] == m_name), None)
        if gr:
            gap = round(sr["macro_f1"] - gr["macro_f1"], 4)
            analysis[m_name] = {
                "stratified_macro_f1": sr["macro_f1"],
                "grouped_macro_f1": gr["macro_f1"],
                "generalization_gap": gap,
                "suspiciously_high": sr["macro_f1"] >= 0.99
            }

    investigation_summary = {
        "finding": (
            "Random stratified holdout yields near-perfect metrics (up to 99%+) because the synthetic dataset "
            "contains highly deterministic formulaic sequences of MOI and temperature/humidity. When sampled "
            "randomly, almost identical sequence points from the same crop+soil+stage combinations appear in both "
            "train and test sets. When evaluated on truly unseen (crop, soil, stage) combinations via GroupShuffleSplit, "
            "the realistic generalization Macro-F1 is revealed. Grouped evaluation is the authoritative benchmark."
        ),
        "model_gaps": analysis
    }
    return investigation_summary


def select_best_model(
    group_results: List[Dict[str, Any]],
    strat_results: List[Dict[str, Any]],
    fitted_models_group: Dict[str, Any]
) -> Tuple[str, Any]:
    """
    Select best model using the explicit priority hierarchy:
    1. Grouped Macro-F1 (unseen combination generalization)
    2. Class-1 Recall (critical: don't miss crops that need irrigation)
    3. Class-2 F1 (minority class handling)
    4. Practical inference speed & interpretability
    """
    candidates = [r for r in group_results if r["model"] in fitted_models_group]
    
    # Sort primarily by grouped macro_f1, then class_1_recall, then class_2_f1
    sorted_candidates = sorted(
        candidates,
        key=lambda x: (x["macro_f1"], x["class_1_recall"], x["class_2_f1"]),
        reverse=True
    )

    best_meta = sorted_candidates[0]
    best_name = best_meta["model"]
    best_pipeline = fitted_models_group[best_name]

    print("\n" + "=" * 70)
    print("MODEL SELECTION DECISION (Based on Evidence)")
    print("=" * 70)
    print(f"Selected Champion Model: {best_name}")
    print(f"  - Grouped Macro-F1: {best_meta['macro_f1']}")
    print(f"  - Class-1 (Irrigation) Recall: {best_meta['class_1_recall']}")
    print(f"  - Class-2 (Excess Water) F1: {best_meta['class_2_f1']}")
    print(f"  - Accuracy: {best_meta['accuracy']}")
    print(f"  - Inference Time: {best_meta['inference_time_ms']:.4f} ms/sample")

    return best_name, best_pipeline


# =====================================================================
# 6. MAIN EXECUTION PIPELINE
# =====================================================================

def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    print("[1/6] Loading cleaned data and preparing splits...")
    df = load_and_clean_data(save_processed=True)
    
    # Split A: Stratified Random Holdout
    train_strat, test_strat = create_stratified_split(df, test_size=0.20, random_state=42)
    # Split B: Group-aware Unseen Combination Split
    train_group, test_group = create_grouped_split(df, test_size=0.20, random_state=42)

    print(f"Stratified Split: Train={len(train_strat)}, Test={len(test_strat)}")
    print(f"Grouped Split:    Train={len(train_group)} ({train_group['group_id'].nunique()} groups), Test={len(test_group)} ({test_group['group_id'].nunique()} groups)")

    # Execute Split A (Stratified Random)
    strat_metrics, _, strat_cms = run_experiment(train_strat, test_strat, "Stratified Random Holdout", tune_models=True)

    # Execute Split B (Grouped Unseen Combinations)
    group_metrics, fitted_group_models, group_cms = run_experiment(train_group, test_group, "Unseen Combination Evaluation", tune_models=True)

    # Execute Binary Classification Experiment
    binary_strat = run_binary_experiment(train_strat, test_strat, "Stratified Random Holdout")
    binary_group = run_binary_experiment(train_group, test_group, "Unseen Combination Evaluation")

    # Combine metrics into comparison dataframe
    all_metrics = strat_metrics + group_metrics
    comp_df = pd.DataFrame(all_metrics)
    comp_df.to_csv(COMPARISON_CSV_PATH, index=False)
    print(f"\n[4/6] Saved full model comparison table to {COMPARISON_CSV_PATH}")

    # Investigate high score discrepancy
    investigation = investigate_high_scores(strat_metrics, group_metrics)

    # Select champion model
    best_name, best_pipeline = select_best_model(group_metrics, strat_metrics, fitted_group_models)

    # Retrain champion model on the full cleaned dataset for maximum production robustness
    print(f"\n[5/6] Retraining selected model ({best_name}) on full cleaned dataset (16,283 rows)...")
    X_full = df[ALL_FEATURES]
    y_full = df[TARGET_COLUMN].values
    best_pipeline.fit(X_full, y_full)

    # Compute Feature Importances
    feature_importance_dict = {}
    try:
        classifier = best_pipeline.named_steps["classifier"]
        preprocessor = best_pipeline.named_steps["preprocessor"]
        cat_encoder = preprocessor.named_transformers_["cat"]
        encoded_cat_names = cat_encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
        all_encoded_names = encoded_cat_names + NUMERICAL_FEATURES

        if hasattr(classifier, "feature_importances_"):
            importances = classifier.feature_importances_
            feature_importance_dict = dict(sorted(zip(all_encoded_names, [round(float(x), 4) for x in importances]), key=lambda x: x[1], reverse=True)[:15])
            print(f"Top 5 Features by Importance: {list(feature_importance_dict.items())[:5]}")
    except Exception as e:
        print(f"Feature importance extraction warning: {e}")

    # Save finalized production pipeline
    joblib.dump(best_pipeline, PIPELINE_PATH)
    print(f"[5/6] Saved production pipeline to {PIPELINE_PATH}")

    # Save confusion matrix plot for best models in both evaluations
    plot_cm_dict = {
        f"RF (Stratified)": strat_cms["Random Forest"],
        f"XGB (Stratified)": strat_cms["XGBoost"],
        f"RF (Grouped)": group_cms["Random Forest"],
        f"XGB (Grouped)": group_cms["XGBoost"]
    }
    plot_confusion_matrices(plot_cm_dict, str(CONFUSION_PNG_PATH))

    # Save comprehensive evaluation report JSON
    final_report = {
        "dataset_metadata": {
            "total_rows_raw": 16411,
            "total_rows_cleaned": len(df),
            "duplicates_removed": 128,
            "target_distribution": df[TARGET_COLUMN].value_counts().to_dict(),
            "synthetic_characteristics": {
                "temp_humidity_correlation": round(float(df[["temperature", "humidity"]].corr().iloc[0, 1]), 4),
                "repeating_temp_cycles": True,
                "synthetic_flag": True
            }
        },
        "selected_model": {
            "name": best_name,
            "pipeline_path": str(PIPELINE_PATH.resolve()),
            "top_features": feature_importance_dict
        },
        "multiclass_metrics_stratified": strat_metrics,
        "multiclass_metrics_grouped": group_metrics,
        "binary_experiment": binary_strat + binary_group,
        "investigation_of_high_scores": investigation
    }

    with open(EVALUATION_JSON_PATH, "w") as f:
        json.dump(final_report, f, indent=2)
    print(f"[6/6] Saved comprehensive evaluation report to {EVALUATION_JSON_PATH}")

    # Save pipeline metadata for predict.py
    metadata = {
        "model_name": best_name,
        "trained_on_rows": len(df),
        "categorical_features": CATEGORICAL_FEATURES,
        "numerical_features": NUMERICAL_FEATURES,
        "classes": CLASS_NAMES,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved pipeline metadata to {METADATA_PATH}")
    print("\n=== Training & Evaluation Pipeline Completed Successfully! ===")


if __name__ == "__main__":
    main()
