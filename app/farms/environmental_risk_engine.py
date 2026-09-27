"""
Deterministic, rule-based environmental risk analysis engine for AgriSmart.

ABSOLUTE CONSTRAINTS:
- NO MACHINE LEARNING MODELS.
- NO NEURAL NETWORKS, CLASSIFIERS, OR PROBABILISTIC PREDICTIONS.
- NO DISEASE CLAIMS FROM ENVIRONMENTAL OBSERVATIONS.
- STRICT FARM ISOLATION: Each farm's historical baseline and risk calculations
  are computed exclusively from that specific farm's records.
- NO FAKE OR FABRICATED SATELLITE OR WEATHER VALUES.
"""

import logging
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

from .models import (
    Farm, ThermalObservation, ETObservation, ESIObservation,
    WeatherObservation, EnvironmentalRiskAssessment
)

logger = logging.getLogger(__name__)


def _to_float(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def calculate_farm_baselines(farm: Farm) -> dict:
    """
    Calculate farm-specific historical environmental baselines.
    Baselines are computed strictly from the farm's historical records.
    Never mixed between farms.
    """
    # 1. LST baseline
    lst_qs = farm.thermal_observations.filter(mean_lst_c__isnull=False)
    lst_vals = [float(o.mean_lst_c) for o in lst_qs]
    lst_baseline = (sum(lst_vals) / len(lst_vals)) if lst_vals else None

    # 2. ET baseline
    et_qs = farm.et_observations.filter(mean_et__isnull=False)
    et_vals = [float(o.mean_et) for o in et_qs]
    et_baseline = (sum(et_vals) / len(et_vals)) if et_vals else None

    # 3. ESI baseline
    esi_qs = farm.esi_observations.filter(mean_esi__isnull=False)
    esi_vals = [float(o.mean_esi) for o in esi_qs]
    esi_baseline = (sum(esi_vals) / len(esi_vals)) if esi_vals else None

    return {
        'lst': {
            'baseline_mean': round(lst_baseline, 2) if lst_baseline is not None else None,
            'observation_count': len(lst_vals),
            'available': lst_baseline is not None,
        },
        'et': {
            'baseline_mean': round(et_baseline, 2) if et_baseline is not None else None,
            'observation_count': len(et_vals),
            'available': et_baseline is not None,
        },
        'esi': {
            'baseline_mean': round(esi_baseline, 2) if esi_baseline is not None else None,
            'observation_count': len(esi_vals),
            'available': esi_baseline is not None,
        },
    }


def analyze_environmental_stress(farm: Farm) -> dict:
    """
    Executes transparent, deterministic rules over the farm's actual observations.
    Evaluates:
      - LST anomaly vs baseline & temporal change
      - ET anomaly vs baseline & temporal change
      - ESI stress level & temporal change
      - Recent Open-Meteo weather stress factors
    Produces an environmental stress assessment with explicit human-readable reasons.
    """
    baselines = calculate_farm_baselines(farm)

    # 1. Retrieve latest and previous observations for each modality
    lst_obs = list(farm.thermal_observations.all().order_by('-observation_datetime')[:2])
    et_obs = list(farm.et_observations.all().order_by('-observation_datetime')[:2])
    esi_obs = list(farm.esi_observations.all().order_by('-observation_datetime')[:2])
    weather_obs = farm.weather_observations.all().order_by('-observation_datetime').first()

    # Track rule triggers and data sufficiency
    reasons = []
    stress_points = 0.0

    # ── LST Evaluation ─────────────────────────────────────────────────────────
    latest_lst = lst_obs[0] if lst_obs else None
    prev_lst = lst_obs[1] if len(lst_obs) > 1 else None

    lst_status = {
        'available': latest_lst is not None,
        'latest_datetime': latest_lst.observation_datetime.isoformat() if latest_lst else None,
        'latest_mean_c': _to_float(latest_lst.mean_lst_c) if latest_lst else None,
        'baseline_mean_c': baselines['lst']['baseline_mean'],
        'delta_c': None,
        'anomaly_c': None,
        'trend': 'insufficient_history',
        'status_text': 'No observations available' if not latest_lst else 'Normal',
    }

    if latest_lst and latest_lst.mean_lst_c is not None:
        latest_val = float(latest_lst.mean_lst_c)
        if baselines['lst']['baseline_mean'] is not None:
            lst_status['anomaly_c'] = round(latest_val - baselines['lst']['baseline_mean'], 2)

        if prev_lst and prev_lst.mean_lst_c is not None:
            delta = round(latest_val - float(prev_lst.mean_lst_c), 2)
            lst_status['delta_c'] = delta
            if delta >= 1.5:
                lst_status['trend'] = 'rising'
            elif delta <= -1.5:
                lst_status['trend'] = 'cooling'
            else:
                lst_status['trend'] = 'stable'
        else:
            lst_status['trend'] = 'insufficient_history'

        # Rule LST-1: High thermal anomaly above baseline
        if lst_status['anomaly_c'] is not None and lst_status['anomaly_c'] >= 3.0:
            stress_points += 1.0
            lst_status['status_text'] = 'Elevated Thermal Stress'
            reasons.append(
                f"Land Surface Temperature ({latest_val:.1f}°C) is {lst_status['anomaly_c']:+.1f}°C above the farm's historical baseline."
            )
        elif lst_status['anomaly_c'] is not None and lst_status['anomaly_c'] >= 1.5:
            stress_points += 0.5
            lst_status['status_text'] = 'Mild Thermal Elevation'
            reasons.append(
                f"Land Surface Temperature ({latest_val:.1f}°C) is moderately elevated (+{lst_status['anomaly_c']:.1f}°C above baseline)."
            )
        elif lst_status['delta_c'] is not None and lst_status['delta_c'] >= 2.5:
            stress_points += 0.5
            lst_status['status_text'] = 'Rapid Warming'
            reasons.append(
                f"LST increased by {lst_status['delta_c']:+.1f}°C compared to previous observation."
            )

    # ── ET Evaluation ──────────────────────────────────────────────────────────
    latest_et = et_obs[0] if et_obs else None
    prev_et = et_obs[1] if len(et_obs) > 1 else None

    et_status = {
        'available': latest_et is not None,
        'latest_datetime': latest_et.observation_datetime.isoformat() if latest_et else None,
        'latest_mean': _to_float(latest_et.mean_et) if latest_et else None,
        'baseline_mean': baselines['et']['baseline_mean'],
        'delta': None,
        'anomaly': None,
        'trend': 'insufficient_history',
        'status_text': 'No observations available' if not latest_et else 'Normal',
    }

    if latest_et and latest_et.mean_et is not None:
        latest_val = float(latest_et.mean_et)
        if baselines['et']['baseline_mean'] is not None:
            et_status['anomaly'] = round(latest_val - baselines['et']['baseline_mean'], 2)

        if prev_et and prev_et.mean_et is not None:
            delta = round(latest_val - float(prev_et.mean_et), 2)
            et_status['delta'] = delta
            if delta <= -0.5:
                et_status['trend'] = 'declining'
            elif delta >= 0.5:
                et_status['trend'] = 'increasing'
            else:
                et_status['trend'] = 'stable'
        else:
            et_status['trend'] = 'insufficient_history'

        # Rule ET-1: Significant evapotranspiration drop indicates moisture stress
        if et_status['anomaly'] is not None and et_status['anomaly'] <= -1.0:
            stress_points += 1.0
            et_status['status_text'] = 'Transpiration Deficit'
            reasons.append(
                f"Evapotranspiration ({latest_val:.2f} mm/day) has declined {abs(et_status['anomaly']):.2f} mm/day below farm baseline, indicating plant moisture stress."
            )
        elif et_status['delta'] is not None and et_status['delta'] <= -0.8:
            stress_points += 0.5
            et_status['status_text'] = 'Declining Transpiration'
            reasons.append(
                f"Evapotranspiration decreased by {abs(et_status['delta']):.2f} mm/day since previous observation."
            )

    # ── ESI Evaluation ─────────────────────────────────────────────────────────
    latest_esi = esi_obs[0] if esi_obs else None
    prev_esi = esi_obs[1] if len(esi_obs) > 1 else None

    esi_status = {
        'available': latest_esi is not None,
        'latest_datetime': latest_esi.observation_datetime.isoformat() if latest_esi else None,
        'latest_mean': _to_float(latest_esi.mean_esi) if latest_esi else None,
        'baseline_mean': baselines['esi']['baseline_mean'],
        'delta': None,
        'anomaly': None,
        'trend': 'insufficient_history',
        'status_text': 'No observations available' if not latest_esi else 'Normal',
    }

    if latest_esi and latest_esi.mean_esi is not None:
        latest_val = float(latest_esi.mean_esi)
        if baselines['esi']['baseline_mean'] is not None:
            esi_status['anomaly'] = round(latest_val - baselines['esi']['baseline_mean'], 2)

        if prev_esi and prev_esi.mean_esi is not None:
            delta = round(latest_val - float(prev_esi.mean_esi), 2)
            esi_status['delta'] = delta
            if delta <= -0.10:
                esi_status['trend'] = 'increasing_stress'
            elif delta >= 0.10:
                esi_status['trend'] = 'recovering'
            else:
                esi_status['trend'] = 'stable'
        else:
            esi_status['trend'] = 'insufficient_history'

        # Rule ESI-1: Low ESI ratio indicates high evaporative stress
        if latest_val <= 0.40 or (esi_status['anomaly'] is not None and esi_status['anomaly'] <= -0.15):
            stress_points += 1.0
            esi_status['status_text'] = 'Elevated Water Stress'
            reasons.append(
                f"Evaporative Stress Index ({latest_val:.2f}) indicates elevated water stress."
            )
        elif latest_val <= 0.55 or (esi_status['delta'] is not None and esi_status['delta'] <= -0.10):
            stress_points += 0.5
            esi_status['status_text'] = 'Mild Water Stress'
            reasons.append(
                f"Evaporative Stress Index ({latest_val:.2f}) indicates mild environmental water stress."
            )

    # ── Weather Evaluation ─────────────────────────────────────────────────────
    weather_status = {
        'available': weather_obs is not None,
        'latest_datetime': weather_obs.observation_datetime.isoformat() if weather_obs else None,
        'temperature': _to_float(weather_obs.temperature) if weather_obs else None,
        'relative_humidity': _to_float(weather_obs.relative_humidity) if weather_obs else None,
        'soil_moisture': _to_float(weather_obs.soil_moisture) if weather_obs else None,
        'vapour_pressure_deficit': _to_float(weather_obs.vapour_pressure_deficit) if weather_obs else None,
        'status_text': 'No recent weather recorded' if not weather_obs else 'Normal',
    }

    if weather_obs and weather_obs.temperature is not None:
        temp = float(weather_obs.temperature)
        rh = float(weather_obs.relative_humidity) if weather_obs.relative_humidity is not None else 50.0
        vpd = float(weather_obs.vapour_pressure_deficit) if weather_obs.vapour_pressure_deficit is not None else None

        if temp >= 36.0 and rh < 35.0:
            stress_points += 1.0
            weather_status['status_text'] = 'Extreme Heat & Aridity'
            reasons.append(
                f"Open-Meteo weather shows intense atmospheric heat ({temp:.1f}°C) and low humidity ({rh:.0f}%)."
            )
        elif temp >= 32.0 and rh < 45.0:
            stress_points += 0.5
            weather_status['status_text'] = 'Warm and Dry'
            reasons.append(
                f"Weather indicates warm, dry conditions (Temp: {temp:.1f}°C, Humidity: {rh:.0f}%)."
            )
        elif vpd is not None and vpd >= 2.5:
            stress_points += 0.5
            weather_status['status_text'] = 'High Vapour Pressure Deficit'
            reasons.append(
                f"Vapour pressure deficit ({vpd:.2f} kPa) creates atmospheric drying stress."
            )

    # ── Data Sufficiency Calculation ───────────────────────────────────────────
    total_obs = (
        baselines['lst']['observation_count'] +
        baselines['et']['observation_count'] +
        baselines['esi']['observation_count'] +
        (1 if weather_obs else 0)
    )

    data_sufficiency = {
        'lst_count': baselines['lst']['observation_count'],
        'et_count': baselines['et']['observation_count'],
        'esi_count': baselines['esi']['observation_count'],
        'weather_count': 1 if weather_obs else 0,
        'total_observations': total_obs,
        'is_sufficient_for_trends': (
            baselines['lst']['observation_count'] >= 2 or
            baselines['et']['observation_count'] >= 2 or
            baselines['esi']['observation_count'] >= 2
        ),
        'status': 'sufficient' if total_obs >= 3 else 'insufficient_history',
    }

    # ── Determine Stress Level Deterministically ───────────────────────────────
    if total_obs == 0:
        stress_level = 'normal'
        summary = "No environmental observations available yet for this farm."
        reasons = ["Historical satellite and weather observations will be recorded as data is retrieved."]
    elif stress_points >= 2.5:
        stress_level = 'high'
        summary = f"High environmental stress detected for {farm.farm_name}. Multiple environmental indicators exceed baseline stress thresholds."
    elif stress_points >= 1.5:
        stress_level = 'elevated'
        summary = f"Elevated environmental stress detected for {farm.farm_name}. Recent observations deviate from historical farm baseline."
    elif stress_points >= 0.5:
        stress_level = 'mild'
        summary = f"Mild environmental stress detected for {farm.farm_name}. One or more indicators show minor elevation."
    else:
        stress_level = 'normal'
        summary = f"Environmental conditions for {farm.farm_name} remain within typical baseline ranges."
        if not reasons:
            reasons = ["LST, ET, ESI, and weather observations are within historical baseline ranges."]

    return {
        'stress_level': stress_level,
        'stress_points': round(stress_points, 1),
        'summary': summary,
        'reasons': reasons,
        'lst_status': lst_status,
        'et_status': et_status,
        'esi_status': esi_status,
        'weather_status': weather_status,
        'data_sufficiency': data_sufficiency,
        'baselines': baselines,
    }


def get_or_create_environmental_assessment(farm: Farm, force_reassess: bool = False) -> EnvironmentalRiskAssessment:
    """
    Evaluates or retrieves the latest environmental assessment for the farm.
    If an assessment was already generated within the last 30 minutes, returns it
    unless force_reassess is True.
    If elevated or high stress is identified, dispatches an in-app Alert if not already alerted today.
    """
    now = timezone.now()
    if not force_reassess:
        recent = farm.environmental_risk_assessments.filter(
            assessment_datetime__gte=now - timedelta(minutes=30)
        ).first()
        if recent:
            return recent

    analysis = analyze_environmental_stress(farm)

    assessment = EnvironmentalRiskAssessment.objects.create(
        farm=farm,
        assessment_datetime=now,
        stress_level=analysis['stress_level'],
        summary=analysis['summary'],
        reasons=analysis['reasons'],
        lst_status=analysis['lst_status'],
        et_status=analysis['et_status'],
        esi_status=analysis['esi_status'],
        weather_status=analysis['weather_status'],
        data_sufficiency=analysis['data_sufficiency'],
    )

    # Trigger alert if elevated or high environmental stress
    if analysis['stress_level'] in ('elevated', 'high') and farm.user:
        try:
            from alerts.models import Alert
            # Check if an alert was already triggered for this farm in the last 24 hours
            last_alert = Alert.objects.filter(
                recipient=farm.user,
                alert_type='high_risk_forecast',
                created_at__gte=now - timedelta(hours=24)
            ).first()

            if not last_alert:
                Alert.objects.create(
                    recipient=farm.user,
                    alert_type='high_risk_forecast',
                    message=(
                        f"Elevated environmental stress detected for {farm.farm_name}. "
                        "Recent environmental observations differ from the farm's historical conditions. "
                        "Consider inspecting the crop and scanning leaves."
                    )
                )
                logger.info(
                    "Generated high_risk_forecast alert for user %s on farm %s",
                    farm.user.id, farm.id
                )
        except Exception as e:
            logger.warning("Failed to dispatch alert for farm %s: %s", farm.id, e)

    return assessment
