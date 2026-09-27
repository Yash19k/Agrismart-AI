from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from farms.models import Farm
from .services import WeatherService, WeatherServiceError
from .engine.weather_service import (
    get_context,
    validate_location,
    get_irrigation_weather_context,
    get_context_for_crop_recommendation,
)
from .engine.intelligence import analyze
from .engine.provider import get_provider_name
from .engine import config


# =====================================================================
# Dashboard & Legacy Compatibility Views
# =====================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weather_view(request):
    """GET /api/weather/?farm_id=<id> — current + hourly + daily Open-Meteo weather for a farm."""
    farm_id = request.query_params.get('farm_id')
    if farm_id:
        farm = Farm.objects.filter(id=farm_id, user=request.user).first()
        if not farm:
            return Response(
                {'detail': 'Farm not found or does not belong to you.'},
                status=status.HTTP_404_NOT_FOUND,
            )
    else:
        farm = Farm.objects.filter(user=request.user).first()

    if not farm:
        return Response(
            {'detail': 'No farm found for your account. Please create a farm first.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': f'Farm "{farm.farm_name}" has no latitude and longitude coordinates saved.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
    except (ValueError, TypeError):
        return Response(
            {'detail': f'Farm "{farm.farm_name}" has invalid coordinates ({farm.latitude}, {farm.longitude}).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return Response(
            {'detail': f'Farm coordinates ({lat}, {lon}) are out of range (-90 to 90 lat, -180 to 180 lon).'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    requested_provider = request.query_params.get('provider', 'open-meteo')
    provider = requested_provider if requested_provider in {'open-meteo', 'weatherapi'} else 'open-meteo'

    try:
        data = WeatherService.fetch_farm_weather(farm, provider=provider)
        return Response(data, status=status.HTTP_200_OK)
    except WeatherServiceError as e:
        return Response(
            {'error': str(e), 'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception as e:
        return Response(
            {'error': str(e), 'detail': f'Unexpected error fetching weather: {str(e)}'},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def location_search(request):
    """GET /api/weather/location/search/?q=<city> — geocoding proxy."""
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': []})
    try:
        results = WeatherService.search_location(q)
        return Response({'results': results})
    except Exception as e:
        return Response({'error': str(e), 'results': []}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# =====================================================================
# Weather Intelligence Service (Module C — Converted from Flask to Django)
# =====================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """GET /api/weather/health/ — Service health check with active provider."""
    key = getattr(config, 'WEATHER_API_KEY', '') or ''
    key_configured = bool(key and str(key).strip())
    status_str = 'ok' if key_configured else 'degraded'
    code = status.HTTP_200_OK if key_configured else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response({
        'status': status_str,
        'provider': get_provider_name(),
        'api_key_configured': key_configured,
        'service': 'AgriSmart Weather Intelligence API (Django)',
    }, status=code)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weather_context_view(request):
    """
    GET /api/weather/context/?lat=23.0225&lon=72.5714
    Returns unified, normalized weather context for given location or farm_id.
    """
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')
    farm_id = request.query_params.get('farm_id')

    if farm_id:
        farm = Farm.objects.filter(id=farm_id).first()
        if farm:
            lat, lon = farm.latitude, farm.longitude

    if lat is None or lon is None:
        return Response({
            'error': 'Missing required query parameters: lat and lon.',
            'example': '/api/weather/context/?lat=23.0225&lon=72.5714'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    ctx = get_context(lat_f, lon_f)
    return Response(ctx.to_dict(), status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def weather_analyze_view(request):
    """
    POST /api/weather/analyze/
    Full weather intelligence analysis combining weather + farm context + optional irrigation ML prediction.
    """
    data = request.data
    if not isinstance(data, dict):
        return Response({'error': 'Request body must be a JSON object.'}, status=status.HTTP_400_BAD_REQUEST)

    lat = data.get('latitude')
    lon = data.get('longitude')
    farm_id = data.get('farm_id')

    if farm_id and (lat is None or lon is None):
        farm = Farm.objects.filter(id=farm_id).first()
        if farm:
            lat, lon = farm.latitude, farm.longitude

    if lat is None or lon is None:
        return Response({
            'error': 'Missing required fields: latitude and longitude.'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    farm_context = data.get('farm')
    irrigation_prediction = data.get('irrigation_prediction')

    weather = get_context(lat_f, lon_f)
    result = analyze(weather, farm_context, irrigation_prediction)
    return Response(result.to_dict(), status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def crop_context_view(request):
    """
    GET /api/weather/crop-context/?lat=23.0225&lon=72.5714
    Returns flat environmental context tailored for crop recommendation.
    """
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')

    if lat is None or lon is None:
        return Response({'error': 'Missing required query parameters: lat and lon.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    ctx = get_context_for_crop_recommendation(lat_f, lon_f)
    return Response(ctx, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def irrigation_context_view(request):
    """
    GET /api/weather/irrigation-context/?lat=23.0225&lon=72.5714
    Returns weather context in exact format Module B's recommendation engine expects:
    {rain_probability, forecast_rainfall_mm, forecast_temp, forecast_humidity}
    """
    lat = request.query_params.get('lat')
    lon = request.query_params.get('lon')

    if lat is None or lon is None:
        return Response({'error': 'Missing required query parameters: lat and lon.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        lat_f, lon_f = validate_location(lat, lon)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    ctx = get_irrigation_weather_context(lat_f, lon_f)
    if ctx is None:
        return Response({
            'weather_available': False,
            'message': 'Weather data could not be retrieved.'
        }, status=status.HTTP_200_OK)

    return Response(ctx, status=status.HTTP_200_OK)
