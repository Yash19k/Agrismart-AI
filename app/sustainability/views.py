"""
Sustainability API Views — GET /api/sustainability/
"""
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm, SustainabilityRecord
from disease.models import DiseaseScan
from weather.services import WeatherService, WeatherServiceError
from .services import get_sustainability_assessment

logger = logging.getLogger('sustainability')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sustainability_view(request):
    """
    GET /api/sustainability/?farm_id=<id>&plant=<plant_name>
    Authoritative sustainability score endpoint.
    Deterministic, reproducible calculation using Farm Profile + live weather + disease scan history.
    """
    farm_id = request.query_params.get('farm_id')
    if farm_id:
        farm = Farm.objects.filter(id=farm_id, user=request.user).first()
    else:
        farm = Farm.objects.filter(user=request.user).first()

    if not farm:
        return Response(
            {'detail': 'No farm found. Please add a farm in My Farm first.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # 1. Live Weather Data (Open-Meteo provides soil moisture & ET₀)
    weather_data = None
    try:
        weather_data = WeatherService.fetch_farm_weather(farm, provider='open-meteo')
    except (WeatherServiceError, Exception) as err:
        logger.warning(f"Could not fetch weather for farm {farm.id}: {err}")
        weather_data = None

    # 2. Existing Disease Scan History
    # Try scans linked to this farm; fallback to all user scans if unassigned
    scans_qs = DiseaseScan.objects.filter(farm=farm)
    if not scans_qs.exists():
        scans_qs = DiseaseScan.objects.filter(user=request.user)

    ordered_scans = list(scans_qs.order_by('-created_at'))

    # Extract unique plant names from scan history (newest to oldest)
    available_plants = []
    seen = set()
    latest_scanned_plant = None

    for s in ordered_scans:
        p = (s.plant_name or s.crop_type or '').strip()
        if not p and s.predicted_class:
            p = s.predicted_class.split('___')[0].replace('_', ' ').strip()
        if p:
            if latest_scanned_plant is None:
                latest_scanned_plant = p
            if p.lower() not in seen:
                seen.add(p.lower())
                available_plants.append(p)

    # If farm has a primary crop, ensure it is available as well
    if farm.crop and farm.crop.strip():
        fc = farm.crop.strip()
        if fc.lower() not in seen:
            seen.add(fc.lower())
            available_plants.append(fc)

    # Determine selected plant:
    # Priority: Explicit query param -> Latest scanned plant -> Farm primary crop -> First available plant -> None
    req_plant = request.query_params.get('plant') or request.query_params.get('plant_name')
    if req_plant and req_plant.strip():
        selected_plant = req_plant.strip()
    elif latest_scanned_plant:
        selected_plant = latest_scanned_plant
    elif farm.crop and farm.crop.strip():
        selected_plant = farm.crop.strip()
    elif available_plants:
        selected_plant = available_plants[0]
    else:
        selected_plant = None

    scan_list = [
        {
            'is_healthy': s.is_healthy,
            'plant_name': s.plant_name or s.crop_type,
            'predicted_class': s.predicted_class,
        }
        for s in ordered_scans
    ]

    # 3. Deterministic Assessment Pipeline respecting selected plant
    assessment = get_sustainability_assessment(
        farm=farm,
        weather_data=weather_data,
        disease_scans=scan_list,
        selected_plant=selected_plant,
    )

    assessment['selected_plant'] = selected_plant
    assessment['available_plants'] = available_plants
    assessment['latest_scanned_plant'] = latest_scanned_plant

    # Attach farm profile metadata for frontend rendering
    assessment['farm'] = {
        'id':               farm.id,
        'farm_name':        farm.farm_name,
        'location_display': farm.location_display,
        'crop':             farm.crop,
        'irrigation_type':  farm.irrigation_type,
        'soil_type':        farm.soil_type,
        'farm_size':        farm.farm_size,
    }

    # Record historical snapshot if score was calculated
    if assessment.get('overall_score') is not None:
        try:
            SustainabilityRecord.objects.create(
                farm=farm,
                score=assessment['overall_score'],
                water_efficiency=assessment['components'].get('water') or 0.0,
                soil_health=assessment['components'].get('soil') or 0.0,
                crop_health=assessment['components'].get('crop_health') or 0.0,
                resource_efficiency=assessment['components'].get('resources') or 0.0,
            )
        except Exception as e:
            logger.warning(f"Could not save SustainabilityRecord: {e}")

    return Response(assessment, status=status.HTTP_200_OK)
