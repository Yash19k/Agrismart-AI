from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from farms.models import Farm
from .services import WeatherService, WeatherServiceError


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weather_view(request):
    """GET /api/weather/?farm_id=<id>  — current + hourly + daily weather for a farm."""
    farm_id = request.query_params.get('farm_id')
    farm = (
        Farm.objects.filter(id=farm_id, user=request.user).first()
        if farm_id
        else Farm.objects.filter(user=request.user).first()
    )
    if not farm:
        return Response(
            {'detail': 'No farm found. Please add your farm first.'}, status=404
        )
    try:
        requested_provider = request.query_params.get('provider')
        provider = requested_provider if requested_provider in {'open-meteo', 'weatherapi'} else None
        data = WeatherService.fetch_farm_weather(farm, provider=provider)
        return Response(data)
    except WeatherServiceError as e:
        return Response({'error': str(e), 'detail': 'Weather data temporarily unavailable.'}, status=503)


@api_view(['GET'])
@permission_classes([AllowAny])
def location_search(request):
    """GET /api/weather/location/search/?q=<city> — geocoding proxy."""
    q = request.query_params.get('q', '').strip()
    if not q:
        return Response({'results': []})
    try:
        results = WeatherService.search_location(q)
        return Response({'results': results})
    except Exception as e:
        return Response({'error': str(e), 'results': []}, status=503)
