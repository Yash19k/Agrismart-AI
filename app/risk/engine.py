"""
Multi-factor deterministic crop disease and pest risk engine.
Prototype Risk Engine — Decision-support estimate only.
"""

STAGE_WEIGHTS = {
    'flowering': 10.0,
    'fruiting': 9.0,
    'seedling': 8.0,
    'vegetative': 6.0,
    'maturity': 4.0,
    'harvest': 2.0,
}


def calculate_risk(
    crop_stage: str = 'vegetative',
    humidity: float = 60.0,
    temperature: float = 25.0,
    rainfall_prob: float = 20.0,
    disease_confidence: float = 0.0,
    disease_severity: str = 'low',
    is_healthy: bool = True,
    pest_count: int = 0,
    local_incidence_count: int = 0,
) -> dict:
    """
    Computes an agronomic risk score (0-100) using deterministic environmental,
    pathological, phenological, and entomological factors.
    """
    breakdown = {}

    # 1. Disease Detection Confidence (0 - 25)
    if is_healthy or disease_confidence <= 0:
        conf_score = 0.0
    else:
        conf_score = min(25.0, round(float(disease_confidence) * 25.0, 1))
    breakdown['disease_confidence'] = {
        'score': conf_score,
        'max': 25.0,
        'input': f"{round(disease_confidence * 100, 1)}%",
        'label': 'Disease Detection Confidence'
    }

    # 2. Disease Severity (0 - 15)
    severity_map = {
        'none': 0.0,
        'low': 5.0,
        'medium': 10.0,
        'moderate': 10.0,
        'high': 15.0,
        'severe': 15.0,
    }
    if is_healthy:
        sev_score = 0.0
    else:
        sev_score = severity_map.get(str(disease_severity).lower(), 5.0)
    breakdown['severity'] = {
        'score': sev_score,
        'max': 15.0,
        'input': str(disease_severity).capitalize() if not is_healthy else 'Healthy',
        'label': 'Symptom Severity'
    }

    # 3. Ambient Humidity (0 - 15)
    hum = float(humidity)
    if hum > 85:
        hum_score = 15.0
    elif hum > 70:
        hum_score = 10.0
    elif hum > 50:
        hum_score = 5.0
    else:
        hum_score = 2.0
    breakdown['humidity'] = {
        'score': hum_score,
        'max': 15.0,
        'input': f"{round(hum, 1)}%",
        'label': 'Relative Humidity'
    }

    # 4. Temperature (0 - 10)
    temp = float(temperature)
    if 20.0 <= temp <= 30.0:
        temp_score = 10.0  # Optimal fungal/bacterial incubation
    elif 15.0 <= temp < 20.0 or 30.0 < temp <= 35.0:
        temp_score = 6.0
    else:
        temp_score = 2.0
    breakdown['temperature'] = {
        'score': temp_score,
        'max': 10.0,
        'input': f"{round(temp, 1)}°C",
        'label': 'Canopy Temperature'
    }

    # 5. Rain Probability / Precipitation (0 - 10)
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

    # 6. Crop Growth Stage Vulnerability (0 - 10)
    stage_key = str(crop_stage).lower().strip()
    stage_score = STAGE_WEIGHTS.get(stage_key, 6.0)
    breakdown['crop_stage'] = {
        'score': stage_score,
        'max': 10.0,
        'input': stage_key.capitalize(),
        'label': 'Crop Growth Stage'
    }

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
        'input': f"{p_cnt} pests observed",
        'label': 'Pest Vector Pressure'
    }

    # 8. Local Geospatial Incidence (0 - 5)
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
        'input': f"{loc_cnt} nearby cases (10km)",
        'label': 'Local Neighborhood Pressure'
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
    if not is_healthy and conf_score > 12:
        drivers.append(f"active {breakdown['severity']['input'].lower()} disease presence")
    if hum > 75:
        drivers.append("high relative humidity (>75%)")
    if 20 <= temp <= 30:
        drivers.append("pathogen-favorable temperature window (20-30°C)")
    if stage_score >= 8:
        drivers.append(f"highly vulnerable {stage_key} stage")
    if p_cnt > 10:
        drivers.append("elevated pest trap pressure")
    if loc_cnt >= 2:
        drivers.append("recent outbreak reports within 10km")

    if not drivers:
        drivers_text = "Favorable environmental conditions with low disease and pest vectors."
    else:
        drivers_text = f"Primary drivers: {', '.join(drivers)}."

    return {
        'score': total_score,
        'level': level,
        'level_display': level_display,
        'breakdown': breakdown,
        'summary': drivers_text,
        'is_prototype': True,
        'disclaimer': 'Prototype Risk Engine — Decision-support estimate only. Confirm with on-ground agronomists before chemical application.'
    }
