"""
Sustainability Score Calculator — deterministic agronomic formula, no ML/AI.

Architecture:
  farm + weather_data + disease_history
    ↓
  calculate_water_efficiency()
    ↓
  calculate_soil_health()
    ↓
  calculate_crop_health()
    ↓
  calculate_resource_efficiency()
    ↓
  calculate_overall_score()
    ↓
  generate_recommendations()

Formula:
  Sustainability Score =
      (Water Efficiency × 0.30)
    + (Soil Health × 0.25)
    + (Crop Health × 0.25)
    + (Resource Efficiency × 0.20)

All component scores are 0–100. Final score is rounded to one decimal place (0–100).
"""
import logging
from typing import Optional, Dict, Any, List, Tuple

logger = logging.getLogger('sustainability')

WEIGHTS = {
    'water_efficiency':    0.30,
    'soil_health':         0.25,
    'crop_health':         0.25,
    'resource_efficiency': 0.20,
}

# Authoritative irrigation efficiency baseline scores
IRRIGATION_EFFICIENCY = {
    'drip':      92.0,
    'sprinkler': 78.0,
    'manual':    62.0,
    'flood':     48.0,
    'none':      60.0,
}

IRRIGATION_LABELS = {
    'drip':      'Drip Irrigation',
    'sprinkler': 'Sprinkler Irrigation',
    'manual':    'Manual Watering',
    'flood':     'Flood Irrigation',
    'none':      'Rainfed / No Irrigation',
}


def calculate_soil_moisture_score(moisture: Optional[float]) -> Optional[float]:
    """
    Score soil moisture percentage (0-100 pts).
    Exact rules:
      25%–45%: 100
      <10%:    20
      10%–25%: 40 + (moisture - 10) × 4
      45%–60%: 100 - (moisture - 45) × 2
      >60%:    65
    """
    if moisture is None:
        return None
    try:
        m = float(moisture)
    except (ValueError, TypeError):
        return None

    if 25.0 <= m <= 45.0:
        return 100.0
    elif m < 10.0:
        return 20.0
    elif 10.0 <= m < 25.0:
        return round(40.0 + (m - 10.0) * 4.0, 1)
    elif 45.0 < m <= 60.0:
        return round(100.0 - (m - 45.0) * 2.0, 1)
    else:  # m > 60.0
        return 65.0


def calculate_et0_score(et0: Optional[float]) -> Optional[float]:
    """
    Score reference evapotranspiration ET₀ in mm/day (0-100 pts).
    Exact rules:
      ET₀ < 3 mm/day:  90
      ET₀ < 5 mm/day:  75
      ET₀ < 7 mm/day:  60
      ET₀ >= 7 mm/day: 45
    """
    if et0 is None:
        return None
    try:
        e = float(et0)
    except (ValueError, TypeError):
        return None

    if e < 3.0:
        return 90.0
    elif e < 5.0:
        return 75.0
    elif e < 7.0:
        return 60.0
    else:
        return 45.0


def get_weather_demand_label(et0: Optional[float]) -> str:
    """Farmer-friendly weather water demand description."""
    if et0 is None:
        return "Unavailable"
    try:
        e = float(et0)
    except (ValueError, TypeError):
        return "Unavailable"

    if e < 3.0:
        return "Low"
    elif e < 5.0:
        return "Moderate"
    elif e < 7.0:
        return "High"
    else:
        return "Very High"


def calculate_water_efficiency(weather_data: Optional[Dict[str, Any]]) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Water Efficiency = (Soil Moisture Score × 0.60) + (ET₀ Score × 0.40)
    Returns: (water_score, moisture_val, et0_val)
    Never uses a guessed value like 70 if live weather is missing.
    """
    if not weather_data:
        return None, None, None

    soil = weather_data.get('soil', {})
    today = weather_data.get('today', {})

    sm = soil.get('moisture_percent')
    et0 = today.get('et0')

    # Both must be present to compute true live water efficiency
    ms = calculate_soil_moisture_score(sm)
    es = calculate_et0_score(et0)

    if ms is None or es is None:
        return None, sm, et0

    water_score = round(ms * 0.60 + es * 0.40, 1)
    return water_score, sm, et0


def calculate_soil_health(weather_data: Optional[Dict[str, Any]]) -> Tuple[Optional[float], Optional[float]]:
    """
    Soil Health (0-100 pts) from live soil moisture.
    Exact rules:
      20%–50%: 85
      <10%:    30
      10%–20%: 50 + (moisture - 10) × 3.5
      50%–70%: 85 - (moisture - 50) × 2
      >70%:    50
    Returns: (soil_score, moisture_val)
    """
    if not weather_data:
        return None, None

    sm = weather_data.get('soil', {}).get('moisture_percent')
    if sm is None:
        return None, None

    try:
        m = float(sm)
    except (ValueError, TypeError):
        return None, None

    if 20.0 <= m <= 50.0:
        score = 85.0
    elif m < 10.0:
        score = 30.0
    elif 10.0 <= m < 20.0:
        score = round(50.0 + (m - 10.0) * 3.5, 1)
    elif 50.0 < m <= 70.0:
        score = round(85.0 - (m - 50.0) * 2.0, 1)
    else:  # m > 70.0
        score = 50.0

    return score, m


def calculate_crop_health(disease_scans: Optional[List[Dict[str, Any]]]) -> Tuple[float, int, int]:
    """
    Crop Health (0-100 pts).
    Formula:
      Crop Health = 50 + (Healthy Leaf Scans / Total Leaf Scans × 50)
      If there are no disease scans:
        Crop Health = 75
    Returns: (crop_health_score, healthy_count, total_count)
    """
    if not disease_scans:
        return 75.0, 0, 0

    total = len(disease_scans)
    if total == 0:
        return 75.0, 0, 0

    healthy = sum(1 for s in disease_scans if s.get('is_healthy') is True)
    score = 50.0 + (healthy / total) * 50.0
    return round(score, 1), healthy, total


def calculate_resource_efficiency(farm=None) -> Tuple[Optional[float], Optional[str], bool]:
    """
    Resource Efficiency (0-100 pts) based on farm profile's irrigation method.
    Exact rules:
      Drip Irrigation:      92
      Sprinkler Irrigation: 78
      Manual Watering:      62
      Flood Irrigation:     48
      None / Rainfed:       60
    Returns: (resource_score, irrigation_method_key, is_configured)
    """
    if not farm:
        return 60.0, 'none', False

    irr = getattr(farm, 'irrigation_type', None)
    if not irr or not str(irr).strip():
        return None, None, False

    key = str(irr).strip().lower()
    score = IRRIGATION_EFFICIENCY.get(key, 60.0)
    return score, key, True


def get_score_rating(score: Optional[float]) -> str:
    """
    Rating ranges:
      90–100 → Excellent
      75–89  → Good
      60–74  → Moderate
      40–59  → Needs improvement
      0–39   → Poor
    """
    if score is None:
        return "Unavailable"
    if score >= 90.0:
        return "Excellent"
    elif score >= 75.0:
        return "Good"
    elif score >= 60.0:
        return "Moderate"
    elif score >= 40.0:
        return "Needs improvement"
    else:
        return "Poor"


def generate_recommendations(
    moisture: Optional[float],
    et0: Optional[float],
    irrigation_key: Optional[str],
    crop_health_score: float,
    has_scans: bool,
    irrigation_configured: bool,
) -> List[str]:
    """Generate concise, actionable suggestions directly from actual score and farm conditions."""
    recs: List[str] = []

    # Water & Moisture condition
    if moisture is not None:
        if moisture > 45.0:
            recs.append("Avoid watering when soil moisture is already adequate.")
        elif moisture < 25.0:
            recs.append(f"Soil moisture is below optimal ({moisture}%). Schedule irrigation to prevent moisture stress.")
        else:
            recs.append("Soil moisture is in the optimal range. Maintain current watering schedule.")

    # Weather Demand (ET0)
    if et0 is not None:
        if et0 >= 5.0:
            recs.append("High weather water demand today. Consider organic mulching to conserve root zone moisture.")
        elif et0 < 3.0:
            recs.append("Evaporative water demand is low today; minimal supplementary irrigation is needed.")

    # Irrigation system recommendations
    if not irrigation_configured:
        recs.append("Configure your irrigation method in My Farm to receive precise resource scoring.")
    else:
        if irrigation_key == 'drip':
            recs.append("Continue using drip irrigation to maintain high water application efficiency.")
        elif irrigation_key == 'sprinkler':
            recs.append("Inspect sprinkler nozzles periodically for uniform coverage and avoid watering during peak winds.")
        elif irrigation_key in ('flood', 'manual'):
            recs.append("Consider upgrading to drip or micro-sprinkler irrigation to significantly improve water efficiency.")
        elif irrigation_key == 'none':
            recs.append("For rainfed crops, use mulching or field bunding to maximize rainwater retention.")

    # Crop health & disease monitoring
    if not has_scans:
        recs.append("Scan crop leaves regularly with Disease Detection to establish your farm's health baseline.")
    else:
        if crop_health_score < 80.0:
            recs.append("Recent disease scans detected foliar stress. Monitor flagged areas and apply recommended treatments.")
        else:
            recs.append("Keep checking crop leaves regularly for early disease detection and prevention.")

    # Deduplicate while preserving order, cap at top 4
    seen = set()
    deduped = []
    for r in recs:
        if r not in seen:
            seen.add(r)
            deduped.append(r)
    return deduped[:4]


def generate_explanations(
    water_score: Optional[float],
    soil_score: Optional[float],
    crop_health_score: float,
    resource_score: Optional[float],
    moisture: Optional[float],
    et0: Optional[float],
    irrigation_key: Optional[str],
    has_scans: bool,
    healthy_scans: int,
    total_scans: int,
) -> Dict[str, str]:
    """Generate transparent, farmer-friendly explanations for each component."""
    explanations = {}

    # Water
    if water_score is not None:
        demand_text = get_weather_demand_label(et0).lower()
        if water_score >= 80.0:
            explanations['water'] = (
                f"Your water score ({water_score:.1f}) is high because current soil moisture ({moisture}%) "
                f"and {demand_text} weather water demand indicate a healthy water balance."
            )
        elif water_score >= 60.0:
            explanations['water'] = (
                f"Your water score ({water_score:.1f}) is moderate. Soil moisture is at {moisture}% "
                f"with {demand_text} weather water demand."
            )
        else:
            explanations['water'] = (
                f"Your water score ({water_score:.1f}) is low due to suboptimal soil moisture ({moisture}%) "
                f"or elevated weather water demand."
            )
    else:
        explanations['water'] = "Water score cannot be calculated because live weather data is currently unavailable."

    # Soil
    if soil_score is not None:
        if soil_score >= 80.0:
            explanations['soil'] = (
                f"Your soil score ({soil_score:.1f}) indicates good moisture retention in the optimal agronomic range."
            )
        else:
            explanations['soil'] = (
                f"Your soil score ({soil_score:.1f}) reflects soil moisture ({moisture}%) outside the ideal 20%–50% balance."
            )
    else:
        explanations['soil'] = "Soil score cannot be calculated because soil moisture data is currently unavailable."

def generate_explanations(
    water_score: Optional[float],
    soil_score: Optional[float],
    crop_health_score: float,
    resource_score: Optional[float],
    moisture: Optional[float],
    et0: Optional[float],
    irrigation_key: Optional[str],
    has_scans: bool,
    healthy_scans: int,
    total_scans: int,
    selected_plant: Optional[str] = None,
) -> Dict[str, str]:
    """Generate transparent, farmer-friendly explanations for each component."""
    explanations = {}

    # Water
    if water_score is not None:
        demand_text = get_weather_demand_label(et0).lower()
        if water_score >= 80.0:
            explanations['water'] = (
                f"Your water score ({water_score:.1f}) is high because current soil moisture ({moisture}%) "
                f"and {demand_text} weather water demand indicate a healthy water balance."
            )
        elif water_score >= 60.0:
            explanations['water'] = (
                f"Your water score ({water_score:.1f}) is moderate. Soil moisture is at {moisture}% "
                f"with {demand_text} weather water demand."
            )
        else:
            explanations['water'] = (
                f"Your water score ({water_score:.1f}) is low due to suboptimal soil moisture ({moisture}%) "
                f"or elevated weather water demand."
            )
    else:
        explanations['water'] = "Water score cannot be calculated because live weather data is currently unavailable."

    # Soil
    if soil_score is not None:
        if soil_score >= 80.0:
            explanations['soil'] = (
                f"Your soil score ({soil_score:.1f}) indicates good moisture retention in the optimal agronomic range."
            )
        else:
            explanations['soil'] = (
                f"Your soil score ({soil_score:.1f}) reflects soil moisture ({moisture}%) outside the ideal 20%–50% balance."
            )
    else:
        explanations['soil'] = "Soil score cannot be calculated because soil moisture data is currently unavailable."

    # Crop Health
    plant_label = f" for {selected_plant}" if selected_plant else ""
    if has_scans and total_scans > 0:
        explanations['crop_health'] = (
            f"Your crop health score ({crop_health_score:.1f}){plant_label} is based on your recent leaf scans "
            f"({healthy_scans} healthy out of {total_scans} total scans)."
        )
    else:
        explanations['crop_health'] = (
            f"Your crop health score (75.0){plant_label} is at the standard baseline because no disease scans have been recorded yet{(' for this plant' if selected_plant else '')}."
        )

    # Resources
    if resource_score is not None and irrigation_key:
        label = IRRIGATION_LABELS.get(irrigation_key, irrigation_key.title())
        explanations['resources'] = (
            f"Your resource score ({resource_score:.1f}) is based on your farm's {label} system."
        )
    else:
        explanations['resources'] = (
            "Irrigation method is not yet configured in your Farm Profile. Configure it in My Farm to update this score."
        )

    return explanations


def get_sustainability_assessment(
    farm=None,
    weather_data: Optional[Dict[str, Any]] = None,
    disease_scans: Optional[List[Dict[str, Any]]] = None,
    selected_plant: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Authoritative deterministic assessment pipeline.
    Single source of truth for the entire application.
    """
    water_score, moisture, et0 = calculate_water_efficiency(weather_data)
    soil_score, _ = calculate_soil_health(weather_data)

    # Filter scans by selected_plant to prevent mixing disease histories
    filtered_scans = disease_scans or []
    if selected_plant and str(selected_plant).strip():
        target = str(selected_plant).strip().lower()
        def _matches(s):
            pn = str(s.get('plant_name') or s.get('crop_type') or '').strip().lower()
            if target in pn or pn in target:
                return True
            pc = str(s.get('predicted_class') or '').strip().lower()
            if pc.startswith(target) or f"{target}___" in pc:
                return True
            return False
        filtered_scans = [s for s in filtered_scans if _matches(s)]

    crop_health_score, healthy_count, total_count = calculate_crop_health(filtered_scans)
    resource_score, irr_key, irr_configured = calculate_resource_efficiency(farm)

    has_weather = (water_score is not None and soil_score is not None)
    has_scans = (total_count > 0)

    # Calculate overall score if all components are available
    # If irrigation is not configured on the farm, we use rainfed/none baseline (60.0) for score calculation
    effective_resource_score = resource_score if resource_score is not None else 60.0

    if has_weather:
        overall = (
            water_score * WEIGHTS['water_efficiency']
            + soil_score * WEIGHTS['soil_health']
            + crop_health_score * WEIGHTS['crop_health']
            + effective_resource_score * WEIGHTS['resource_efficiency']
        )
        overall_score = round(overall, 1)
        data_sufficient = True
        weather_available = True
    else:
        overall_score = None
        data_sufficient = False
        weather_available = False

    rating = get_score_rating(overall_score)
    demand_label = get_weather_demand_label(et0)
    irr_display = IRRIGATION_LABELS.get(irr_key, 'Not configured') if irr_configured else 'Not configured'
    crop_name = getattr(farm, 'crop', '') if farm else ''

    recommendations = generate_recommendations(
        moisture=moisture,
        et0=et0,
        irrigation_key=irr_key,
        crop_health_score=crop_health_score,
        has_scans=has_scans,
        irrigation_configured=irr_configured,
    )

    explanations = generate_explanations(
        water_score=water_score,
        soil_score=soil_score,
        crop_health_score=crop_health_score,
        resource_score=resource_score,
        moisture=moisture,
        et0=et0,
        irrigation_key=irr_key,
        has_scans=has_scans,
        healthy_scans=healthy_count,
        total_scans=total_count,
        selected_plant=selected_plant,
    )

    return {
        'overall_score':       overall_score,
        'rating':              rating,
        'selected_plant':      selected_plant,
        'data_sufficient':     data_sufficient,
        'weather_available':   weather_available,
        'irrigation_configured': irr_configured,
        'weather_error_message': None if weather_available else "Weather data unavailable. We cannot calculate the latest water condition. Please try again later.",
        'irrigation_message':  None if irr_configured else "Irrigation method not configured. Please configure your irrigation system in My Farm.",

        'components': {
            'water':        water_score,
            'soil':         soil_score,
            'crop_health':  crop_health_score,
            'resources':    resource_score if irr_configured else 60.0,
        },

        'conditions': {
            'soil_moisture':        moisture,
            'et0':                  et0,
            'weather_water_demand': demand_label,
            'irrigation_method':    irr_display,
            'crop':                 selected_plant or crop_name or 'Not specified',
        },

        'recommendations': recommendations,
        'explanations':    explanations,

        'data_sources': {
            'soil_moisture': 'live_weather',
            'et0':           'live_weather',
            'crop_health':   'disease_scan_history',
            'irrigation':    'farm_profile',
        },

        # Backward compatibility with existing callers (like dashboard views & models)
        'score':               overall_score if overall_score is not None else 75.0,
        'water_efficiency':    water_score if water_score is not None else 0.0,
        'soil_health':         soil_score if soil_score is not None else 0.0,
        'resource_efficiency': resource_score if resource_score is not None else 60.0,
    }


def calculate_sustainability_score(
    weather_data: Optional[Dict[str, Any]] = None,
    disease_scans: Optional[List[Dict[str, Any]]] = None,
    farm=None,
) -> Dict[str, Any]:
    """
    Backwards-compatible wrapper function called by dashboard.views.
    """
    return get_sustainability_assessment(
        farm=farm,
        weather_data=weather_data,
        disease_scans=disease_scans,
    )
