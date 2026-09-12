# Smart Irrigation Module — AgriSmart AI

> **Bonus Module B — Intelligent Agriculture for a Sustainable Future**  
> An evidence-based, production-ready machine learning and agronomic decision system that answers the core farmer question:  
> **"Should the farmer irrigate this crop now, or not?"**

---

## Table of Contents

1. [Problem Statement & Scope](#1-problem-statement--scope)
2. [Dataset Audit & Critical Findings](#2-dataset-audit--critical-findings)
3. [Important Dataset Warning & Scientific Honesty](#3-important-dataset-warning--scientific-honesty)
4. [Target Class Semantics (Verified)](#4-target-class-semantics-verified)
5. [System Architecture & Weather Decoupling](#5-system-architecture--weather-decoupling)
6. [Validation Strategy](#6-validation-strategy)
7. [Systematic Model Comparison & Benchmark Results](#7-systematic-model-comparison--benchmark-results)
8. [Investigation of Suspiciously High Scores (>99%)](#8-investigation-of-suspiciously-high-scores-99)
9. [Secondary Experiment: Binary Classification](#9-secondary-experiment-binary-classification)
10. [Final Champion Model Selection](#10-final-champion-model-selection)
11. [Recommendation Engine & Weather Intelligence Layer](#11-recommendation-engine--weather-intelligence-layer)
12. [REST API Documentation & Usage](#12-rest-api-documentation--usage)
13. [Verification & Automated Test Suite](#13-verification--automated-test-suite)
14. [Limitations & Future Field Roadmap](#14-limitations--future-field-roadmap)
15. [External Real-World Validation](#external-real-world-validation)

---

## 1. Problem Statement & Scope

Over-irrigation leads to nutrient leaching, root rot, energy waste, and water depletion, while under-irrigation induces plant moisture stress, stunted vegetative growth, and reduced yield.

The AgriSmart Smart Irrigation module:
- Ingests crop type, soil type, growth stage, soil moisture, ambient temperature, and relative humidity.
- Predicts one of three physiological irrigation states:
  - `0`: **No irrigation required**
  - `1`: **Irrigation required**
  - `2`: **Excess water detected / avoid irrigation**
- Interfaces with a **Weather Intelligence Layer** to ingest current precipitation forecasts.
- Delivers a deterministic, actionable recommendation (e.g., *"Delay irrigation — significant rainfall expected"* or *"Irrigate now — standard volume"*).

---

## 2. Dataset Audit & Critical Findings

The model was developed using `cropdata_updated.csv`:

| Audit Check | Result | Notes |
|---|---|---|
| **Raw Records** | 16,411 | 7 features |
| **Cleaned Records** | 16,283 | 128 exact duplicates removed |
| **Missing Values** | 0 | Zero imputation required |
| **Contradictory Labels** | 0 | Every unique feature vector maps to exactly one class |
| **Target Distribution** | Class 0: 8,934 (54.87%)<br>Class 1: 6,227 (38.24%)<br>Class 2: 1,122 (6.89%) | Moderate class imbalance (Class 2 is 6.89%) |
| **Supported Crops (5)** | Wheat, Potato, Carrot, Tomato, Chilli | Balanced representation across crops |
| **Supported Soils (7)** | Black, Alluvial, Sandy, Red, Clay, Loam, Chalky Soil | Varied agricultural soil profiles |
| **Growth Stages (8)** | Germination, Seedling, Vegetative, Flowering, Pollination, Fruit/Bulb Formation, Maturation, Harvest | Covers complete crop lifecycle |
| **Unique (Crop, Soil, Stage) Groups** | 101 distinct groups | Group sizes range from 100 to 179 samples |

---

## 3. Important Dataset Warning & Scientific Honesty

> [!WARNING]
> **This dataset is algorithmically generated / synthetic.**  
> It must **NEVER** be described as real sensor or real-field telemetry.

During our exploratory audit, the following deterministic properties were uncovered:
1. **Temperature ↔ Humidity Correlation ≈ -0.9761**: In the natural atmosphere, relative humidity is non-linearly affected by vapor pressure, solar radiation, and wind. A correlation of -0.9761 indicates formulaic synthesis.
2. **Repeating Temperature Cycles**: Within each crop-soil-stage group, temperatures repeat in fixed cyclic ramps (e.g., 25°C → 46°C → 25°C).
3. **Structured Moisture Sequences**: MOI values increment predictably from 1 to 100 with synchronized temperature steps.

**Ethical and Methodological Commitment:**  
While suitable for prototyping architectural pipelines, models trained on this dataset must undergo validation on calibrated capacitance soil probes and real weather stations prior to deployment in real fields.

---

## 4. Target Class Semantics (Verified)

Empirical distribution of Soil Moisture (MOI) by class confirms the semantic mapping:

| Class | Semantic Meaning | MOI Mean | MOI Median | MOI IQR (Q25–Q75) | Practical Agricultural Implication |
|:---:|---|:---:|:---:|:---:|---|
| **0** | No irrigation required | 48.5 | 46.0 | 23.0 – 75.0 | Adequate moisture buffer for crop transpiration |
| **1** | Irrigation required | 32.7 | 31.0 | 16.0 – 48.0 | Root zone depleted; irrigation triggered |
| **2** | Excess water | 67.6 | 70.0 | 61.0 – 77.0 | Saturated soil; risks root hypoxia and fungal rot |

*Crucial Note on Thresholds:* MOI alone does **not** uniquely determine the target. For MOI between 1 and 20, the data contains both Class 0 and Class 1 in roughly 50/50 proportions depending on growth stage and crop tolerance. Therefore, global static rules (e.g., "MOI < 30 = Irrigate") are inadequate.

---

## 5. System Architecture & Weather Decoupling

Weather forecast features (such as rain probability and forecast precipitation) **do not exist in the training dataset**.

Passing fabricated or synthetic weather variables directly into the ML model would introduce severe training-serving skew and violate hackathon integrity rules.

Instead, AgriSmart employs a **Clean Layered Architecture**:

```
+-------------------------------------------------------------+
|                     Farmer / Sensor Inputs                  |
|  (crop, soil_type, growth_stage, moisture, temp, humidity)  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                 Trained ML Model Pipeline                   |
|     (OneHotEncoder + StandardScaler + XGBoost Classifier)   |
|          Strictly uses features from training data          |
+-------------------------------------------------------------+
                              |
                     Predicted Class (0/1/2)
                     + Class Probabilities
                              |
                              v
+-------------------------------------------------------------+
|                Weather Intelligence Layer                   |
|     (External live API / Forecast: Rain %, Expected mm)     |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|           Deterministic Recommendation Engine               |
|      - High Confidence + Rain >= 70%  -> "Delay Irrigation" |
|      - High Confidence + No Rain      -> "Irrigate Now"     |
|      - Class 2 (Excess) + Rain >= 70% -> "Drainage Alert"   |
|      - Borderline Confidence          -> "Monitor Closely"  |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|             Actionable Farmer Advisory JSON                 |
+-------------------------------------------------------------+
```

---

## 6. Validation Strategy

To prevent over-optimistic reporting, every model was evaluated against **two distinct split strategies**:

### Split A — Stratified Random Holdout (80/20)
- Standard benchmark split stratified on target class (Train: 13,026; Test: 3,257).
- Reflects conventional in-distribution test performance.

### Split B — Unseen Combination Evaluation (GroupShuffleSplit)
- Uses `GroupShuffleSplit` on composite `(crop, soil_type, growth_stage)` groups.
- Entire groups (21 out of 101 unique groups; 3,399 samples) are strictly held out from training.
- Evaluates whether the model generalizes to **unseen crop, soil, and growth-stage combinations** rather than memorizing formulaic sequences.

---

## 7. Systematic Model Comparison & Benchmark Results

Eight distinct approaches were trained and compared under identical conditions:

| Model | Split Strategy | Accuracy | Macro F1 | Class 1 Recall (Irrigate) | Class 2 F1 (Excess) | Inference Time (ms/sample) |
|---|---|:---:|:---:|:---:|:---:|:---:|
| **Majority Baseline** | Stratified Random | 0.5487 | 0.2362 | 0.0000 | 0.0000 | 0.0000 |
| **Rule Tier 1 (MOI-only)** | Stratified Random | 0.4378 | 0.4071 | 0.4904 | 0.2922 | 0.0001 |
| **Rule Tier 2 (MOI + Env)** | Stratified Random | 0.4805 | 0.4401 | 0.5241 | 0.2922 | 0.0007 |
| **Rule Tier 3 (Crop/Stage)** | Stratified Random | 0.4249 | 0.4043 | 0.6477 | 0.3437 | 0.0816 |
| **Logistic Regression** | Stratified Random | 0.7338 | 0.6555 | 0.8002 | 0.3422 | 0.0020 |
| **Random Forest (Tuned)** | Stratified Random | 0.9917 | 0.9764 | 0.9992 | 0.9379 | 0.0188 |
| **HistGradientBoosting** | Stratified Random | 0.9994 | 0.9982 | 1.0000 | 0.9955 | 0.0187 |
| **XGBoost (Tuned)** | Stratified Random | 0.9994 | 0.9982 | 1.0000 | 0.9955 | 0.0084 |
| | | | | | | |
| **Majority Baseline** | Unseen Combinations | 0.5502 | 0.2366 | 0.0000 | 0.0000 | 0.0000 |
| **Rule Tier 1 (MOI-only)** | Unseen Combinations | 0.4310 | 0.3963 | 0.5650 | 0.2684 | 0.0001 |
| **Rule Tier 2 (MOI + Env)** | Unseen Combinations | 0.4763 | 0.4313 | 0.6211 | 0.2684 | 0.0007 |
| **Rule Tier 3 (Crop/Stage)** | Unseen Combinations | 0.4184 | 0.3899 | 0.6364 | 0.2953 | 0.1113 |
| **Logistic Regression** | Unseen Combinations | 0.7202 | 0.6386 | 0.8117 | 0.3050 | 0.0017 |
| **Random Forest (Tuned)** | Unseen Combinations | 0.9467 | 0.8486 | 0.9646 | 0.6083 | 0.0164 |
| **HistGradientBoosting** | Unseen Combinations | 0.9550 | 0.8748 | 0.9677 | 0.6738 | 0.0204 |
| **XGBoost (Tuned) ★** | **Unseen Combinations** | **0.9556** | **0.8760** | **0.9685** | **0.6767** | **0.0078** |

*All thresholds for the rule baselines were strictly derived from training folds (never hard-coded or peeked from test data).*

---

## 8. Investigation of Suspiciously High Scores (>99%)

On the Stratified Random split, both HistGradientBoosting and XGBoost achieved **99.94% accuracy and 0.9982 Macro-F1**.

Rather than celebrating this as perfection, we investigated the underlying data mechanics:
- Because the dataset is synthetic, each `(crop, soil_type, growth_stage)` combination contains deterministic sequences of MOI (1→100) and cyclic temperatures (25→46).
- When samples are drawn at random (Stratified Holdout), nearly identical sequential points from the same combination fall into both train and test partitions. The tree models effectively memorize these mathematical trajectories.
- When evaluated on **unseen combinations** (Split B), the Macro-F1 drops from **99.82% to 87.60%** (a generalization gap of 12.22%).
- **Conclusion:** The Grouped Evaluation Macro-F1 (0.8760) is the honest, defensible estimate of model performance across novel agricultural profiles.

---

## 9. Secondary Experiment: Binary Classification

As required, we investigated a secondary binary formulation:
- `1`: **Irrigation Required** (Class 1)
- `0`: **No Irrigation Needed / Excess Water** (Classes 0 & 2 merged)

Results on Tuned Random Forest:
- **Stratified Holdout**: Accuracy = 99.85%, F1 = 0.9980, ROC-AUC = 1.0000
- **Unseen Combination Evaluation**: Accuracy = 96.91%, F1 = 0.9593, ROC-AUC = 0.9954

### Decision on Target Strategy
While binary classification produces higher nominal metrics (0.9593 F1 on unseen combinations), **the 3-class formulation was retained as the production model**. Merging Class 2 (Excess Water) into Class 0 would erase critical warnings about soil waterlogging, drainage failure, and root asphyxiation.

---

## 10. Final Champion Model Selection

**Selected Model: Tuned XGBoost Pipeline**

### Rationale
1. **Highest Generalization Macro-F1**: 0.8760 on unseen crop/soil/stage combinations.
2. **Superior Irrigation Detection**: 0.9685 Recall on Class 1 (misses fewer than 3.2% of crops needing water).
3. **Best Minority-Class Handling**: 0.6767 F1 on Class 2 (Excess Water) despite only 6.89% prevalence.
4. **Fast Inference**: 0.0078 ms/sample (more than 2x faster than Random Forest and HistGradientBoosting).
5. **Production Artifact**: Serialized as a self-contained scikit-learn pipeline (`OneHotEncoder` + `StandardScaler` + `XGBClassifier`) at `models/irrigation_pipeline.joblib`.

### Feature Importances (Top 5)
1. `temperature`: **22.50%**
2. `soil_moisture`: **12.61%**
3. `growth_stage_Maturation`: **7.50%**
4. `growth_stage_Fruit/Grain/Bulb Formation`: **6.67%**
5. `humidity`: **5.18%**

---

## 11. Recommendation Engine & Weather Intelligence Layer

The decision matrix translates model outputs and external weather context into clear instructions:

| ML State | Confidence | Weather Context | Action | Urgency | Example Advisory |
|---|:---:|---|:---:|:---:|---|
| **Class 1 (Irrigate)** | High (≥0.75) | Rain ≥ 70% or ≥ 5mm | `delay_irrigation` | Low | *"Delay irrigation — significant rainfall expected (rain probability: 85%, forecast: 12.0 mm)."* |
| **Class 1 (Irrigate)** | High (≥0.75) | Rain 40–69% | `reduce_irrigation` | Medium | *"Reduce irrigation volume — light rainfall expected (rain probability: 50%). Apply partial watering."* |
| **Class 1 (Irrigate)** | High (≥0.75) | No Rain (<40%) | `irrigate_now` | High | *"Irrigation is required. Apply standard irrigation volume for this crop and growth stage."* |
| **Class 1 (Irrigate)** | Low (<0.55) | Any | `monitor_closely` | Medium | *"Borderline irrigation condition — soil moisture is near threshold. Monitor closely."* |
| **Class 0 (Adequate)** | Any | Any | `no_irrigation` | Low | *"No irrigation required at this time. Soil moisture levels are within optimal range."* |
| **Class 2 (Excess)** | Any | Rain ≥ 70% | `avoid_irrigation` | Warning | *"Excess water detected — STRICTLY AVOID irrigation. Heavy rain forecast; clear drainage channels."* |
| **Class 2 (Excess)** | Any | No Rain | `avoid_irrigation` | Warning | *"Excess water detected — avoid irrigation. Allow field to drain and verify soil aeration."* |

---

## 12. REST API Documentation & Usage

The module includes a standalone Flask API located at `api/irrigation_api.py`.

### Start the API Server
```bash
python api/irrigation_api.py
```
Default URL: `http://localhost:5000`

### Endpoints

#### 1. Health Check
- **URL**: `GET /api/irrigation/health`
- **Response**:
```json
{
  "model_file": "irrigation_pipeline.joblib",
  "pipeline_ready": true,
  "service": "AgriSmart Smart Irrigation API",
  "status": "healthy"
}
```

#### 2. Metadata & Supported Features
- **URL**: `GET /api/irrigation/meta`
- Returns known categories, classes, and required schema.

#### 3. Prediction Endpoint
- **URL**: `POST /api/irrigation/predict`
- **Content-Type**: `application/json`

**Sample Request (Standard Irrigation):**
```json
{
  "crop": "Tomato",
  "soil_type": "Loam Soil",
  "growth_stage": "Flowering",
  "soil_moisture": 24,
  "temperature": 31,
  "humidity": 55.0
}
```

**Sample Response:**
```json
{
  "action": "irrigate_now",
  "confidence": 1.0,
  "confidence_level": "high",
  "explanation": "Soil moisture is deficient for the current crop and environmental demand (confidence: 100.0%).",
  "predicted_class": 1,
  "probabilities": {
    "excess_water": 0.0,
    "irrigation_required": 1.0,
    "no_irrigation": 0.0
  },
  "recommendation": "Irrigation is required. Apply standard irrigation volume for this crop and growth stage.",
  "status": "irrigation_required",
  "urgency": "high",
  "warnings": [],
  "weather_modified": false
}
```

**Sample Request (Weather-Integrated):**
```json
{
  "crop": "Tomato",
  "soil_type": "Loam Soil",
  "growth_stage": "Flowering",
  "soil_moisture": 24,
  "temperature": 31,
  "humidity": 55.0,
  "weather_context": {
    "rain_probability": 0.85,
    "forecast_rainfall_mm": 15.0
  }
}
```

**Sample Response (Delayed by Weather Intelligence):**
```json
{
  "action": "delay_irrigation",
  "confidence": 1.0,
  "confidence_level": "high",
  "explanation": "Crop requires water, but upcoming natural precipitation will suffice, avoiding unnecessary pumping and water waste.",
  "predicted_class": 1,
  "probabilities": {
    "excess_water": 0.0,
    "irrigation_required": 1.0,
    "no_irrigation": 0.0
  },
  "recommendation": "Delay irrigation — significant rainfall expected (rain probability: 85%, forecast: 15.0 mm). Re-evaluate soil moisture after rain.",
  "status": "irrigation_required",
  "urgency": "low",
  "warnings": [],
  "weather_modified": true
}
```

---

## 13. Verification & Automated Test Suite

A comprehensive test suite of **43 unit, edge-case, API, and robustness tests** is included in `tests/`.

### Run Test Suite
```bash
python -m pytest tests/ -v
```

### Test Coverage Highlights
- `test_predict.py`: Schema verification, alias normalization (`crop ID`, `MOI`, `temp`), missing key handling, non-numeric validation.
- `test_api.py`: Endpoint health, status codes, malformed JSON, content-type enforcement, weather context ingestion.
- `test_edge_cases.py`: Parameterized testing for **all 5 crops**, **all 7 soil types**, **all 8 growth stages**, boundary MOI values (0, 1, 10, 20, 50, 80, 100), and unknown categories (`handle_unknown='ignore'`).
- `test_robustness.py`: Monotonic moisture perturbation tests (MOI 80 → 10 increases irrigation probability), weather delay overrides, excess water warnings.

---

## 14. Limitations & Future Field Roadmap

1. **Synthetic Data Realism**: As documented, the dataset contains mathematical regularities (r = -0.9761). Before deployment on commercial farms, the pipeline should be retrained with real LoRaWAN FDR/TDR capacitance probes (e.g., Sentek Drill & Drop).
2. **Soil Matric Potential vs Volumetric Water Content**: The dataset records generic "MOI" (1–100). Agronomically, plant water stress is governed by soil water tension (kilopascals / matric potential) and field capacity, which vary widely between Sand and Clay.
3. **Rooting Depth Dynamics**: Effective root depth deepens from Germination to Fruit Formation; future iterations should incorporate root zone depletion models (FAO-56 Penman-Monteith).
4. **Independent Deployment**: This module is completely decoupled and ready for containerized deployment or microservice integration into the primary AgriSmart platform.

---

## External Real-World Validation

The production Smart Irrigation model was evaluated without retraining on an independently collected irrigation dataset from Mendeley Data. The external dataset contains real sensor measurements including soil moisture, air temperature, air humidity, crop type and irrigation ON/OFF status. Because the external dataset does not provide soil type and growth stage, these features were passed as unknown categories. Paddy and Barley are also unseen crop categories relative to the training dataset. Therefore this experiment is a transfer/robustness evaluation, not a complete real-world validation of every production feature. The external dataset was never used for training, model selection, hyperparameter tuning or threshold selection.

### External Validation Benchmark Summary

- **Dataset Source:** Mendeley Data (DOI: [10.17632/67gkrzbwrr.1](https://doi.org/10.17632/67gkrzbwrr.1)), 3,589 records collected via IoT sensor nodes in Iraq over 1 week (3,584 clean valid evaluation records).
- **Model Evaluated:** `bonus/irrigation/models/irrigation_pipeline.joblib` (frozen, untouched).

| Model / Baseline | Accuracy | Precision | Recall | F1 Score | ROC-AUC | Description |
|---|---|---|---|---|---|---|
| **Baseline A (Majority Class)** | 0.8354 | 0.0000 | 0.0000 | 0.0000 | 0.5000 | Always predicts OFF (0) |
| **Baseline B (Rule: MOI <= 35)** | 0.8337 | 0.4800 | 0.1220 | 0.1946 | N/A | Empirical rule derived from training set |
| **Baseline B2 (Rule: MOI <= 69)** | 0.2380 | 0.1745 | 0.9729 | 0.2960 | N/A | Binary F1-optimal rule from training set |
| **Production Model (6 Features)** | 0.8186 | 0.0714 | 0.0085 | 0.0152 | 0.5819 | Frozen production pipeline (OneHot + Scaler + XGBoost) |
| **Shared-Feature Model (4 Features)** | 0.8175 | 0.0152 | 0.0017 | 0.0030 | 0.6504 | Experimental benchmark trained strictly on 4 core features |

### Transfer Decision & Insights

- **Final Decision:** **Poor transfer**
- **Root Cause:** The failure to transfer is driven primarily by **environmental domain shift** in soil moisture distributions. In the synthetic training set, irrigation was triggered at lower moisture levels (mean MOI = 32.7, median = 31.0), whereas external Iraqi field sensors operated between 53% and 83% moisture (mean = 55.8, median = 57.0), triggering irrigation even above 55%. The model confidently classified these values as class 0 (no irrigation) or class 2 (excess water).
- **Secondary Experiment Verification:** Training a 4-feature model on original training data without missing features yielded similarly poor transfer (F1 = 0.0030), demonstrating that domain shift in sensor scale and regional farm practices, rather than missing categorical inputs alone, governs the gap.
- Full detailed analysis, charts, and robustness slices are available in [reports/external_validation/external_validation.md](reports/external_validation/external_validation.md).

