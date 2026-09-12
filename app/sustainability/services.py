"""
Sustainability Score Calculator — transparent formula, no ML.

Score formula:
  total = water_efficiency  × 0.30
        + soil_health       × 0.25
        + crop_health       × 0.25
        + resource_efficiency × 0.20

All component scores are 0–100. Final score is 0–100.

Sources:
  water_efficiency   — ET₀ ratio and soil moisture optimality
  soil_health        — Soil moisture in optimal agronomic range
  crop_health        — Disease scan history (healthy scans = high score)
  resource_efficiency — Irrigation type efficiency rating
"""

WEIGHTS = {
    'water_efficiency':    0.30,
    'soil_health':         0.25,
    'crop_health':         0.25,
    'resource_efficiency': 0.20,
}

# Irrigation efficiency baseline scores
IRRIGATION_EFFICIENCY = {
    'drip':      92,
    'sprinkler': 78,
    'manual':    62,
    'flood':     48,
    'none':      60,
}


def _water_efficiency(weather_data: dict) -> float:
    soil = weather_data.get('soil', {})
    today = weather_data.get('today', {})
    sm  = soil.get('moisture_percent')
    et0 = float(today.get('et0', 4.0) or 4.0)

    if sm is None:
        return 70.0

    # Optimal range 25–45 % → 100 pts; degrades outside that range
    if   25 <= sm <= 45:   ms = 100
    elif sm < 10:           ms = 20
    elif sm < 25:           ms = 40 + (sm - 10) * 4
    elif sm <= 60:          ms = 100 - (sm - 45) * 2
    else:                   ms = 65

    # ET₀ score — lower demand with adequate moisture = more efficient
    es = 90 if et0 < 3 else (75 if et0 < 5 else (60 if et0 < 7 else 45))

    return round(ms * 0.6 + es * 0.4, 1)


def _soil_health(weather_data: dict) -> float:
    sm = weather_data.get('soil', {}).get('moisture_percent')
    if sm is None:
        return 65.0
    if   20 <= sm <= 50: return 85.0
    elif sm < 10:         return 30.0
    elif sm < 20:         return round(50 + (sm - 10) * 3.5, 1)
    elif sm <= 70:        return round(85 - (sm - 50) * 2, 1)
    return 50.0


def _crop_health(disease_scans: list) -> float:
    if not disease_scans:
        return 75.0
    healthy = sum(1 for s in disease_scans if s.get('is_healthy') is True)
    return round(50 + (healthy / len(disease_scans)) * 50, 1)


def _resource_efficiency(farm=None) -> float:
    irr = getattr(farm, 'irrigation_type', 'none') if farm else 'none'
    return float(IRRIGATION_EFFICIENCY.get(irr or 'none', 65))


def calculate_sustainability_score(
    weather_data: dict,
    disease_scans: list = None,
    farm=None,
) -> dict:
    """Return overall sustainability score and component breakdown."""
    disease_scans = disease_scans or []

    we = _water_efficiency(weather_data)
    sh = _soil_health(weather_data)
    ch = _crop_health(disease_scans)
    re = _resource_efficiency(farm)

    total = (
        we * WEIGHTS['water_efficiency']
        + sh * WEIGHTS['soil_health']
        + ch * WEIGHTS['crop_health']
        + re * WEIGHTS['resource_efficiency']
    )

    return {
        'score':               round(total, 1),
        'water_efficiency':    round(we, 1),
        'soil_health':         round(sh, 1),
        'crop_health':         round(ch, 1),
        'resource_efficiency': round(re, 1),
        'data_sufficient':     True,
    }
