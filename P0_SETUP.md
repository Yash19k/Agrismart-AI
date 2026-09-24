# AgriSmart-AI: SIH P0 Feature Setup Guide

This document details the configuration, pre-requisites, automatic seed commands, and execution steps to run the complete end-to-end Smart India Hackathon (SIH) prototype.

---

## 1. What is Already Available in the Codebase

- **Deep Learning Model**: ConvNeXt-Tiny weights (`agrismart_convnext_tiny_final.pth`) configured for 38 PlantVillage crop disease classes.
- **Backend Architecture**: Django 5 + Django REST Framework with JWT authentication and SQLite local database.
- **Deterministic Risk Engine**: Phenological stage weights (seedling, vegetative, flowering, fruiting, maturity), weather integration, pest pressure thresholds, and local incidence scoring.
- **Pest Vector Surveillance**: 6 trap types, pest counts, Economic Injury Level (EIL) alert triggers.
- **Geospatial Hotspots GIS**: Pure Python Haversine clustering with interactive Leaflet map (no PostGIS required).
- **Agronomist Validation Portal**: Human-in-the-loop review queue preserving immutable AI predictions and establishing ground truth.
- **Treatment Follow-up System**: 5-7 day recheck schedules with recovery % tracking.
- **Retraining Dataset Manager**: 70/15/15 train/val/test auto-partitioning and PyTorch CSV/JSON manifest export.
- **Regional Surveillance Dashboard**: District Agricultural Officer (DAO) command center.

---

## 2. Auto-Generated Assets & Data

Running the single command below automatically populates the complete prototype state across Gujarat agricultural belts:
```bash
cd app
python manage.py migrate
python manage.py seed_sih_demo
```

### What `seed_sih_demo` Automatically Generates:
- **3 Role-Based Demo Accounts**:
  1. **Farmer**: `farmer_demo` / `farmer123`
  2. **Expert / Agronomist**: `expert_demo` / `expert123`
  3. **Agricultural Officer**: `officer_demo` / `officer123`
- **25 Farm Parcels** across real GPS coordinates in Anand, Sanand, Vadodara, Rajkot, and Surat.
- **40 Disease Scans** with early/late blight, bacterial spot, and healthy foliage.
- **30 Pest Trap Observations** across yellow/blue sticky traps, pheromone lures, and manual scouting.
- **15 Expert Reviews** with both confirmed and corrected clinical diagnoses.
- **10 Treatment Follow-ups** with initial-vs-recheck progression and recovery percentages.
- **Retraining Dataset Records** partitioned into train, validation, and test splits.

---

## 3. Manual Files & Inputs Needed

- **Leaf Images for Testing**: You can upload any JPEG/PNG leaf image from your local machine to test live ConvNeXt-Tiny diagnosis under `/disease`.
- **Trap Cards**: Sample reference data and trap protocols are pre-loaded in `data/pest_traps/demo_labels.csv`.

---

## 4. API Keys & Configuration

| Service | Environment Variable | Default / Fallback |
| :--- | :--- | :--- |
| **WeatherAPI** | `WEATHER_API_KEY` | Hardcoded default key configured in `settings.py`. If exhausted or offline, the service automatically fails over to **Open-Meteo API** (zero API key required). |
| **Groq AI Agronomist** | `GROQ_API_KEY` | Optional. If set in `.env`, enables LLaMA-3 speed responses. If omitted, standard agronomic expert knowledge rules are returned. |

---

## 5. Startup Commands

### Step 1: Backend (Django REST Framework)
```powershell
cd c:\Maithil\tp\SIH\Agrismart-AI\app
python manage.py migrate
python manage.py seed_sih_demo
python manage.py runserver 0.0.0.0:8000
```
*Backend runs on `http://localhost:8000` (API roots at `/api/`).*

### Step 2: Frontend (React 19 + Vite + Tailwind CSS 4)
```powershell
cd c:\Maithil\tp\SIH\Agrismart-AI\src
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

### Step 3: Run Backend Test Suite
```powershell
cd c:\Maithil\tp\SIH\Agrismart-AI\app
python manage.py test risk pests hotspots expert followups feedback
```
*(All 12 unit tests pass out of the box).*
