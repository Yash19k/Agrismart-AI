"""
Multi-factor deterministic crop disease and pest risk engine.
Prototype Decision-Support Risk Engine — Transparent, Reproducible, and Non-Blackbox.
"""
import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("risk.engine")

STAGE_WEIGHTS = {
    'flowering': 10.0,
    'fruiting': 9.0,
    'seedling': 8.0,
    'vegetative': 6.0,
    'maturity': 4.0,
    'harvest': 2.0,
}

BASE_DIR = Path(__file__).resolve().parent.parent.parent
VARIETY_FILE = BASE_DIR / "data" / "variety_susceptibility.json"


def _get_variety_modifier(crop_name: str, variety_name: str, disease_name: str) -> Optional[Dict[str, Any]]:
    """
    Checks data/variety_susceptibility.json for cited susceptibility data.
    Only returns a rating if an entry with an explicit citation exists.
    """
    if not variety_name or not VARIETY_FILE.is_file():
        return None

    try:
        with open(VARIETY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            varieties = data.get("varieties", {})
            var_clean = variety_name.strip().lower()
            for key, val in varieties.items():
                if key.lower() == var_clean and val.get("citation"):
                    return val
    except Exception as e:
        logger.warning("Could not read variety susceptibility data: %s", e)
    return None


def calculate_risk(
    crop_stage: str = 'vegetative',
    humidity: Optional[float] = 60.0,
    temperature: Optional[float] = 25.0,
    rainfall_prob: Optional[float] = 20.0,
    disease_confidence: float = 0.0,
    disease_severity: str = 'low',
    is_healthy: bool = True,
    pest_count: int = 0,
    local_incidence_count: int = 0,
    farmer_leaf_extent: str = 'unknown',
    crop_name: str = '',
    crop_variety: str = '',
    soil_moisture: Optional[float] = None,
    soil_ph: Optional[float] = None,
    sensor_source: Optional[str] = None,
) -> dict:
    """
    Computes a deterministic agronomic risk score (0-100) using environmental,
    pathological, phenological, entomological, and edaphic factors.
    Missing inputs never crash and are listed under `inputs_missing`.
    """
    breakdown = {}
    inputs_used = []
    inputs_missing = []

    # 1. Disease Detection Confidence (0 - 25)
    if is_healthy or disease_confidence <= 0:
        conf_score = 0.0
        conf_input = "Healthy / None"
    else:
        conf_score = min(25.0, round(float(disease_confidence) * 25.0, 1))
        conf_input = f"{round(disease_confidence * 100, 1)}% (uncalibrated)"
        inputs_used.append("disease_detection")

    breakdown['disease_confidence'] = {
        'score': conf_score,
        'max': 25.0,
        'input': conf_input,
        'label': 'Disease Detection Confidence'
    }

    # 2. Farmer-Reported Severity Extent (0 - 15)
    # Per Section 4 Phase 1: Uses farmer-selected extent (<10%, 10-30%, >30%),
    # or fallback to legacy disease_severity if provided, or skips if unknown.
    extent_clean = (farmer_leaf_extent or '').lower().strip()
    if not extent_clean or extent_clean == 'unknown':
        sev_clean = (disease_severity or '').lower().strip()
        if sev_clean == 'high':
            extent_clean = '>30%'
        elif sev_clean == 'medium':
            extent_clean = '10-30%'
        elif sev_clean == 'low':
            extent_clean = '<10%'
        else:
            extent_clean = 'unknown'

    if is_healthy:
        sev_score = 0.0
        sev_input = "Intact Foliage"
    elif extent_clean == '<10%':
        sev_score = 5.0
        sev_input = "Low (<10% leaves affected)"
        inputs_used.append("farmer_leaf_extent")
    elif extent_clean in ('10-30%', '10–30%'):
        sev_score = 10.0
        sev_input = "Moderate (10-30% leaves affected)"
        inputs_used.append("farmer_leaf_extent")
    elif extent_clean == '>30%':
        sev_score = 15.0
        sev_input = "High (>30% leaves affected)"
        inputs_used.append("farmer_leaf_extent")
    else:
        sev_score = 0.0
        sev_input = "Unknown (skipped in risk calculation)"
        inputs_missing.append("farmer_leaf_extent")

    breakdown['severity_extent'] = {
        'score': sev_score,
        'max': 15.0,
        'input': sev_input,
        'label': 'Farmer-Observed Foliage Extent'
    }

    # 3. Ambient / Sensor Relative Humidity (0 - 15)
    if humidity is not None:
        hum = float(humidity)
        if hum > 85:
            hum_score = 15.0
        elif hum > 70:
            hum_score = 10.0
        elif hum > 50:
            hum_score = 5.0
        else:
            hum_score = 2.0
        h_source = f" ({sensor_source})" if sensor_source else ""
        breakdown['humidity'] = {
            'score': hum_score,
            'max': 15.0,
            'input': f"{round(hum, 1)}%{h_source}",
            'label': 'Relative Humidity'
        }
        inputs_used.append("humidity")
    else:
        breakdown['humidity'] = {
            'score': 0.0,
            'max': 15.0,
            'input': 'Not available (skipped)',
            'label': 'Relative Humidity'
        }
        inputs_missing.append("humidity")

    # 4. Air Temperature (0 - 10)
    if temperature is not None:
        temp = float(temperature)
        if 20.0 <= temp <= 30.0:
            temp_score = 10.0  # Pathogen favorable incubation
        elif 15.0 <= temp < 20.0 or 30.0 < temp <= 35.0:
            temp_score = 6.0
        else:
            temp_score = 2.0
        t_source = f" ({sensor_source})" if sensor_source else ""
        breakdown['temperature'] = {
            'score': temp_score,
            'max': 10.0,
            'input': f"{round(temp, 1)}°C{t_source}",
            'label': 'Air Temperature'
        }
        inputs_used.append("temperature")
    else:
        breakdown['temperature'] = {
            'score': 0.0,
            'max': 10.0,
            'input': 'Not available (skipped)',
            'label': 'Air Temperature'
        }
        inputs_missing.append("temperature")

    # 5. Rainfall Probability / Precipitation (0 - 10)
    if rainfall_prob is not None:
        rain = float(rainfall_prob)
        if rain > 70:
            rain_score = 10.0
        elif rain > 40:
            rain_score = 6.0
        elif rain > 15:
            rain_score = 3.0
        else:
            rain_score = 1.0
        breakdown['rainfall_prob'] = {
            'score': rain_score,
            'max': 10.0,
            'input': f"{round(rain, 1)}%",
            'label': 'Rainfall Probability'
        }
        inputs_used.append("rainfall_prob")
    else:
        breakdown['rainfall_prob'] = {
            'score': 0.0,
            'max': 10.0,
            'input': 'Not available (skipped)',
            'label': 'Rainfall Probability'
        }
        inputs_missing.append("rainfall_prob")

    # 6. Crop Growth Stage Vulnerability (0 - 10)
    stage_key = str(crop_stage).lower().strip() if crop_stage else 'vegetative'
    stage_score = STAGE_WEIGHTS.get(stage_key, 6.0)
    breakdown['crop_stage'] = {
        'score': stage_score,
        'max': 10.0,
        'input': stage_key.capitalize(),
        'label': 'Crop Growth Stage'
    }
    inputs_used.append("crop_stage")

    # 7. Pest Vector Pressure (0 - 10)
    p_cnt = int(pest_count or 0)
    if p_cnt > 50:
        pest_score = 10.0
    elif p_cnt > 20:
        pest_score = 7.0
    elif p_cnt > 5:
        pest_score = 4.0
    else:
        pest_score = 0.0
    breakdown['pest_pressure'] = {
        'score': pest_score,
        'max': 10.0,
        'input': f"{p_cnt} pests (manual scouting)",
        'label': 'Pest Vector Pressure'
    }
    if p_cnt > 0:
        inputs_used.append("pest_scouting")
    else:
        inputs_missing.append("pest_scouting (none recorded)")

    # 8. Local Geospatial Incidence History (0 - 5)
    loc_cnt = int(local_incidence_count or 0)
    if loc_cnt >= 5:
        loc_score = 5.0
    elif loc_cnt >= 2:
        loc_score = 3.0
    elif loc_cnt >= 1:
        loc_score = 2.0
    else:
        loc_score = 0.0
    breakdown['local_incidence'] = {
        'score': loc_score,
        'max': 5.0,
        'input': f"{loc_cnt} nearby verified/unverified cases (10km)",
        'label': 'Local Area Outbreak Pressure'
    }
    inputs_used.append("local_incidence_history")

    # 9. Soil Moisture (0 - 5)
    if soil_moisture is not None:
        sm = float(soil_moisture)
        if sm > 45.0:
            sm_score = 5.0  # Prolonged saturation promotes root rot/water molds
            sm_input = f"{round(sm, 1)}% (saturated)"
        elif sm > 30.0:
            sm_score = 3.0  # Adequate moisture
            sm_input = f"{round(sm, 1)}% (adequate)"
        else:
            sm_score = 1.0  # Dry
            sm_input = f"{round(sm, 1)}% (dry)"
        inputs_used.append("soil_moisture")
    else:
        sm_score = 0.0
        sm_input = "Not recorded (skipped)"
        inputs_missing.append("soil_moisture")

    breakdown['soil_moisture'] = {
        'score': sm_score,
        'max': 5.0,
        'input': sm_input,
        'label': 'Soil Moisture Condition'
    }

    # 10. Soil pH (0 - 5)
    if soil_ph is not None:
        sph = float(soil_ph)
        if sph < 5.5 or sph > 8.0:
            sph_score = 5.0  # Severe nutrient lockout / physiological stress
            sph_input = f"{round(sph, 2)} (stressful range)"
        elif sph < 6.0 or sph > 7.5:
            sph_score = 2.5
            sph_input = f"{round(sph, 2)} (suboptimal)"
        else:
            sph_score = 0.0
            sph_input = f"{round(sph, 2)} (optimal 6.0-7.5)"
        inputs_used.append("soil_ph")
    else:
        sph_score = 0.0
        sph_input = "Not recorded (skipped)"
        inputs_missing.append("soil_ph")

    breakdown['soil_ph'] = {
        'score': sph_score,
        'max': 5.0,
        'input': sph_input,
        'label': 'Soil pH Condition'
    }

    # 11. Variety Susceptibility (0 - 5) — Strictly requires peer-reviewed cited rating
    var_mod = _get_variety_modifier(crop_name, crop_variety, "")
    if var_mod and "risk_modifier" in var_mod:
        var_score = float(var_mod["risk_modifier"])
        var_input = f"{crop_variety} ({var_mod.get('susceptibility_rating', 'rated')}, cited: {var_mod.get('citation', '')})"
        inputs_used.append("crop_variety_susceptibility")
    else:
        var_score = 0.0
        var_input = f"{crop_variety or 'Not specified'} (no verified peer-reviewed rating, skipped)"
        inputs_missing.append("variety_susceptibility_citation")

    breakdown['variety_susceptibility'] = {
        'score': var_score,
        'max': 5.0,
        'input': var_input,
        'label': 'Crop Variety Susceptibility'
    }

    # Total Score computation
    total_score = sum(b['score'] for b in breakdown.values())
    total_score = min(100.0, max(0.0, round(total_score, 1)))

    if total_score < 30:
        level = 'low'
        level_display = 'Low'
    elif total_score < 60:
        level = 'medium'
        level_display = 'Medium'
    elif total_score < 80:
        level = 'high'
        level_display = 'High'
    else:
        level = 'critical'
        level_display = 'Critical'

    # Key driving factors summary
    drivers = []
    if not is_healthy and conf_score > 10:
        drivers.append(f"active disease symptoms ({conf_input})")
    if sev_score >= 10:
        drivers.append(f"significant foliar lesion extent ({sev_input})")
    if humidity and humidity > 75:
        drivers.append("high relative humidity (>75%)")
    if temperature and 20 <= temperature <= 30:
        drivers.append("favorable pathogen incubation temperature (20-30°C)")
    if stage_score >= 8:
        drivers.append(f"highly vulnerable phenological stage ({stage_key})")
    if p_cnt > 10:
        drivers.append(f"elevated pest vector count ({p_cnt} observed)")
    if loc_cnt >= 2:
        drivers.append(f"active local neighborhood cases ({loc_cnt} reported in 10km)")
    if sm_score >= 5:
        drivers.append("waterlogged soil conditions promoting fungal proliferation")
    if sph_score >= 5:
        drivers.append("stressful soil pH promoting susceptibility")

    if not drivers:
        drivers_text = "Favorable environmental conditions with low disease, pest, and soil vectors."
    else:
        drivers_text = f"Primary drivers: {', '.join(drivers)}."

    return {
        'score': total_score,
        'level': level,
        'level_display': level_display,
        'drivers': drivers,
        'summary': drivers_text,
        'breakdown': breakdown,
        'inputs_used': inputs_used,
        'inputs_missing': inputs_missing,
        'is_prototype': True,
        'model_label': "Prototype decision-support risk score",
        'disclaimer': "Prototype Risk Engine — Decision-support estimate only. Confirm with on-ground agronomists before chemical application."
    }
