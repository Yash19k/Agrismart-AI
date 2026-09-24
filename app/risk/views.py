from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm
from disease.models import DiseaseScan
from weather.services import WeatherService

from .models import RiskAssessment
from .serializers import RiskCalculationInputSerializer, RiskAssessmentSerializer
from .engine import calculate_risk
from .forecast import generate_7day_forecast
from .ipm import get_ipm_guidance


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_risk_view(request):
    """
    POST /api/risk/calculate/
    Computes deterministic multi-factor risk, 7-day forecast, and IPM advice.
    Enforces authentication and farm ownership.
    """
    serializer = RiskCalculationInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    farm_id = data.get('farm_id')
    user = request.user
    farm = None

    if farm_id:
        if getattr(user, 'role', 'farmer') == 'farmer':
            farm = Farm.objects.filter(id=farm_id, user=user).first()
            if not farm:
                return Response(
                    {'detail': 'Farm not found or you do not have permission to access it.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            farm = Farm.objects.filter(id=farm_id).first()

    crop_stage = data.get('crop_stage') or getattr(farm, 'crop_stage', 'vegetative')

    # Compute risk
    risk_result = calculate_risk(
        crop_stage=crop_stage,
        humidity=data['humidity'],
        temperature=data['temperature'],
        rainfall_prob=data['rainfall_prob'],
        disease_confidence=data['disease_confidence'],
        disease_severity=data['disease_severity'],
        is_healthy=data['is_healthy'],
        pest_count=data['pest_count'],
        local_incidence_count=data['local_incidence_count'],
    )

    # 7-day forecast
    current_weather = {
        'temperature': data['temperature'],
        'humidity': data['humidity'],
        'precipitation': data['rainfall_prob'],
    }
    forecast_data = generate_7day_forecast(
        base_crop_stage=crop_stage,
        disease_confidence=data['disease_confidence'],
        disease_severity=data['disease_severity'],
        is_healthy=data['is_healthy'],
        pest_count=data['pest_count'],
        local_incidence_count=data['local_incidence_count'],
        current_weather=current_weather,
    )

    # IPM Advice (Safety gate: authenticated farmer advice)
    safety_gate_passed = data['is_healthy'] or data['disease_confidence'] >= 0.80
    ipm_guidance = get_ipm_guidance(
        disease_name=data.get('disease_name', ''),
        risk_level=risk_result['level'],
        safety_gate_passed=safety_gate_passed,
    )

    return Response({
        **risk_result,
        'forecast': forecast_data,
        'ipm_actions': ipm_guidance,
        'crop_stage': crop_stage,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_risk_view(request, farm_id):
    """
    GET /api/risk/farm/<farm_id>/
    Computes full risk profile for a specific farm using its stage, latest scan,
    current weather, and local incidence.
    Enforces farm ownership for farmers.
    """
    user = request.user
    if getattr(user, 'role', 'farmer') == 'farmer':
        farm = Farm.objects.filter(id=farm_id, user=user).first()
        if not farm:
            return Response(
                {'detail': 'Farm not found or you do not have permission to view it.'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        farm = Farm.objects.filter(id=farm_id).first()
        if not farm:
            return Response({'detail': 'Farm not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Fetch real weather or fallback
    weather_data = {}
    daily_forecast = []
    try:
        w_res = WeatherService.fetch_farm_weather(farm)
        cur = w_res.get('current', {})
        weather_data = {
            'temperature': cur.get('temperature', 28.0),
            'humidity': cur.get('humidity', 65.0),
            'rainfall_prob': cur.get('precipitation', 10.0),
        }
        daily_forecast = w_res.get('daily', [])
    except Exception:
        weather_data = {'temperature': 28.0, 'humidity': 65.0, 'rainfall_prob': 15.0}

    # Sensor reading integration (overrides weather API if fresh <24h)
    sensor_source = None
    soil_moisture = getattr(farm, 'soil_moisture_pct', None)
    soil_ph = getattr(farm, 'soil_ph', None)
    try:
        from sensors.models import SensorReading
        cutoff_24h = timezone.now() - timedelta(hours=24)
        latest_sensor = SensorReading.objects.filter(farm=farm, recorded_at__gte=cutoff_24h).order_by('-recorded_at').first()
        if latest_sensor:
            sensor_source = f"{latest_sensor.get_source_display()} sensor"
            if latest_sensor.humidity is not None:
                weather_data['humidity'] = latest_sensor.humidity
            if latest_sensor.temperature is not None:
                weather_data['temperature'] = latest_sensor.temperature
            if latest_sensor.soil_moisture is not None:
                soil_moisture = latest_sensor.soil_moisture
            if latest_sensor.ph is not None:
                soil_ph = latest_sensor.ph
    except Exception:
        pass

    # Latest disease scan for this farm
    latest_scan = DiseaseScan.objects.filter(farm=farm).order_by('-created_at').first()
    is_healthy = latest_scan.is_healthy if latest_scan else True
    confidence = latest_scan.confidence if (latest_scan and not is_healthy) else 0.0
    severity = latest_scan.severity if (latest_scan and not is_healthy) else 'none'
    disease_name = latest_scan.disease_name if latest_scan else ''
    farmer_extent = getattr(latest_scan, 'farmer_leaf_extent', 'unknown')

    # Recent pest trap observations for this farm
    pest_count = 0
    try:
        from pests.models import PestObservation
        recent_pests = PestObservation.objects.filter(farm=farm).order_by('-observed_at')[:3]
        pest_count = sum(p.pest_count for p in recent_pests)
    except Exception:
        pass

    # Local incidence around farm (10 km, past 30 days) with verified breakdown
    local_incidence = 0
    incidence_data = {'total': 0, 'verified': 0, 'unverified': 0, 'pest_alerts': 0}
    try:
        from hotspots.services import get_local_incidence_breakdown
        if farm.latitude and farm.longitude:
            incidence_data = get_local_incidence_breakdown(farm.latitude, farm.longitude, radius_km=10.0, days=30)
            local_incidence = incidence_data['total']
    except Exception:
        pass

    crop_stage = farm.crop_stage or 'vegetative'
    risk_result = calculate_risk(
        crop_stage=crop_stage,
        humidity=weather_data['humidity'],
        temperature=weather_data['temperature'],
        rainfall_prob=weather_data['rainfall_prob'],
        disease_confidence=confidence,
        disease_severity=severity,
        is_healthy=is_healthy,
        pest_count=pest_count,
        local_incidence_count=local_incidence,
        farmer_leaf_extent=farmer_extent,
        crop_name=farm.crop or '',
        crop_variety=farm.crop_variety or '',
        soil_moisture=soil_moisture,
        soil_ph=soil_ph,
        sensor_source=sensor_source,
    )

    forecast_data = generate_7day_forecast(
        base_crop_stage=crop_stage,
        disease_confidence=confidence,
        disease_severity=severity,
        is_healthy=is_healthy,
        pest_count=pest_count,
        local_incidence_count=local_incidence,
        daily_weather_forecast=daily_forecast,
        current_weather=weather_data,
    )

    # Safety Gate 2.1 & Review status check
    is_expert_confirmed = latest_scan.is_verified if latest_scan else False
    crop_mismatch = False
    unsupported_crop = False
    if farm.crop:
        fc = farm.crop.lower().strip()
        from disease.views import SUPPORTED_MODEL_CROPS
        if not any(sup in fc for sup in SUPPORTED_MODEL_CROPS):
            unsupported_crop = True
        elif latest_scan and latest_scan.crop_type:
            pred_c = latest_scan.crop_type.lower().strip()
            if fc not in pred_c and pred_c not in fc:
                crop_mismatch = True

    safety_gate_passed = is_healthy or (confidence >= 0.80 and not crop_mismatch and not unsupported_crop)
    ipm = get_ipm_guidance(
        disease_name=disease_name,
        risk_level=risk_result['level'],
        safety_gate_passed=safety_gate_passed,
        is_expert_confirmed=is_expert_confirmed,
        crop_mismatch=crop_mismatch,
        unsupported_crop=unsupported_crop,
    )

    # Persist Actionable Alert rows when level >= high or pest threshold exceeded (de-duplicated per day)
    try:
        from alerts.models import Alert
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if risk_result['level'] in ['high', 'critical']:
            already_alerted = Alert.objects.filter(
                recipient=farm.user,
                alert_type='high_risk_forecast',
                created_at__gte=today_start,
                message__contains=farm.farm_name
            ).exists()
            if not already_alerted:
                Alert.objects.create(
                    recipient=farm.user,
                    alert_type='high_risk_forecast',
                    related_scan=latest_scan,
                    message=f"Risk Alert: {farm.farm_name} is forecast at {risk_result['level_display']} risk ({risk_result['score']}/100). {risk_result['summary']}"
                )
        if pest_count >= 50:
            already_pest_alerted = Alert.objects.filter(
                recipient=farm.user,
                alert_type='pest_threshold_exceeded',
                created_at__gte=today_start,
                message__contains=farm.farm_name
            ).exists()
            if not already_pest_alerted:
                Alert.objects.create(
                    recipient=farm.user,
                    alert_type='pest_threshold_exceeded',
                    related_scan=latest_scan,
                    message=f"Pest Warning: {farm.farm_name} has high pest pressure ({pest_count} pests observed in scouting)."
                )
    except Exception as e:
        pass

    # Save assessment record
    assessment = RiskAssessment.objects.create(
        farm=farm,
        scan=latest_scan,
        crop_name=farm.crop or 'Crop',
        crop_stage=crop_stage,
        risk_score=risk_result['score'],
        risk_level=risk_result['level'],
        breakdown=risk_result['breakdown'],
        ipm_actions=ipm,
        forecast=forecast_data,
    )

    return Response({
        'id': assessment.id,
        'farm_id': farm.id,
        'farm_name': farm.farm_name,
        'crop': farm.crop,
        'crop_variety': farm.crop_variety,
        'crop_stage': crop_stage,
        'weather': weather_data,
        'sensor_source': sensor_source,
        'incidence_breakdown': incidence_data,
        **risk_result,
        'forecast': forecast_data,
        'ipm_actions': ipm,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_assessments_view(request):
    """List recent risk assessments, scoped to user for farmers."""
    user = request.user
    if getattr(user, 'role', 'farmer') == 'farmer':
        assessments = RiskAssessment.objects.filter(farm__user=user).order_by('-created_at')[:30]
    else:
        assessments = RiskAssessment.objects.all().order_by('-created_at')[:30]
    serializer = RiskAssessmentSerializer(assessments, many=True)
    return Response(serializer.data)
