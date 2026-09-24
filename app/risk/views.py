from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
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
@permission_classes([AllowAny])
def calculate_risk_view(request):
    """
    POST /api/risk/calculate/
    Computes deterministic multi-factor risk, 7-day forecast, and IPM advice.
    """
    serializer = RiskCalculationInputSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    farm_id = data.get('farm_id')
    farm = Farm.objects.filter(id=farm_id).first() if farm_id else None

    # Compute risk
    risk_result = calculate_risk(
        crop_stage=data.get('crop_stage', getattr(farm, 'crop_stage', 'vegetative')),
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
        base_crop_stage=data.get('crop_stage', getattr(farm, 'crop_stage', 'vegetative')),
        disease_confidence=data['disease_confidence'],
        disease_severity=data['disease_severity'],
        is_healthy=data['is_healthy'],
        pest_count=data['pest_count'],
        local_incidence_count=data['local_incidence_count'],
        current_weather=current_weather,
    )

    # IPM Advice
    ipm_guidance = get_ipm_guidance(
        disease_name=data.get('disease_name', ''),
        risk_level=risk_result['level']
    )

    return Response({
        **risk_result,
        'forecast': forecast_data,
        'ipm_actions': ipm_guidance,
        'crop_stage': data.get('crop_stage', getattr(farm, 'crop_stage', 'vegetative')),
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def farm_risk_view(request, farm_id):
    """
    GET /api/risk/farm/<farm_id>/
    Computes full risk profile for a specific farm using its stage, latest scan,
    current weather, and local incidence.
    """
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

    # Latest disease scan for this farm
    latest_scan = DiseaseScan.objects.filter(farm=farm).order_by('-created_at').first()
    is_healthy = latest_scan.is_healthy if latest_scan else True
    confidence = latest_scan.confidence if (latest_scan and not is_healthy) else 0.0
    severity = latest_scan.severity if (latest_scan and not is_healthy) else 'none'
    disease_name = latest_scan.disease_name if latest_scan else ''

    # Recent pest trap observations for this farm
    pest_count = 0
    try:
        from pests.models import PestObservation
        recent_pests = PestObservation.objects.filter(farm=farm).order_by('-observed_at')[:3]
        pest_count = sum(p.pest_count for p in recent_pests)
    except Exception:
        pass

    # Local incidence around farm (10 km)
    local_incidence = 0
    try:
        from hotspots.services import get_local_incidence
        local_incidence = get_local_incidence(farm.latitude, farm.longitude, radius_km=10.0)
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

    ipm = get_ipm_guidance(disease_name=disease_name, risk_level=risk_result['level'])

    # Log/Save assessment
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
        'crop_stage': crop_stage,
        'weather': weather_data,
        **risk_result,
        'forecast': forecast_data,
        'ipm_actions': ipm,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def list_assessments_view(request):
    """List recent risk assessments."""
    assessments = RiskAssessment.objects.all().order_by('-created_at')[:30]
    serializer = RiskAssessmentSerializer(assessments, many=True)
    return Response(serializer.data)
