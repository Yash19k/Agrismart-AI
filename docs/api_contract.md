# AgriSmart-AI: Comprehensive API Contract Audit

This document audits all frontend API calls, backend Django REST Framework endpoints, HTTP methods, request payloads, response structures, authentication and role permissions, and client-side error/loading handling.

---

## 1. Authentication & Session (`/api/auth/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/auth/login/` | `POST` | `{ "username": str, "password": str }` | `{ "access": str, "refresh": str, "user": { "id", "username", "role", "name", "is_demo" } }` | `AllowAny` | `src/src/api/auth.js: login()` |
| `/api/auth/register/` | `POST` | `{ "username", "password", "name", "role", "email" }` | `{ "access": str, "refresh": str, "user": { ... } }` | `AllowAny` | `src/src/api/auth.js: register()` |
| `/api/auth/me/` | `GET` | Headers: `Bearer <token>` | `{ "id", "username", "role", "name", "email", "is_demo" }` | `IsAuthenticated` | `src/src/api/auth.js: getCurrentUser()` |
| `/api/auth/token/refresh/` | `POST` | `{ "refresh": str }` | `{ "access": str }` | `AllowAny` | Axios 401 interceptor |

**Error Handling**: Invalid credentials return HTTP 401 with `{ "detail": "No active account found with the given credentials" }`. Client clears token on refresh failure and redirects cleanly without infinite loops.

---

## 2. Farm Context (Stage 0) (`/api/farms/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/farms/` | `GET` | Query: optional search | `[ { "id", "farm_name", "location_lat", "location_lon", "crop", "crop_variety", "crop_stage", "soil_type", "soil_ph", "soil_moisture_pct", "farm_size", "irrigation_type" } ]` | `IsAuthenticated` (Farmer: own; Officer/Expert: all) | `src/src/api/farms.js: getFarms()` |
| `/api/farms/` | `POST` | `{ "farm_name", "location_lat", "location_lon", "crop", "crop_variety"?, "crop_stage"?, "soil_type"?, "soil_ph"?, "soil_moisture_pct"?, "farm_size"?, "irrigation_type"? }` | Created Farm object | `IsFarmer` | `src/src/api/farms.js: createFarm()` |
| `/api/farms/<id>/` | `PUT/PATCH` | Context update fields | Updated Farm object | `IsFarmer` (Owner) | `src/src/api/farms.js: updateFarm()` |

---

## 3. Disease Detection (Stage 1a) (`/api/disease/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/disease/predict/` | `POST` | `multipart/form-data`: `image` (file, max 8MB), `farm_id` (int), `extent` (str: `<10%`, `10-30%`, `>30%`, `unknown`) | `{ "scan_id", "predicted_class", "confidence", "uncalibrated_confidence_label", "confidence_level", "is_healthy", "top3": [...], "safety_gate": { "triggered", "chemical_permitted", "reason" }, "advisory": { "ipm_steps": [...] }, "risk_assessment": { ... }, "typical_severity": { "level", "note" }, "extent_reported": str, "referral_recommended": bool, "needs_expert_review": bool }` | `IsAuthenticated` | `src/src/api/disease.js: predictDisease()` |
| `/api/disease/history/` | `GET` | Query: `farm_id` | `[ DiseaseScan objects ]` | `IsAuthenticated` | `src/src/api/disease.js: getScanHistory()` |
| `/api/disease/model-metadata/`| `GET` | None | `{ "model_name", "classes_count", "architecture", "evaluation": metrics.json or null }` | `IsAuthenticated` | `src/src/api/disease.js: getModelMetadata()` |

**Error Handling**:
- Corrupt/non-image upload → HTTP 400 `{ "error": "CORRUPT_IMAGE" }`
- Oversized file (>8MB) → HTTP 400 `{ "error": "IMAGE_TOO_LARGE" }`
- Missing/LFS-pointer weights → HTTP 503 `{ "error": "MODEL_WEIGHTS_UNAVAILABLE" }`
- Inference failure → HTTP 500 `{ "error": "INFERENCE_ERROR" }`
- Strictly zero fake fallbacks.

---

## 4. Pest & Sensor Surveillance (Stage 1b) (`/api/pests/`, `/api/sensors/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/pests/observations/` | `GET` | Query: `farm_id`, `pest_type`, `threshold_level` | `[ PestObservation objects with "Manual scouting observation" ]` | `IsAuthenticated` | `src/src/api/pests.js: getPestObservations()` |
| `/api/pests/observations/` | `POST` | `multipart/form-data`: `farm`, `trap_type`, `pest_type`, `pest_count`, `notes`?, `image`? | Created PestObservation | `IsFarmer` (Owner) | `src/src/api/pests.js: createPestObservation()` |
| `/api/sensors/readings/` | `GET` | Query: `farm_id` | `[ SensorReading objects with source "manual" or "simulated" ]` | `IsAuthenticated` | `src/src/api/sensors.js: getSensorReadings()` |
| `/api/sensors/readings/` | `POST` | `{ "farm", "soil_moisture"?, "temperature"?, "humidity"?, "ph"?, "source": "manual"|"simulated" }` | Created SensorReading | `IsAuthenticated` | `src/src/api/sensors.js: createSensorReading()` |
| `/api/sensors/latest/` | `GET` | Query: `farm_id` | Latest SensorReading or `null` | `IsAuthenticated` | `src/src/api/sensors.js: getLatestSensorReading()` |

---

## 5. Risk Engine & 7-Day Forecast (Stage 2) (`/api/risk/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/risk/calculate/` | `POST` | `{ "farm_id": int, "disease_name"?: str, "extent"?: str }` | `{ "score": float, "level": str, "drivers": [...], "breakdown": { ... }, "inputs_used": [...], "inputs_missing": [...], "forecast_7day": [ { "day", "risk", "value", "temp_max", "humidity", "rain_prob" } ], "local_incidence": { "verified_count", "unverified_count", "radius_km" }, "model_label": "Prototype decision-support risk score" }` | `IsAuthenticated` (Ownership enforced) | `src/src/api/risk.js: calculateRisk()` |
| `/api/risk/farm/<id>/` | `GET` | Path: `id` | Risk calculation for farm | `IsAuthenticated` (Ownership enforced) | `src/src/api/risk.js: getFarmRisk()` |

---

## 6. Alerts (Stage 4) (`/api/alerts/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/alerts/` | `GET` | Query: `farm_id` | `[ Alert objects: { "id", "title", "severity", "message", "alert_type", "is_read", "created_at" } ]` | `IsAuthenticated` | `src/src/api/alerts.js: getAlerts()` |
| `/api/alerts/<id>/` | `PATCH` | `{ "is_read": bool }` | Updated Alert | `IsAuthenticated` | `src/src/api/alerts.js: markAlertRead()` |

---

## 7. Expert Validation (Stage 5) (`/api/expert/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/expert/queue/` | `GET` | None | `[ Scans where needs_expert_review=True ]` | `IsExpertOrOfficer` | `src/src/api/expert.js: getReviewQueue()` |
| `/api/expert/reviews/` | `POST` | `{ "scan": int, "status": "confirmed"|"corrected"|"rejected", "expert_diagnosis": str, "notes": str }` | Created ExpertReview (AI prediction left immutable) | `IsExpertOrOfficer` | `src/src/api/expert.js: createReview()` |

---

## 8. Extension Referrals (Stage 6) (`/api/referrals/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/referrals/` | `GET` | Query: `farm_id` | `[ Referral objects: { "id", "referral_type", "reason", "status", "directory_entry" } ]` | `IsAuthenticated` | `src/src/api/referrals.js: getReferrals()` |
| `/api/referrals/` | `POST` | `{ "farm": int, "scan"?: int, "referral_type": str, "reason": str }` | Created Referral | `IsAuthenticated` | `src/src/api/referrals.js: createReferral()` |
| `/api/referrals/<id>/` | `PATCH` | `{ "status": "requested"|"in_review"|"completed"|"declined" }` | Updated Referral | `IsAuthenticated` | `src/src/api/referrals.js: updateReferralStatus()` |
| `/api/referrals/directory/` | `GET` | None | `[ Static KVK / Lab entries labeled demo ]` | `IsAuthenticated` | `src/src/api/referrals.js: getDirectory()` |

---

## 9. Follow-Up Monitoring (Stage 7) (`/api/followups/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/followups/` | `GET` | None | `[ FollowUp objects: { "id", "due_date", "status", "outcome", "is_overdue" } ]` | `IsAuthenticated` | `src/src/api/followups.js: getFollowUps()` |
| `/api/followups/<id>/` | `PATCH` | `{ "status": "completed", "outcome": "recovered"|"improved"|"unchanged"|"worse", "notes": str }` | Updated FollowUp | `IsAuthenticated` | `src/src/api/followups.js: completeFollowUp()` |

---

## 10. Regional Surveillance & Hotspots (Stage 9) (`/api/hotspots/`, `/api/dashboard/officer/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/hotspots/clusters/` | `GET` | Query: `radius_km`, `min_cases` | `[ Haversine clusters of active disease/pest cases ]` | `IsExpertOrOfficer` | `src/src/api/hotspots.js: getHotspotClusters()` |
| `/api/dashboard/officer/` | `GET` | None | `{ "stats": { "total_farms", "total_scans", "auto_flagged_pct", "median_review_time_hours", "referral_completion_rate", "followup_recovery_rate", "non_chemical_firstline_pct", "demo_records_pct" }, "recent_scans": [...], "pending_reviews": [...] }` | `IsOfficer` | `src/src/api/dashboard.js: getOfficerDashboard()` |
| `/api/dashboard/officer/preventive-planning/` | `GET` | None | `[ Farms forecast at high/critical risk in the next 7 days ]` | `IsOfficer` | `src/src/api/dashboard.js: getPreventivePlanning()` |

---

## 11. Feedback & Retraining Dataset (Stage 8) (`/api/feedback/`)

| Endpoint | Method | Request Payload | Response Schema | Auth / Role | Frontend Handler |
|---|---|---|---|---|---|
| `/api/feedback/records/` | `GET` | Query: `split`, `include_demo` | `[ FeedbackRecord objects with split, image_sha256, reviewer ]` | `IsOfficer` | `src/src/api/feedback.js: getFeedbackRecords()` |
| `/api/feedback/stats/` | `GET` | None | `{ "total_records", "by_split": { "train", "val", "test" }, "confirmed_count", "corrected_count" }` | `IsOfficer` | `src/src/api/feedback.js: getFeedbackStats()` |
| `/api/feedback/export/csv/` | `GET` | Query: `include_demo` | CSV download with provenance fields | `IsOfficer` | Direct browser download |
| `/api/feedback/export/zip/` | `GET` | Query: `include_demo` | ZIP archive with ImageFolder structure (`train/`, `val/`, `test/`) | `IsOfficer` | Direct browser download |

---

## 12. Security & Integrity Audit Summary

1. **Authentication**: All business logic endpoints require JWT Bearer authentication. No public `AllowAny` leaks on farm, risk, sensor, referral, or dashboard endpoints.
2. **Object-Level Ownership**: Farmers can only access, query risk for, or record scouting/sensors on farms they own. IDOR vulnerabilities eliminated.
3. **Role Segregation**: Expert queue, reviews, officer dashboards, preventive planning, and feedback exports are restricted by `IsExpertOrOfficer` or `IsOfficer`.
4. **Data Integrity**: AI model predictions (`predicted_class`, `confidence`) are strictly immutable after creation. Expert diagnosis is stored separately.
5. **No Synthetic Metrics**: All dashboard metrics (referral completion, median review time, non-chemical percentage) are derived strictly from active platform records.
