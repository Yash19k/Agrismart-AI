# AgriSmart-AI: Demonstration Script (Problem Statement Workflow)

This guide outlines a stage-by-stage presentation flow matching the 10-stage Problem Statement (PS) workflow for Smart India Hackathon (SIH) evaluators and agricultural domain experts.

---

## Architecture & Workflow Overview (0:00 – 0:45)
- **Problem**: Farmers often recognize diseases only after visible foliar symptoms spread. Sensor readings, weather forecasts, crop stage, and local pest history are rarely combined into actionable farm-level alerts. Inaccurate diagnosis triggers inappropriate chemical spraying and yield loss.
- **AgriSmart Solution**: An end-to-end, multi-factor crop protection platform structured stage-by-stage:
  - **Stage 0**: Farm Context (crop, variety, growth stage, soil type, pH, moisture, GPS location)
  - **Stage 1**: Detection (1a: ConvNeXt-Tiny leaf symptom classification; 1b: Manual pest scouting observations & field sensor telemetry)
  - **Stage 2**: Weather-Driven Risk Engine (7-day forecast, local disease history, soil & stage drivers)
  - **Stage 3**: Multilingual IPM Advisory & Safety Gate 2.1 (monitoring → cultural → mechanical → biological → restricted chemical)
  - **Stage 4**: Farm-Level Actionable Alerts
  - **Stage 5**: Expert Human-in-the-Loop Validation (immutable AI prediction baseline)
  - **Stage 6**: Formal Referral Records (Extension, KVK, Diagnostic Lab)
  - **Stage 7**: Follow-up Monitoring Loop (due/overdue tracking & outcome recording)
  - **Stage 8**: Learning Loop (offline feedback dataset curation & hash-split manifest, no auto-retraining)
  - **Stage 9**: Agriculture Officials Surveillance (geospatial hotspot clusters, 7-day preventive planning, platform outcome metrics)

---

## Act 1: Farm Context & Disease Detection (Stages 0, 1a, 2, 3) (0:45 – 2:00)
1. **Login as Farmer**:
   - URL: `http://localhost:5173/login`
   - Credentials: `farmer_demo` / `farmer123`
2. **Stage 0 — Farm Context**:
   - Navigate to **My Farm (Context)** (`/farm`).
   - Review parcel `Patel Organic Farms`: Crop (`Tomato`), Variety (`Abhinav F1`), Stage (`flowering`), Soil (`loamy`, pH `6.8`, moisture `33%`).
3. **Stage 1a — Leaf Symptom Detection**:
   - Navigate to **Scan Crop Leaf** (`/disease`).
   - Upload a leaf image (e.g. `src/public/sample_leaves/sample_early_blight.JPG`).
   - Select leaf damage extent: `10–30% of leaves affected`.
   - Click **Run Model Diagnosis**.
   - Model outputs: `Tomato___Early_blight` with **uncalibrated model confidence**, top-3 class probabilities, and reference typical severity.
4. **Stage 2 — 7-Day Risk Projection**:
   - Show dynamic 7-day forecast curve driven by live/forecast weather, crop stage, and local neighborhood incidence.
   - Transparent driver breakdown: air temperature, high humidity, flowering stage vulnerability.
5. **Stage 3 — IPM Advisory & Safety Gate 2.1**:
   - Point out ordered IPM tiers: Monitoring → Cultural → Mechanical → Biological → Chemical (Restricted Caveat) → Follow-up.
   - Point out Safety Gate: If confidence < 0.80 or crop mismatch, chemical advice is strictly blocked with *"Diagnosis uncertain. Do not spray. Get an expert review."*

---

## Act 2: Pest Scouting & Sensor Surveillance (Stage 1b) (2:00 – 2:45)
1. **Navigate to Pest & Sensor** (`/pests`):
   - Review **Pest Scouting Tab**: Shows sticky card and lure observations labeled explicitly as **Manual scouting observation**.
   - Click **Record Scouting Count**: Log Whitefly count &ge; 35 &rarr; flags **Action Required (EIL Exceeded)**.
2. **Sensor Readings Tab**:
   - View latest parcel sensor telemetry: Soil moisture, temperature, humidity, pH.
   - Demonstrates **Manual entry** vs **Simulated sensor data** (labeled transparently; no false claims of IoT hardware).

---

## Act 3: Alerts, Referrals & Follow-ups (Stages 4, 6, 7) (2:45 – 3:30)
1. **Stage 4 — Actionable Alerts**:
   - Review farm alerts generated automatically when high risk or pest damage thresholds are exceeded.
2. **Stage 6 — Extension Referrals**:
   - Navigate to **Extension Referrals** (`/referrals`).
   - View formal referral record (Type: `KVK`, Reason: `High risk early blight with vector pressure`, Status: `requested`).
   - Static directory contacts labeled as demo/directory entries.
3. **Stage 7 — Follow-up Monitoring**:
   - Navigate to **Follow-ups** (`/followups`).
   - View scheduled 5–7 day recheck with overdue calculation.
   - Complete follow-up with real outcome (`improved` / `recovered`) linked to original scan.

---

## Act 4: Expert Validation (Stage 5) (3:30 – 4:15)
1. **Login as Expert / Agronomist**:
   - Credentials: `expert_demo` / `expert123`
2. **Navigate to Review Queue** (`/expert`):
   - View scans auto-routed for review (low confidence, crop mismatch, or critical risk).
   - Inspect scan: Note **Immutable AI Prediction Baseline** banner. The original ConvNeXt prediction is preserved for scientific integrity.
   - Confirm or correct diagnosis with field agronomic notes.

---

## Act 5: Officials Dashboard & Learning Loop (Stages 8, 9) (4:15 – 5:00)
1. **Login as Agriculture Officer**:
   - Credentials: `officer_demo` / `officer123`
2. **Stage 9 — Regional Surveillance & Preventive Planning**:
   - Navigate to **Regional Monitoring** (`/regional-monitoring`): View active disease clusters, dominant pathogens, and monitored acreage.
   - **Preventive Planning View**: Table of farms and districts forecast at high risk over the next 7 days to enable proactive preventive interventions.
   - **Outcome Metrics Panel**: Metrics calculated from operational platform records (% auto-flagged, median review time, referral completion rate, follow-up recovery rate, non-chemical first-line rate). No fabricated "crop loss saved" numbers.
   - Navigate to **Outbreak Hotspots** (`/hotspots`): Interactive Leaflet map with Haversine geodesic epidemic clusters.
3. **Stage 8 — Feedback Dataset & Offline Model Registry**:
   - Navigate to **Feedback Dataset** (`/feedback`).
   - Shows expert-validated records with deterministic 80/10/10 image-hash split.
   - Export manifest via CSV or ZIP (demo records excluded by default).
   - Demonstrates `model/finetune_from_feedback.py` manual offline retraining script with registry logging (production model is never auto-retrained).
