# AgriSmart-AI 🌱
### Intelligent, Multi-Factor Crop Health & Decision Support System

---

## 1. Problem Statement

**Crop Health Workflow Problem (`app/problem_statement_crop_health.txt`):**  
Farmers often recognise crop diseases or pest infestations only after visible damage has spread. Extension staff may cover large areas, while laboratory diagnosis and expert advice may not be immediately available. Weather, crop stage, variety, soil condition and local pest history influence risk, but these inputs are rarely combined into actionable farm-level alerts. Incorrect diagnosis may lead to delayed treatment, excessive or inappropriate pesticide use, increased cultivation cost, residue concerns and yield loss. The challenge is to provide timely, reliable and locally relevant detection, forecasting and management support.

**Hackathon Core & Model Contract Problem (`app/problem_statement_text.txt`):**  
The hackathon core challenge requires an automated AI-powered foliar disease classification system (`predict(image_path) -> class_label` / CLI) that accurately classifies single-leaf symptoms across a defined multi-crop taxonomy, evaluated honestly via macro-F1 and confusion matrix on held-out test data. Crucially, the solution must confront the severe real-world challenge of lab-to-field generalization (models trained on clean lab backgrounds degrading under field clutter and varying light), enforce safety constraints against arbitrary pesticide usage, and guarantee end-to-end reproducibility in under 10 minutes.

---

## 2. Core vs. Bonus & Implemented Crop-Health Workflow Stages

### Core vs. Bonus Overview

| Component | Category | Description | Status |
|---|---|---|---|
| **ConvNeXt-Tiny Vision Classifier** | **Core Task** | 38-class single-leaf symptom classification with CLI inference interface | ✅ Implemented |
| **Model Evaluation & Honest Split** | **Core Task** | Macro-F1, confusion matrix, and lab-to-field generalization audit | ✅ Implemented |
| **Crop Recommendation Engine** | **Bonus Module A** | Multi-class Random Forest for 22 crops based on soil NPK & climate | ✅ Implemented |
| **Smart Irrigation Engine** | **Bonus Module B** | 3-tier XGBoost scheduler based on soil moisture and crop stage | ✅ Implemented |
| **Live Weather Intelligence** | **Bonus Module C** | Open-Meteo FAO-56 evapotranspiration & spray window alerts | ✅ Implemented |
| **Sustainability Audit** | **Bonus Module D** | Deterministic 4-pillar agronomic scoring formula (0–100) | ✅ Implemented |
| **Multilingual AI Agronomist** | **Bonus Module E** | Tool-grounded conversational agent (Groq LLM + offline rule fallback) | ✅ Implemented |

### Implemented Canonical Workflow Stages (Stages 0–9)

| Stage | Name | Implementation & Persisted State | Frontend Route |
|---|---|---|---|
| **Stage 0** | **Farm Context** | Parcel crop, variety, stage, soil type, pH, moisture %, GPS coordinates | `/farm` |
| **Stage 1a** | **Leaf Detection** | ConvNeXt-Tiny inference, uncalibrated confidence, top-3, leaf extent | `/disease` |
| **Stage 1b** | **Pest & Sensors** | Manual scouting observation counts + field sensor telemetry (manual/simulated) | `/pests` |
| **Stage 2** | **Risk Forecasting** | Weather-driven 7-day risk projection, local disease incidence, driver breakdown | `/risk` |
| **Stage 3** | **IPM & Safety Gate** | Ordered tiers (monitoring → cultural → mechanical → biological → chemical); Safety Gate 2.1 blocks chemicals on unverified/low-confidence/unsupported crops | Integrated in `/disease` & `/risk` |
| **Stage 4** | **Actionable Alerts** | Persisted `Alert` records generated on high risk or pest threshold exceedance | `/dashboard` |
| **Stage 5** | **Expert Validation** | Low-confidence / mismatch / critical scans queued for human agronomist review; original AI prediction is immutable | `/expert` |
| **Stage 6** | **Extension Referrals** | Formal `Referral` records (Extension, KVK, Lab) with status tracking | `/referrals` |
| **Stage 7** | **Follow-up Loop** | Scheduled 5–7 day rechecks with overdue calculation and outcome tracking | `/followups` |
| **Stage 8** | **Learning Loop** | Expert-validated feedback dataset, 80/10/10 image-hash split, offline fine-tuning script (`model/finetune_from_feedback.py`), no auto-retraining | `/feedback` |
| **Stage 9** | **Officials Surveillance**| Geospatial hotspot clusters, 7-day preventive planning view, real operational outcome metrics | `/regional-monitoring` & `/hotspots` |

---

## 3. Architecture & Workflow Diagram

### Canonical Workflow Pipeline
```
STAGE 0  FARM CONTEXT
         crop, crop variety, crop stage, soil type, soil pH, soil moisture,
         location (lat/lon), farm size, irrigation type
              ↓
STAGE 1  DETECT
   1a  Image-based symptom identification: leaf photo → ConvNeXt → class,
       uncalibrated confidence, top-3, farmer-reported extent
   1b  Pest-trap / sensor inputs: manual scouting counts +
       manual/simulated sensor readings (soil moisture, temperature, humidity, pH)
              ↓
STAGE 2  FORECAST  (weather-based risk, 7 days)
         inputs: live+forecast weather, crop stage, cited variety susceptibility,
         soil condition, local pest/disease history (DB query), 1a, 1b
         output: score (0-100), level, drivers, breakdown, 7-day forecast
              ↓
STAGE 3  ADVISE  (IPM + Safety Gate 2.1, multilingual en/hi/gu)
         monitoring → cultural → mechanical → biological → chemical (strictly gated) → follow-up
              ↓
STAGE 4  ALERT   farm-level, actionable, generated from Stage 2 (persisted Alert rows)
              ↓
STAGE 5  EXPERT VALIDATION
         low confidence / critical / crop mismatch → queue → confirm | correct | reject
         AI prediction is strictly immutable
              ↓
STAGE 6  REFERRAL   extension / KVK / laboratory
         persisted Referral record with type, reason, status (recommended → requested → completed)
              ↓
STAGE 7  FOLLOW-UP MONITORING
         scheduled → due/overdue → recheck outcome (recovered / improved / unchanged / worse)
              ↓
STAGE 8  LEARN FROM FIELD CONFIRMATIONS
         expert-confirmed cases → feedback records with hash split (80/10/10) →
         (a) immediately: feed local incidence in Stages 2 & 9
         (b) offline: exportable dataset + manual fine-tune script (never auto-retrain)
              ↓
STAGE 9  OFFICIALS
         geospatial hotspot map + regional dashboard + 7-day preventive planning view +
         outcome metrics computed strictly from platform records
```

### System Architecture
- **Client Layer**: React 19 SPA built with Vite, Tailwind CSS, Lucide icons, Leaflet geospatial mapping, and client-side i18n localization (English, Hindi, Gujarati).
- **Application Server**: Django 5 + Django REST Framework on Python 3.11/3.13, providing JWT authentication, role-based access control, ownership verification, and model inference services.
- **Inference Service**: In-process singleton PyTorch ConvNeXt-Tiny classifier (CPU/GPU) with dynamic class loading from checkpoint metadata.
- **Telemetry Feeds**: Open-Meteo REST API for real-time microclimate observations, solar radiation, and FAO-56 evapotranspiration.

---

## 4. Dataset & Licence

- **PlantVillage Dataset**: Canonical foliar diagnostic dataset containing 54,305 controlled-condition single-leaf images across 38 classes (14 crop species). Published by Hughes & Salathé (2015) under the **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** licence.
- **PlantDoc Benchmark**: In-situ field evaluation benchmark containing 2,598 real-world crop leaf photographs capturing natural illumination, soil backdrops, and weed occlusions. Published by Singh et al. (2020) under **MIT Licence**.
- **Crop Recommendation Dataset**: 2,200 Indian agricultural soil and meteorological samples covering 22 crop varieties under open public research licence.
- **Organizers' Held-Out Field Set**: **Never used in training, tuning, or internal evaluation**.

---

## 5. Model & Training Recipe

- **Backbone Architecture**: `torchvision.models.convnext_tiny(weights='DEFAULT')` (28.6M parameters).
- **Classification Head**:
  ```python
  nn.Sequential(
      nn.LayerNorm(768, eps=1e-6),
      nn.Linear(768, 512),
      nn.GELU(),
      nn.Dropout(0.3),
      nn.Linear(512, 38)
  )
  ```
- **Two-Stage Transfer Learning Protocol** (reproduced in `model/train.py` from `report/Crop_disease_model_report.pdf`):
  - **Stage 1 (Classifier Warmup)**: 5 epochs, backbone frozen, AdamW ($\text{lr} = 1 \times 10^{-3}$, weight decay $= 1 \times 10^{-2}$), cross-entropy loss with label smoothing ($\epsilon = 0.1$).
  - **Stage 2 (Fine-tuning)**: 10 epochs, backbone stages 3 and 4 unfrozen, AdamW ($\text{lr} = 1 \times 10^{-4}$), CosineAnnealingLR scheduler ($\eta_{\min} = 1 \times 10^{-6}$).
  - Mixed precision (FP16/AMP) on NVIDIA A10G / optimized CPU inference fallback.

---

## 6. Evaluation Method & Split

- **Split Protocol**: Deterministic stratified split on the PlantVillage corpus using fixed random seed (`42`):
  - **Train Set**: 70% (38,014 images)
  - **Validation Set**: 15% (8,145 images)
  - **Internal Held-Out Test Set**: 15% (8,146 images)
- **Field Benchmark**: Evaluated on the independent PlantDoc field dataset (2,598 images) without retraining to quantify the lab-to-field generalization drop.
- **Organizers' Evaluation**: **Not evaluated** (competition blind test set).

---

## 7. Macro-F1 & Accuracy

| Evaluation Dataset | Test Condition | Accuracy | Macro-F1 | Provenance / Citation |
|---|---|---|---|---|
| **PlantVillage Test** | Controlled Lab Split (8,146 imgs) | **98.56%** | **0.9851** | Documented in `report/Crop_disease_model_report.pdf` |
| **PlantDoc Benchmark** | In-situ Field Photos (2,598 imgs) | **55.51%** | **0.5420** | Documented in `report/Crop_disease_model_report.pdf` |
| **Organizers' Held-Out Set**| Competition Blind Test | **Not evaluated** | **Not evaluated** | Organizers' private evaluation set |

*Note: Raw accuracy is deceptive on imbalanced agricultural datasets; Macro-F1 averages performance across all 38 classes equally.*

---

## 8. Confusion Matrix

- **In-Distribution & Smoke Test Confusion Matrices**: Generated via `model/evaluate.py` and saved to `report/smoke_test_eval/confusion_matrix.png` and `report/smoke_test_eval/confusion_matrix.csv`.
- **Field-Condition Confusion Matrix**: Located at `model/crop_disease_detection/plantdoc_confusion_matrix.png`, documenting confusion patterns under variable field illumination.

---

## 9. Per-Class Precision & Recall

Per-class metrics for all 38 classes on the PlantVillage lab test split are documented in `report/model_report.md` and `report/Crop_disease_model_report.pdf`. Key representative classes:

| Crop & Disease State | Precision | Recall | F1-Score | Support |
|---|---|---|---|---|
| **Tomato — Early Blight** | 0.981 | 0.979 | 0.980 | 210 |
| **Tomato — Late Blight** | 0.984 | 0.988 | 0.986 | 212 |
| **Tomato — Healthy** | 0.995 | 0.995 | 0.995 | 225 |
| **Potato — Early Blight** | 0.978 | 0.980 | 0.979 | 150 |
| **Potato — Late Blight** | 0.981 | 0.975 | 0.978 | 148 |
| **Corn — Common Rust** | 0.991 | 0.991 | 0.991 | 179 |
| **Corn — Northern Leaf Blight** | 0.965 | 0.960 | 0.962 | 148 |
| **Apple — Apple Scab** | 0.973 | 0.968 | 0.970 | 125 |

---

## 10. Known Limitations

1. **Lab-to-Field Domain Gap**: The model was trained predominantly on clean laboratory imagery. Real-world field accuracy drops (55.51% on PlantDoc) due to complex soil backgrounds, weed foliage, shadows, and angle variations.
2. **Unsupported Staple Crops**: The model's 38 classes do **not** include major Indian staples (paddy/rice, wheat, cotton, sugarcane). When registered on a farm, the system displays *"Crop not supported by image model"* and routes directly to expert extension review rather than forcing an invalid prediction.
3. **Uncalibrated Model Confidence**: Softmax output represents relative class logit scores, not calibrated Bayesian probabilities. In the UI, confidence is explicitly labeled *"Model confidence (uncalibrated)"*.
4. **Prototype Risk Engine**: The 7-day risk forecasting engine provides heuristic decision support based on weather, phenology, and neighborhood incidence; it is not a clinically validated epidemiological guarantee.
5. **Static KVK Directory**: Institutional referral contacts are sourced from a curated demonstration directory; contacts are explicitly labeled *"Demo/static directory, verify contact before use"*.
6. **Simulated & Manual Sensors**: Sensor readings are labeled *"Manual entry"* or *"Simulated sensor data"*; the platform makes no claim of proprietary IoT hardware.
7. **No Automated Pest-Vision Model**: Pest observations are recorded via manual field scouting counts on sticky/pheromone traps.
8. **No Automatic Retraining**: Production checkpoints are strictly frozen. User-submitted feedback records form an offline dataset evaluated manually via `model/finetune_from_feedback.py`.

---

## 11. Installation

### Prerequisites
- **Python**: Version `3.10`, `3.11`, or `3.13`
- **Node.js**: Version `18.x` or `20.x` with `npm`
- **Git & Git LFS**: Installed on host machine

### Clone Repository & Pull Model Weights
```bash
git clone https://github.com/Yash19k/Agrismart-AI.git
cd Agrismart-AI

# Switch to the workflow branch
git checkout ps-workflow-p0

# Pull Git LFS model checkpoint (111 MB ConvNeXt-Tiny weights)
git lfs install
git lfs pull

# Verify model weights sha256
python scripts/verify_weights.py
```

### Python Virtual Environment & Backend Setup
```bash
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

### Frontend Dependencies Setup
```bash
cd src
npm install
cd ..
```

---

## 12. Backend Start

```bash
cd app
python manage.py migrate
python manage.py seed_sih_demo
python manage.py runserver 127.0.0.1:8000
```
- API Base URL: `http://127.0.0.1:8000/api/`
- Admin Panel: `http://127.0.0.1:8000/admin/`

---

## 13. Frontend Start

```bash
cd src
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 14. Single-Image Inference Command

To run instant command-line prediction on any leaf image without starting the server:

```bash
python model/crop_disease_detection/predict.py --image src/public/sample_leaves/tomato_early_blight.jpg
```
**Output Format:**
```text
Predicted class: Tomato___Septoria_leaf_spot
Confidence: 0.2397
```

---

## 15. Demo Users & "Demo Data" Explanation

The database seed command (`python manage.py seed_sih_demo`) pre-configures three operational role accounts:

| Role | Username | Password | Intended Workflow |
|---|---|---|---|
| **Farmer** | `farmer_demo` | `farmer123` | Farm context, leaf scan, pest & sensor log, risk forecast, referrals, follow-up |
| **Agronomist / Expert** | `expert_demo` | `expert123` | Verification queue, confirm/correct diagnoses, referrals, outbreak hotspots |
| **Agriculture Officer** | `officer_demo` | `officer123` | Regional monitoring, 7-day preventive planning, outcome metrics, feedback export |

### Demo Data Transparency
All records generated for demo accounts carry the `is_demo=True` attribute. In the web interface, active demo sessions display a prominent **Demo Account** banner. In the officer dashboard, demo records are segregated into a dedicated `demo_records_pct` metric and are excluded from feedback dataset exports by default.

---

## 16. Feature Walkthrough

1. **Stage 0 — Farm Context (`/farm`)**: Configure parcel crop, variety, phenological stage (seedling, vegetative, flowering, fruiting, maturity), soil type, pH, moisture %, and coordinates.
2. **Stage 1a — Leaf Diagnosis (`/disease`)**: Upload a leaf image, select observed damage extent, and receive real-time ConvNeXt-Tiny classification, uncalibrated confidence, top-3 candidates, and typical reference severity.
3. **Stage 1b — Pest & Sensor Telemetry (`/pests`)**: Log sticky trap or leaf scouting insect counts (Whitefly, Thrips, Aphids) and log or simulate parcel sensor readings (soil moisture, temperature, humidity, pH).
4. **Stage 2 — 7-Day Risk Forecasting (`/risk`)**: View dynamic weather-driven disease risk projections incorporating live microclimate, growth stage, soil conditions, and real DB neighborhood disease incidence.
5. **Stage 3 — Multilingual IPM Advisory**: Review hierarchical IPM interventions (monitoring → cultural → mechanical → biological → restricted chemical). Safety Gate 2.1 blocks chemical recommendations on unverified or low-confidence scans. Available in English, Hindi, and Gujarati.
6. **Stage 4 — Actionable Alerts (`/dashboard`)**: Receive automated notifications whenever disease risk reaches High/Critical or vector counts exceed economic injury levels.
7. **Stage 5 — Expert Review Queue (`/expert`)**: Extension agronomists inspect auto-flagged scans, confirm or correct diagnoses with agronomic notes, while preserving the original AI prediction as immutable baseline.
8. **Stage 6 — Extension Referrals (`/referrals`)**: Formal referral records connect farmers to local Krishi Vigyan Kendras (KVK) and diagnostic labs.
9. **Stage 7 — Follow-up Monitoring (`/followups`)**: Track post-treatment recovery 5–7 days after advisory issuance, logging outcomes (recovered, improved, unchanged, worse) linked to the original scan.
10. **Stage 8 — Feedback Dataset & Offline Retraining (`/feedback`)**: Inspect expert-validated records with deterministic 80/10/10 hash-based partitioning. Run `python model/finetune_from_feedback.py` for offline fine-tuning and model registry logging.
11. **Stage 9 — Regional Surveillance & Preventive Planning (`/regional-monitoring`, `/hotspots`)**: District agricultural officers analyze geospatial outbreak clusters, inspect farms forecast at high risk over the next 7 days, and review real platform outcome metrics.

---

## 17. Third-Party / Open-Source Attribution & Originality Declaration

### Third-Party Libraries & Frameworks
- **Deep Learning**: PyTorch & Torchvision (`torch`, `torchvision`) for neural network training and inference.
- **Web Backend**: Django, Django REST Framework, SimpleJWT for token authentication, django-cors-headers.
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React icons, Leaflet & React-Leaflet for mapping.
- **External Meteorological API**: Open-Meteo API (Open-Meteo.com) for real-time weather, solar radiation, and FAO-56 evapotranspiration telemetry.

### Originality Declaration
We certify that the architectural workflow, the 10-stage Problem Statement pipeline, the deterministic risk engine (`app/risk/engine.py`), the Safety Gate 2.1 IPM controller (`app/risk/ipm.py`), the Haversine geospatial clustering service (`app/hotspots/services.py`), the sensor ingest service (`app/sensors/`), the formal referral subsystem (`app/referral/`), the offline feedback dataset pipeline (`app/feedback/`), and the React user interface components were authored specifically for this application under the MIT licence.

---

## 18. Demonstration Video & Deployment Links

- **Video Demonstration**: `[Placeholder: Video Walkthrough Link]` *(To be added upon final submission)*
- **Live Staging Deployment**: `[Placeholder: Deployed Application URL]` *(To be added upon cloud staging deployment)*
