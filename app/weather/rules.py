"""
Agricultural Rule Engine for AgriSmart.

Four rule classes — all transparent, no ML:
  IrrigationRules      → RECOMMEND / DELAY / NOT_REQUIRED
  DiseaseWeatherRisk   → score 0-100 + level LOW/MODERATE/HIGH
  HeatRiskRules        → score 0-100 + level LOW/MODERATE/HIGH
  WindAdvisoryRules    → level LOW/MODERATE/HIGH + spraying advisory

All thresholds come from crop_profiles.json — configurable without code changes.
"""
import json
import os
import logging

logger = logging.getLogger('weather')

_PROFILES_PATH = os.path.join(os.path.dirname(__file__), 'crop_profiles.json')
with open(_PROFILES_PATH, encoding='utf-8') as _f:
    _CROP_PROFILES = json.load(_f)


def _profile(crop_name: str) -> dict:
    """Return threshold dict for the given crop name (falls back to 'default')."""
    if crop_name:
        key = crop_name.lower().strip()
        if key in _CROP_PROFILES:
            return _CROP_PROFILES[key]
    return _CROP_PROFILES.get('default', {
        'low_soil_moisture': 20, 'heat_threshold': 35, 'vpd_stress': 1.5,
        'high_humidity': 75, 'rain_delay_threshold': 50,
        'high_wind': 30, 'moderate_wind': 15,
    })


# ── Irrigation ────────────────────────────────────────────────────────────────

class IrrigationRules:
    """
    Decides irrigation recommendation from soil moisture, ET₀, and rainfall.

    Logic tree:
      soil LOW + no rain  →  RECOMMEND (priority HIGH if ET₀ also high)
      soil LOW + rain     →  DELAY
      soil OK  + rain     →  DELAY
      soil OK  + no rain  →  NOT_REQUIRED
    """

    @staticmethod
    def evaluate(weather_data: dict, crop_name: str = None) -> dict:
        p = _profile(crop_name)
        soil    = weather_data.get('soil', {})
        today   = weather_data.get('today', {})
        current = weather_data.get('current', {})

        sm  = soil.get('moisture_percent')
        rp  = float(today.get('rain_probability', 0) or 0)
        rf  = float(today.get('rainfall', 0) or 0)
        et0 = float(today.get('et0', 0) or 0)
        temp = float(current.get('temperature', 25) or 25)

        low_sm   = float(p.get('low_soil_moisture', 20))
        delay_rp = float(p.get('rain_delay_threshold', 50))
        heat_thr = float(p.get('heat_threshold', 35))

        if sm is None:
            return {
                'status': 'UNKNOWN', 'priority': 'UNKNOWN',
                'soil_moisture': None, 'rain_probability': rp, 'et0': et0,
                'reason': 'Soil moisture data not available for this location.',
                'recommendation': 'Monitor soil manually and irrigate if crops show water stress.',
                'next_window': 'Unknown',
            }

        rain_expected  = rp > delay_rp or rf > 2.0
        soil_is_low    = sm < low_sm
        et0_high       = et0 > 5.0
        temp_high      = temp > heat_thr - 3

        if soil_is_low and not rain_expected:
            priority = 'HIGH' if (et0_high or temp_high) else 'MEDIUM'
            return {
                'status': 'RECOMMEND', 'priority': priority,
                'soil_moisture': round(sm, 1), 'rain_probability': rp, 'et0': round(et0, 2),
                'reason': f'Soil moisture is low ({sm:.1f}%) and no significant rain is expected.',
                'recommendation': 'Irrigate in the early morning (6–9 AM) to minimise evaporation loss.',
                'next_window': 'Today morning',
            }
        if soil_is_low and rain_expected:
            return {
                'status': 'DELAY', 'priority': 'LOW',
                'soil_moisture': round(sm, 1), 'rain_probability': rp, 'et0': round(et0, 2),
                'reason': f'Soil moisture is low but rain is expected ({rp:.0f}% probability).',
                'recommendation': 'Wait for rain. Irrigate tomorrow morning if rain does not arrive.',
                'next_window': '1–2 days later',
            }
        if not soil_is_low and rain_expected:
            return {
                'status': 'DELAY', 'priority': 'LOW',
                'soil_moisture': round(sm, 1), 'rain_probability': rp, 'et0': round(et0, 2),
                'reason': f'Soil moisture is sufficient ({sm:.1f}%) and rain is likely.',
                'recommendation': 'No irrigation needed. Soil moisture is adequate.',
                'next_window': '3 days later',
            }
        return {
            'status': 'NOT_REQUIRED', 'priority': 'NONE',
            'soil_moisture': round(sm, 1), 'rain_probability': rp, 'et0': round(et0, 2),
            'reason': f'Soil moisture is adequate ({sm:.1f}%). No irrigation needed.',
            'recommendation': 'Continue monitoring soil moisture. Irrigate when levels drop below threshold.',
            'next_window': '3–5 days later',
        }


# ── Disease Weather Risk ──────────────────────────────────────────────────────

class DiseaseWeatherRisk:
    """
    Estimates weather-based disease RISK (not actual disease detection).

    This evaluates whether environmental conditions are favourable for
    fungal/bacterial disease development. It is NOT a disease classifier.

    Score components (transparent):
      Humidity   → up to 40 pts
      Rainfall   → up to 30 pts
      Temperature→ up to 20 pts
      Low VPD    → up to 10 pts
    """

    @staticmethod
    def evaluate(weather_data: dict, crop_name: str = None) -> dict:
        p       = _profile(crop_name)
        current = weather_data.get('current', {})
        today   = weather_data.get('today', {})
        hourly  = weather_data.get('hourly', [])

        humidity = float(current.get('humidity', 0) or 0)
        temp     = float(current.get('temperature', 25) or 25)
        rainfall = float(today.get('rainfall', 0) or 0)
        high_hum = float(p.get('high_humidity', 75))

        vpds = [h.get('vpd') for h in hourly[:12] if h.get('vpd') is not None]
        avg_vpd = sum(vpds) / len(vpds) if vpds else None

        score = 0
        factors = []

        if humidity >= 85:
            score += 40; factors.append(f'Very high humidity ({humidity:.0f}%)')
        elif humidity >= high_hum:
            score += 25; factors.append(f'High humidity ({humidity:.0f}%)')
        elif humidity >= 60:
            score += 10

        if rainfall >= 5:
            score += 30; factors.append(f'Significant recent rainfall ({rainfall:.1f} mm)')
        elif rainfall >= 1:
            score += 15; factors.append(f'Recent rainfall ({rainfall:.1f} mm)')

        if 20 <= temp <= 30:
            score += 20; factors.append(f'Temperature in disease-favourable range ({temp:.1f}°C)')
        elif 15 <= temp <= 35:
            score += 10

        if avg_vpd is not None and avg_vpd < 0.5:
            score += 10; factors.append('Low vapour pressure deficit — leaf surfaces likely to remain moist')

        score = min(score, 100)

        if score >= 70:
            level = 'HIGH'
            msg   = 'Conditions strongly favour fungal and bacterial disease development.'
            rec   = 'Inspect crops daily. Consider preventive fungicide application.'
        elif score >= 40:
            level = 'MODERATE'
            msg   = 'Conditions may favour fungal disease development.'
            rec   = 'Monitor leaves for early symptoms. Ensure good airflow around plants.'
        else:
            level = 'LOW'
            msg   = 'Current weather is not particularly favourable for disease development.'
            rec   = 'Continue normal crop monitoring.'

        return {
            'score': score, 'level': level,
            'factors': factors, 'message': msg, 'recommendation': rec,
        }


# ── Heat Risk ─────────────────────────────────────────────────────────────────

class HeatRiskRules:
    """
    Evaluates heat and vapour pressure deficit (VPD) stress for crops.

    Score:
      Temperature above crop threshold → up to 60 pts
      VPD above crop stress threshold  → up to 40 pts
    """

    @staticmethod
    def evaluate(weather_data: dict, crop_name: str = None) -> dict:
        p       = _profile(crop_name)
        current = weather_data.get('current', {})
        hourly  = weather_data.get('hourly', [])

        temp       = float(current.get('temperature', 25) or 25)
        feels_like = float(current.get('feels_like', temp) or temp)
        heat_thr   = float(p.get('heat_threshold', 35))
        vpd_stress = float(p.get('vpd_stress', 1.5))

        vpds = [h.get('vpd') for h in hourly[:12] if h.get('vpd') is not None]
        avg_vpd = round(sum(vpds) / len(vpds), 2) if vpds else None

        score = 0
        if   temp >= heat_thr + 5: score += 60
        elif temp >= heat_thr:     score += 45
        elif temp >= heat_thr - 5: score += 25
        elif temp >= heat_thr - 10:score += 10

        if avg_vpd is not None:
            if   avg_vpd >= vpd_stress * 1.5: score += 40
            elif avg_vpd >= vpd_stress:        score += 25
            elif avg_vpd >= vpd_stress * 0.7:  score += 10

        score = min(score, 100)

        if   score >= 70: level, rec = 'HIGH',     'Consider shade nets and extra irrigation.'
        elif score >= 40: level, rec = 'MODERATE',  'Monitor crops for wilting. Irrigate in early morning.'
        else:             level, rec = 'LOW',       'Temperature is within normal crop tolerance.'

        return {
            'score': score, 'level': level,
            'temperature': temp, 'feels_like': feels_like,
            'vpd': avg_vpd, 'recommendation': rec,
        }


# ── Wind Advisory ─────────────────────────────────────────────────────────────

class WindAdvisoryRules:
    """Determines spraying suitability and wind advisory level."""

    @staticmethod
    def evaluate(weather_data: dict, crop_name: str = None) -> dict:
        p       = _profile(crop_name)
        current = weather_data.get('current', {})

        ws    = float(current.get('wind_speed', 0) or 0)
        gusts = float(current.get('wind_gusts', 0) or 0)
        wd    = current.get('wind_direction', 0) or 0

        high = float(p.get('high_wind', 30))
        mod  = float(p.get('moderate_wind', 15))

        if ws >= high or gusts >= high + 10:
            level, advisory, suitable = (
                'HIGH',
                'Avoid pesticide and fertiliser spraying — strong winds cause significant drift.',
                False,
            )
        elif ws >= mod:
            level, advisory, suitable = (
                'MODERATE',
                'Use caution when spraying. Reduce pressure; apply early morning when winds are calmer.',
                False,
            )
        else:
            level, advisory, suitable = (
                'LOW',
                'Conditions are suitable for normal field activities and pesticide application.',
                True,
            )

        dirs = ['N','NE','E','SE','S','SW','W','NW']
        dir_label = dirs[round(wd / 45) % 8] if wd else 'N/A'

        return {
            'level': level,
            'wind_speed': ws,
            'wind_gusts': gusts,
            'wind_direction': wd,
            'wind_direction_label': dir_label,
            'advisory': advisory,
            'spraying_suitable': suitable,
        }
