# AgriSmart-AI: 5-Minute SIH Prototype Demo Script

This guide outlines a high-impact, stage-by-stage presentation flow tailored for Smart India Hackathon (SIH) judges and agricultural domain experts.

---

## Demo Overview & Value Proposition (0:00 – 0:45)
- **Problem**: Traditional AI leaf scanners only output a static disease label without considering crop phenology, vector pressure, or neighborhood outbreaks. Farmers receive generic chemical advice with arbitrary dosages that violate safety intervals.
- **AgriSmart Solution**: An end-to-end, multi-factor crop protection platform integrating:
  1. Deep learning vision diagnosis (ConvNeXt-Tiny)
  2. Crop-growth-stage-aware risk forecasting
  3. Physical pest trap surveillance & vector thresholds
  4. Regional geospatial hotspot clustering
  5. Agronomist human-in-the-loop clinical verification
  6. Post-treatment recovery recheck logging
  7. Continuous learning dataset curation

---

## Act 1: The Farmer Flow & Dynamic Risk Forecasting (0:45 – 1:45)
1. **Login as Farmer**:
   - URL: `http://localhost:5173/login`
   - Credentials: `farmer_demo` / `farmer123`
2. **Dashboard Overview**:
   - Highlight the operational engines cards and live microclimate telemetry for Anand, Gujarat.
   - Point to the **Crop Growth Stage**: The tomato crop is currently at **Flowering** stage (high vulnerability window).
3. **Disease Detection & Dynamic 7-Day Forecast**:
   - Navigate to `/disease`.
   - Upload any leaf photo (or select a pre-tested sample).
   - Show diagnosis: ConvNeXt-Tiny infers **Early Blight (Alternaria solani)** with confidence score.
   - **Key Innovation — 7-Day Progression Forecast**:
     - Scroll to the dynamic forecast chart.
     - Explain to judges: *"Notice this isn't a hardcoded line. The backend risk engine combines the model confidence (22.5 pts) + high humidity (15 pts) + flowering crop stage (10 pts) + local neighborhood disease pressure to calculate daily progression."*
     - Point out the **Prototype Risk Engine** label and CIBRC chemical disclaimer: *"We never generate arbitrary chemical dosages; all chemical guidance requires CIBRC-registered label approvals."*

---

## Act 2: Pest Trap Surveillance & Vector Alerts (1:45 – 2:30)
1. **Navigate to Pest Traps** (`/pests`):
   - Explain: *"Diseases like leaf curl and bacterial wilt are spread by insect vectors. Our IPM module tracks sticky and pheromone traps."*
   - Show the summary cards: Total Pests Counted, Action Required Traps, Scouting Alerts.
2. **Record a Trap Count**:
   - Click **Record Trap Count**.
   - Select parcel: `Patel Organic Farms`.
   - Trap Mechanism: `Yellow Sticky Trap`.
   - Pest Vector: `Whitefly`.
   - Count: `35`.
   - Click **Save Observation**: Notice the threshold instantly flags **Action Required (EIL Exceeded)** because count &ge; 30.
   - Explain how vector counts automatically feed into the farm's disease risk score.

---

## Act 3: Outbreak Hotspots & Regional Surveillance (2:30 – 3:30)
1. **Navigate to Outbreak Hotspots** (`/hotspots`):
   - Show the interactive Leaflet map centered on Gujarat agricultural belts.
   - Point out the **Red and Orange Hotspot Circles**:
     - Explain: *"Using pure Python Haversine geodesic clustering (no heavy PostGIS required), the system scans all recent disease scans and pest alerts within a 25 km radius."*
   - Click on the **Anand Cluster**:
     - The map smoothly zooms to Anand.
     - Popup displays active incident count, affected farm parcels, and primary threats (`Early Blight`, `Whitefly`).
2. **Regional Surveillance Command** (`/regional-monitoring`):
   - Show the District Agricultural Officer (DAO) dashboard.
   - Demonstrates monitored acreage, dominant pathogens, and cluster summary table across Ahmedabad, Anand, Vadodara, and Surat.

---

## Act 4: Human-in-the-Loop Expert Validation & Provenance (3:30 – 4:15)
1. **Login as Agronomist / Expert**:
   - Log out or open in incognito window: `http://localhost:5173/login`
   - Credentials: `expert_demo` / `expert123` (Dr. Sunita Sharma, KVK Agronomist).
2. **Navigate to Expert Review** (`/expert`):
   - Show the **Pending Verification Queue**: Disease scans submitted by farmers awaiting clinical sign-off.
   - Click **Perform Expert Review** on a scan:
     - Notice the **Immutable AI Prediction Baseline** banner: The original ConvNeXt prediction and confidence are preserved for scientific provenance.
     - Select **Correct Diagnosis**: Enter verified diagnosis `Late Blight` with morphological notes (`Water-soaked lesions on leaf margins without concentric rings`).
     - Click **Commit Verification**.
     - Review is saved, and provenance remains untampered!

---

## Act 5: Treatment Follow-ups & Continuous Learning Retraining Dataset (4:15 – 5:00)
1. **Treatment Follow-up & Recovery** (`/followups`):
   - Show the 5-7 day recheck timeline: Compares Day 0 diagnosis vs Day 5 post-treatment recovery.
   - Demonstrates canopy recovery percentages (e.g. 90% recovery after bio-fungicide spray).
2. **Model Retraining Dataset Manager** (`/feedback`):
   - Navigate to `/feedback`.
   - Show how the expert review completed in Act 4 was automatically indexed as a **ground-truth retraining sample**!
   - Highlight:
     - Model baseline accuracy vs expert ground truth (concordance tracking).
     - **Auto Split (70/15/15)**: Splits samples into PyTorch train, val, and test partitions.
     - Click **Export CSV**: Downloads formatted manifest ready for `torchvision.datasets`.
     - Click **JSON**: Displays schema-compliant JSON manifest.

---

## Concluding Statement for Judges
> *"AgriSmart-AI bridges the gap between deep learning computer vision and real-world farm management. By pairing ConvNeXt-Tiny with phenological risk modeling, IPM vector monitoring, spatial epidemic clustering, and expert human-in-the-loop retraining, we have built a complete, resilient, and field-ready agricultural intelligence platform."*
