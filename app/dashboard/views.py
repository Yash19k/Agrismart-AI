"""
Dashboard Aggregation View — GET /api/dashboard/

Aggregates from all services into a single response for the React frontend.
This is the ONLY endpoint the dashboard page calls.

Architecture:
  React → GET /api/dashboard/ → Django (this view)
                                   ├── WeatherService → Open-Meteo
                                   ├── IrrigationRules
                                   ├── DiseaseWeatherRisk
                                   ├── HeatRiskRules
                                   ├── WindAdvisoryRules
                                   ├── SustainabilityCalculator
                                   ├── Farm / Crop DB
                                   └── DiseaseScan DB
"""
import logging
from datetime import datetime

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm, Crop, WeatherSnapshot, SustainabilityRecord, Alert, Activity, IrrigationRecord
from farms.serializers import CropSerializer, FarmSerializer
from disease.models import DiseaseScan
from disease.serializers import DiseaseScanSerializer
from weather.services import WeatherService, WeatherServiceError
from weather.rules import IrrigationRules, DiseaseWeatherRisk, HeatRiskRules, WindAdvisoryRules
from sustainability.services import calculate_sustainability_score

logger = logging.getLogger('dashboard')

# ── Crop Recommendation Table (Bonus A) ───────────────────────────────────────
# Recommends top crops by soil type and current temperature range.
# No ML needed — transparent rule-based lookup as per problem statement.

_SOIL_CROP_MATRIX = {
    'black':    [
        {'name': 'Cotton',     'emoji': '🌿', 'reason': 'Black cotton soil retains moisture perfectly for cotton root development'},
        {'name': 'Sorghum',    'emoji': '🌾', 'reason': 'Deep black soil supports sorghum with minimal irrigation'},
        {'name': 'Wheat',      'emoji': '🌾', 'reason': 'High clay content in black soil provides sustained nutrients for wheat'},
        {'name': 'Sunflower',  'emoji': '🌻', 'reason': 'Good drainage capacity of black soil suits oilseeds'},
        {'name': 'Soybean',    'emoji': '🫘', 'reason': 'Black soil pH 6.5–7.5 is ideal for soybean nitrogen fixation'},
    ],
    'alluvial': [
        {'name': 'Wheat',      'emoji': '🌾', 'reason': 'Alluvial soil is India\'s most fertile — excellent for wheat'},
        {'name': 'Rice',       'emoji': '🍚', 'reason': 'High water retention in alluvial soil suits paddy cultivation'},
        {'name': 'Sugarcane',  'emoji': '🎋', 'reason': 'Rich alluvial nutrients support high biomass sugarcane'},
        {'name': 'Vegetables', 'emoji': '🥦', 'reason': 'Good drainage + fertility makes alluvial ideal for vegetables'},
        {'name': 'Maize',      'emoji': '🌽', 'reason': 'Well-drained alluvial soil with good aeration suits maize'},
    ],
    'red':      [
        {'name': 'Groundnut',  'emoji': '🥜', 'reason': 'Red soil\'s loose texture allows groundnut pods to develop freely'},
        {'name': 'Millets',    'emoji': '🌾', 'reason': 'Millets tolerate red soil\'s lower fertility and drought well'},
        {'name': 'Pulses',     'emoji': '🫘', 'reason': 'Leguminous pulses improve red soil\'s nitrogen content'},
        {'name': 'Cotton',     'emoji': '🌿', 'reason': 'Cotton adapts well to red soil in warm climates'},
        {'name': 'Tobacco',    'emoji': '🌱', 'reason': 'Red soil\'s acidic pH and iron content suits tobacco'},
    ],
    'loamy':    [
        {'name': 'Tomato',     'emoji': '🍅', 'reason': 'Loamy soil\'s ideal drainage and fertility is perfect for tomatoes'},
        {'name': 'Potato',     'emoji': '🥔', 'reason': 'Loose loamy soil allows tuber expansion without compaction'},
        {'name': 'Maize',      'emoji': '🌽', 'reason': 'Good water and air balance in loamy soil suits maize growth'},
        {'name': 'Wheat',      'emoji': '🌾', 'reason': 'Loamy soil retains nutrients well throughout wheat growth cycle'},
        {'name': 'Chilli',     'emoji': '🌶️', 'reason': 'Well-drained loamy soil prevents root rot in chilli plants'},
    ],
    'clayey':   [
        {'name': 'Rice',       'emoji': '🍚', 'reason': 'Clayey soil\'s high water retention is essential for paddy farming'},
        {'name': 'Wheat',      'emoji': '🌾', 'reason': 'Clay soil provides sustained moisture for winter wheat'},
        {'name': 'Sugarcane',  'emoji': '🎋', 'reason': 'High clay water retention supports sugarcane\'s high water demand'},
        {'name': 'Jute',       'emoji': '🌿', 'reason': 'Jute thrives in waterlogged clayey conditions'},
    ],
    'sandy':    [
        {'name': 'Groundnut',  'emoji': '🥜', 'reason': 'Sandy soil\'s free drainage prevents groundnut root diseases'},
        {'name': 'Watermelon', 'emoji': '🍉', 'reason': 'Sandy soil warms quickly, boosting fruit sweetness'},
        {'name': 'Millets',    'emoji': '🌾', 'reason': 'Drought-resistant millets are best for water-scarce sandy soils'},
        {'name': 'Carrot',     'emoji': '🥕', 'reason': 'Loose sandy soil allows carrot roots to grow straight and long'},
        {'name': 'Radish',     'emoji': '🫚', 'reason': 'Fast-draining sandy soil prevents radish from rotting'},
    ],
}


def _crop_recommendation(farm, weather_data) -> list:
    """Return top 3 crop recommendations based on soil type and live temperature."""
    soil = (farm.soil_type or 'loamy').lower()
    candidates = _SOIL_CROP_MATRIX.get(soil, _SOIL_CROP_MATRIX['loamy'])

    temp = None
    if weather_data:
        temp = (weather_data.get('current') or {}).get('temperature')

    result = []
    for c in candidates[:4]:
        entry = {
            'name':    c['name'],
            'emoji':   c['emoji'],
            'reason':  c['reason'],
            'soil_match': True,
        }
        # Temperature suitability note
        if temp is not None:
            if temp > 35:
                entry['temp_note'] = f'⚠️ High heat ({temp:.0f}°C) — ensure adequate irrigation for this crop.'
            elif temp < 15:
                entry['temp_note'] = f'❄️ Cool temperatures ({temp:.0f}°C) — suitable for Rabi crops.'
            else:
                entry['temp_note'] = f'✅ Current temperature ({temp:.0f}°C) is suitable for this crop.'
        result.append(entry)

    return result[:3]


def _alerts(farm, irrigation, disease_risk, heat_risk, wind_risk, weather_data):
    alerts = []
    if irrigation.get('status') == 'RECOMMEND' and irrigation.get('priority') == 'HIGH':
        alerts.append({
            'type': 'irrigation',
            'level': 'high',
            'icon': '💧',
            'title': 'Irrigation Required',
            'message': irrigation.get('recommendation', 'Soil moisture is low; irrigation recommended.')
        })
    d_level = disease_risk.get('level', 'LOW')
    if d_level == 'HIGH':
        alerts.append({
            'type': 'disease_risk',
            'level': 'high',
            'icon': '🦠',
            'title': 'High Disease Risk',
            'message': disease_risk.get('message', 'High humidity and warm temperatures favor fungal development.')
        })
    elif d_level == 'MODERATE':
        alerts.append({
            'type': 'disease_risk',
            'level': 'moderate',
            'icon': '⚠️',
            'title': 'Moderate Disease Risk',
            'message': disease_risk.get('message', 'Conditions moderately favor disease development.')
        })
    if heat_risk.get('level') == 'HIGH':
        alerts.append({
            'type': 'heat',
            'level': 'high',
            'icon': '🌡️',
            'title': 'High Heat Stress',
            'message': heat_risk.get('recommendation', 'High temperatures observed. Monitor crop hydration.')
        })
    if wind_risk.get('level') == 'HIGH':
        alerts.append({
            'type': 'wind',
            'level': 'high',
            'icon': '💨',
            'title': 'Strong Wind Advisory',
            'message': wind_risk.get('advisory', 'Avoid pesticide spraying during strong winds.')
        })
    rp = float((weather_data.get('today') or {}).get('rain_probability', 0) or 0)
    if rp >= 70:
        alerts.append({
            'type': 'rain',
            'level': 'info',
            'icon': '🌧️',
            'title': 'Rain Expected Today',
            'message': f'Rain probability: {rp:.0f}%. Plan field activities accordingly.'
        })

    # Include any custom active DB alerts for this farm
    db_alerts = farm.alerts.filter(is_active=True).order_by('-created_at')[:5]
    for da in db_alerts:
        alerts.append({
            'type': da.alert_type,
            'level': da.level,
            'icon': da.icon or '🔔',
            'title': da.title,
            'message': da.message
        })

    return alerts


def _activity(farm, disease_scans):
    acts = []

    # Database recorded activities
    for a in farm.activities.all()[:5]:
        acts.append({
            'icon': a.icon or '🌱',
            'title': a.title,
            'sub': a.sub,
            'time': a.created_at.strftime('%d %b, %I:%M %p') if a.created_at else '',
            'color': 'bg-emerald-100',
        })

    # Disease scans
    for s in disease_scans[:3]:
        acts.append({
            'icon': '🔬',
            'title': s.predicted_class or f"{s.crop_type or 'Crop'} scan uploaded",
            'sub': 'Pending analysis — model not ready yet' if s.model_status == 'pending' else (s.predicted_class or 'Scanned'),
            'time': s.created_at.strftime('%d %b, %I:%M %p') if s.created_at else '',
            'color': 'bg-red-100',
        })

    # Fallback farm creation entry
    if not acts and farm.created_at:
        acts.append({
            'icon': '🏡',
            'title': f'{farm.farm_name} registered',
            'sub': farm.location_display,
            'time': farm.created_at.strftime('%d %b %Y'),
            'color': 'bg-green-100',
        })

    return acts[:6]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_view(request):
    # ── 1. Resolve farm ────────────────────────────────────────────────────
    farm_id = request.query_params.get('farm_id')
    user_farms = list(Farm.objects.filter(user=request.user).prefetch_related('crops'))

    if not user_farms:
        return Response({
            'has_farm': False,
            'message': 'No farm found. Please add your farm to see personalized insights.',
            'all_farms': [],
            'farm': None,
            'current_weather': None,
            'forecast': [],
            'hourly': [],
            'soil': None,
            'irrigation': None,
            'disease_weather_risk': None,
            'heat_risk': None,
            'wind_risk': None,
            'sustainability': {
                'score': None,
                'water_efficiency': None,
                'soil_health': None,
                'crop_health': None,
                'resource_efficiency': None,
                'data_sufficient': False,
                'message': 'Add your farm to calculate sustainability score.',
            },
            'crops': [],
            'stats': {
                'active_crops': 0,
                'total_predictions': 0,
                'water_usage_liters': 0,
                'active_crops_names': 'No farm added',
            },
            'alerts': [],
            'recent_activity': [],
            'latest_disease_scan': None,
        })

    farm = None
    if farm_id:
        farm = next((f for f in user_farms if str(f.id) == str(farm_id)), None)
    if not farm:
        farm = user_farms[0]

    # ── 2. Weather (graceful degradation) ─────────────────────────────────
    weather_data = None
    weather_error = None
    try:
        weather_data = WeatherService.fetch_farm_weather(farm)
        # Record weather snapshot
        cur = weather_data.get('current', {})
        today = weather_data.get('today', {})
        soil_moist = (weather_data.get('soil', {}) or {}).get('moisture_percent')
        WeatherSnapshot.objects.create(
            farm=farm,
            temperature=cur.get('temperature', 0.0),
            humidity=cur.get('humidity', 0.0),
            precipitation=cur.get('precipitation', 0.0),
            wind_speed=cur.get('wind_speed', 0.0),
            weather_code=cur.get('weather_code', 0),
            condition=cur.get('condition', ''),
            soil_moisture=soil_moist,
            et0=today.get('et0'),
        )
    except WeatherServiceError as e:
        weather_error = str(e)
        logger.warning('Weather failed for farm %s: %s', farm.id, e)

    # ── 3. Crops ───────────────────────────────────────────────────────────
    active_crops = list(farm.crops.filter(status='active'))
    crops_data   = CropSerializer(active_crops, many=True).data

    # ── 4. Disease scans ───────────────────────────────────────────────────
    scans_qs = DiseaseScan.objects.filter(user=request.user, farm=farm).order_by('-created_at')
    scans    = list(scans_qs[:10])
    latest   = scans[0] if scans else None
    latest_data = DiseaseScanSerializer(latest, context={'request': request}).data if latest else None

    # ── 5. Rules + sustainability (only when weather available) ────────────
    crop_name = farm.crop or (active_crops[0].name if active_crops else None)

    if weather_data:
        irrigation   = IrrigationRules.evaluate(weather_data, crop_name)
        disease_risk = DiseaseWeatherRisk.evaluate(weather_data, crop_name)
        heat_risk    = HeatRiskRules.evaluate(weather_data, crop_name)
        wind_risk    = WindAdvisoryRules.evaluate(weather_data, crop_name)

        scan_list = [{'is_healthy': s.is_healthy} for s in scans]
        sustainability = calculate_sustainability_score(weather_data, scan_list, farm)

        if sustainability.get('score'):
            SustainabilityRecord.objects.create(
                farm=farm,
                score=sustainability['score'],
                water_efficiency=sustainability.get('water_efficiency', 0),
                soil_health=sustainability.get('soil_health', 0),
                crop_health=sustainability.get('crop_health', 0),
                resource_efficiency=sustainability.get('resource_efficiency', 0),
            )

        alerts          = _alerts(farm, irrigation, disease_risk, heat_risk, wind_risk, weather_data)
        current_weather = weather_data.get('current', {})
        forecast        = weather_data.get('daily', [])
        hourly          = weather_data.get('hourly', [])
        soil            = weather_data.get('soil', {})
        meta            = weather_data.get('meta', {})
        crop_recs       = _crop_recommendation(farm, weather_data)
    else:
        irrigation   = {'status': 'UNAVAILABLE', 'priority': 'LOW', 'reason': 'Weather data unavailable.', 'recommendation': 'Check back shortly.'}
        disease_risk = {'score': 0, 'level': 'UNKNOWN', 'factors': [], 'message': 'Weather data temporarily unavailable.', 'recommendation': 'Monitor crops regularly.'}
        heat_risk    = {'score': 0, 'level': 'UNKNOWN', 'temperature': None, 'recommendation': 'Data unavailable.'}
        wind_risk    = {'level': 'UNKNOWN', 'wind_speed': 0, 'advisory': 'Wind data unavailable.'}
        sustainability = {'score': 75, 'data_sufficient': False, 'water_efficiency': 80, 'soil_health': 70, 'crop_health': 75, 'resource_efficiency': 75}
        alerts = [{'type': 'weather_error', 'level': 'warning', 'icon': '⚠️',
                    'title': 'Weather Unavailable',
                    'message': weather_error or 'Weather data is temporarily unavailable.'}]
        current_weather = {}
        forecast = []
        hourly   = []
        soil     = {}
        crop_recs = _crop_recommendation(farm, None)
        now      = datetime.now()
        meta     = {
            'season':       'Kharif Season',
            'date_display': now.strftime('%a, %d %b %Y'),
        }

    # ── 6. Stat counts ─────────────────────────────────────────────────────
    total_predictions = DiseaseScan.objects.filter(user=request.user).count()
    water_records = list(farm.irrigation_records.filter(status='applied').values_list('water_amount_liters', flat=True))
    total_water = sum(water_records) if water_records else 0

    all_farms_data = [
        {
            'id': f.id,
            'farm_name': f.farm_name,
            'location_display': f.location_display,
            'crop': f.crop,
        }
        for f in user_farms
    ]

    # ── 7. Response ────────────────────────────────────────────────────────
    return Response({
        'has_farm': True,
        'farm': {
            'id':               farm.id,
            'name':             farm.farm_name,
            'location':         farm.location_display,
            'crop':             farm.crop,
            'soil_type':        farm.soil_type,
            'farm_size':        farm.farm_size,
            'irrigation_type':  farm.irrigation_type,
            'latitude':         farm.latitude,
            'longitude':        farm.longitude,
        },
        'all_farms':          all_farms_data,
        'current_weather':    current_weather,
        'weather_error':      weather_error,
        'forecast':           forecast,
        'hourly':             hourly,
        'soil': {
            'moisture':         soil.get('moisture_percent'),
            'moisture_raw':     soil.get('moisture_raw'),
            'moisture_percent': soil.get('moisture_percent'),
        },
        'irrigation':         irrigation,
        'disease_weather_risk': disease_risk,
        'heat_risk':          heat_risk,
        'wind_risk':          wind_risk,
        'sustainability':     sustainability,
        'crops':              list(crops_data),
        'crop_recommendation': crop_recs,
        'stats': {
            'active_crops':      len(active_crops),
            'total_predictions': total_predictions,
            'disease_scans':     total_predictions,
            'water_usage_liters': total_water,
            'active_crops_names': ", ".join([c.name for c in active_crops]) or farm.crop or "No crops added",
        },
        'alerts':           alerts,
        'recent_activity':  _activity(farm, scans),
        'latest_disease_scan': latest_data,
        'meta':             meta,
    })
