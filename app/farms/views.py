from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Farm, Crop, Activity
from .serializers import FarmSerializer


class FarmListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FarmSerializer

    def get_queryset(self):
        return Farm.objects.filter(user=self.request.user).prefetch_related('crops')

    def perform_create(self, serializer):
        farm = serializer.save(user=self.request.user)
        if farm.crop:
            Crop.objects.get_or_create(farm=farm, name=farm.crop.strip(), defaults={'status': 'active'})
        Activity.objects.create(
            farm=farm,
            icon='🏡',
            title=f"{farm.farm_name} registered",
            sub=farm.location_display,
            activity_type='farm'
        )


class FarmDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FarmSerializer

    def get_queryset(self):
        return Farm.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def primary_farm(request):
    """Return the user's first (primary) farm."""
    farm = Farm.objects.filter(user=request.user).prefetch_related('crops').first()
    if not farm:
        return Response(
            {'detail': 'No farm found. Please add your farm first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    serializer = FarmSerializer(farm, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_weather_view(request, pk=None):
    """
    GET /api/farms/{farm_id}/weather/ or GET /api/farms/weather/?farm_id=<id>
    Fetches live weather from Open-Meteo for the authenticated user's farm.
    """
    farm_id = pk or request.query_params.get('farm_id')
    if farm_id:
        farm = Farm.objects.filter(id=farm_id, user=request.user).first()
        if not farm:
            return Response(
                {'detail': 'Farm not found or does not belong to you.'},
                status=status.HTTP_404_NOT_FOUND
            )
    else:
        farm = Farm.objects.filter(user=request.user).first()
        if not farm:
            return Response(
                {'detail': 'No farm found for your account. Please create a farm first.'},
                status=status.HTTP_404_NOT_FOUND
            )

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': f'Farm "{farm.farm_name}" has no latitude and longitude coordinates saved.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
    except (ValueError, TypeError):
        return Response(
            {'detail': f'Farm "{farm.farm_name}" has invalid coordinates ({farm.latitude}, {farm.longitude}).'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return Response(
            {'detail': f'Farm coordinates ({lat}, {lon}) are out of range (-90 to 90 lat, -180 to 180 lon).'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from weather.services import WeatherService, WeatherServiceError
        data = WeatherService.fetch_farm_weather(farm, provider='open-meteo')
        return Response(data, status=status.HTTP_200_OK)
    except WeatherServiceError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {'detail': f'Unexpected error fetching weather: {str(e)}'},
            status=status.HTTP_502_BAD_GATEWAY
        )


def _get_authenticated_farm(request, farm_id=None):
    """
    Helper to authenticate and retrieve a farm belonging to request.user.
    Returns (farm, error_response).
    """
    target_id = farm_id or request.query_params.get('farm_id')
    if target_id:
        farm = Farm.objects.filter(id=target_id).first()
        if not farm:
            return None, Response(
                {'detail': 'No farm found. Please create a farm first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        if farm.user != request.user:
            return None, Response(
                {'detail': 'You do not have permission to access thermal data for this farm.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return farm, None
    else:
        farm = Farm.objects.filter(user=request.user).first()
        if not farm:
            return None, Response(
                {'detail': 'No farm found. Please create a farm first.'},
                status=status.HTTP_404_NOT_FOUND
            )
        return farm, None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_thermal_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/thermal/
    Returns the latest available NASA ECOSTRESS LST observation for the authenticated user's farm.
    Checks existing stored observation first to avoid unnecessary repeated downloads.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return Response(
                {'detail': 'Farm location is unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Avoid unnecessary repeated downloads: check if observation is already stored
    latest_obs = farm.thermal_observations.first()
    if latest_obs:
        from .serializers import ThermalObservationSerializer
        serializer = ThermalObservationSerializer(latest_obs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 2. If not stored, attempt to fetch the latest observation
    try:
        from .ecostress_service import (
            ECOSTRESSService, FarmLocationUnavailableError,
            ECOSTRESSNotFoundError, ECOSTRESSDataUnavailableError,
            ECOSTRESSNoValidPixelsError
        )
        from .serializers import ThermalObservationSerializer

        obs = ECOSTRESSService.fetch_latest_observation(farm, force_download=False)
        serializer = ThermalObservationSerializer(obs)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except FarmLocationUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ECOSTRESSNotFoundError as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except ECOSTRESSNoValidPixelsError as e:
        return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except ECOSTRESSDataUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'detail': 'Unable to retrieve ECOSTRESS data right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def farm_thermal_fetch_view(request, farm_id=None, pk=None):
    """
    POST /api/farms/{farm_id}/thermal/fetch/
    Checks NASA CMR for the latest ECOSTRESS observation, downloads and processes
    the raster if new, saves the ThermalObservation, and returns the processed thermal information.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return Response(
                {'detail': 'Farm location is unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from .ecostress_service import (
            ECOSTRESSService, FarmLocationUnavailableError,
            ECOSTRESSNotFoundError, ECOSTRESSDataUnavailableError,
            ECOSTRESSNoValidPixelsError
        )
        from .serializers import ThermalObservationSerializer

        obs = ECOSTRESSService.fetch_latest_observation(farm, force_download=False)
        serializer = ThermalObservationSerializer(obs)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except FarmLocationUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ECOSTRESSNotFoundError as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except ECOSTRESSNoValidPixelsError as e:
        return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except ECOSTRESSDataUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'detail': 'Unable to retrieve ECOSTRESS data right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_et_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/et/
    Returns the latest available NASA ECOSTRESS Evapotranspiration (ET) observation for the authenticated user's farm.
    Checks existing stored observation first to avoid unnecessary repeated downloads.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return Response(
                {'detail': 'Farm location is unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Avoid repeated downloads: return stored result if exists
    latest_obs = farm.et_observations.first()
    if latest_obs:
        from .serializers import ETObservationSerializer
        serializer = ETObservationSerializer(latest_obs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 2. Fetch new observation
    try:
        from .ecostress_service import (
            ECOSTRESSETService, FarmLocationUnavailableError,
            ECOSTRESSNotFoundError, ECOSTRESSDataUnavailableError,
            ECOSTRESSNoValidPixelsError
        )
        from .serializers import ETObservationSerializer

        obs = ECOSTRESSETService.fetch_latest_observation(farm, force_download=False)
        serializer = ETObservationSerializer(obs)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except FarmLocationUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ECOSTRESSNotFoundError as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except ECOSTRESSNoValidPixelsError as e:
        return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except ECOSTRESSDataUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'detail': 'Unable to retrieve ECOSTRESS data right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def farm_et_fetch_view(request, farm_id=None, pk=None):
    """
    POST /api/farms/{farm_id}/et/fetch/
    Checks NASA CMR for the latest ECOSTRESS ET observation, processes pixels if new,
    stores ETObservation, and returns the farm-level ET statistics.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return Response(
                {'detail': 'Farm location is unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from .ecostress_service import (
            ECOSTRESSETService, FarmLocationUnavailableError,
            ECOSTRESSNotFoundError, ECOSTRESSDataUnavailableError,
            ECOSTRESSNoValidPixelsError
        )
        from .serializers import ETObservationSerializer

        force = request.data.get('force', False) if isinstance(request.data, dict) else False
        obs = ECOSTRESSETService.fetch_latest_observation(farm, force_download=force)
        serializer = ETObservationSerializer(obs)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except FarmLocationUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ECOSTRESSNotFoundError as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except ECOSTRESSNoValidPixelsError as e:
        return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except ECOSTRESSDataUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'detail': 'Unable to retrieve ECOSTRESS data right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_esi_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/esi/
    Returns the latest ECOSTRESS Evaporative Stress Index (ESI) observation for the farm.
    Checks PostgreSQL first; if none exists, fetches from NASA ECOSTRESS (ECO_L4T_ESI).
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return Response(
                {'detail': 'Farm location is unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # 1. Check database for existing latest observation
    latest_obs = farm.esi_observations.first()
    if latest_obs:
        from .serializers import ESIObservationSerializer
        serializer = ESIObservationSerializer(latest_obs)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 2. Fetch new observation
    try:
        from .ecostress_service import (
            ECOSTRESSESIService, FarmLocationUnavailableError,
            ECOSTRESSNotFoundError, ECOSTRESSDataUnavailableError,
            ECOSTRESSNoValidPixelsError
        )
        from .serializers import ESIObservationSerializer

        obs = ECOSTRESSESIService.fetch_latest_observation(farm, force_download=False)
        serializer = ESIObservationSerializer(obs)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except FarmLocationUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ECOSTRESSNotFoundError as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except ECOSTRESSNoValidPixelsError as e:
        return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except ECOSTRESSDataUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'detail': 'Unable to retrieve ECOSTRESS data right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def farm_esi_fetch_view(request, farm_id=None, pk=None):
    """
    POST /api/farms/{farm_id}/esi/fetch/
    Checks NASA CMR for the latest ECOSTRESS ESI observation, processes pixels if new,
    stores ESIObservation, and returns the farm-level ESI statistics.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    if farm.latitude is None or farm.longitude is None:
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        lat = float(farm.latitude)
        lon = float(farm.longitude)
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return Response(
                {'detail': 'Farm location is unavailable.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {'detail': 'Farm location is unavailable.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from .ecostress_service import (
            ECOSTRESSESIService, FarmLocationUnavailableError,
            ECOSTRESSNotFoundError, ECOSTRESSDataUnavailableError,
            ECOSTRESSNoValidPixelsError
        )
        from .serializers import ESIObservationSerializer

        force = request.data.get('force', False) if isinstance(request.data, dict) else False
        obs = ECOSTRESSESIService.fetch_latest_observation(farm, force_download=force)
        serializer = ESIObservationSerializer(obs)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except FarmLocationUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except ECOSTRESSNotFoundError as e:
        return Response({'detail': str(e)}, status=status.HTTP_404_NOT_FOUND)
    except ECOSTRESSNoValidPixelsError as e:
        return Response({'detail': str(e)}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    except ECOSTRESSDataUnavailableError as e:
        return Response({'detail': str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response(
            {'detail': 'Unable to retrieve ECOSTRESS data right now. Please try again later.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_environment_history_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/environment/history/
    Returns historical observations belonging exclusively to the specified farm.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    from .serializers import (
        ThermalObservationSerializer, ETObservationSerializer,
        ESIObservationSerializer, WeatherObservationSerializer
    )
    from .environmental_risk_engine import calculate_farm_baselines

    lst_obs = farm.thermal_observations.all().order_by('observation_datetime')
    et_obs = farm.et_observations.all().order_by('observation_datetime')
    esi_obs = farm.esi_observations.all().order_by('observation_datetime')
    weather_obs = farm.weather_observations.all().order_by('observation_datetime')[:100]

    baselines = calculate_farm_baselines(farm)

    return Response({
        'farm_id': farm.id,
        'farm_name': farm.farm_name,
        'lst_history': ThermalObservationSerializer(lst_obs, many=True).data,
        'et_history': ETObservationSerializer(et_obs, many=True).data,
        'esi_history': ESIObservationSerializer(esi_obs, many=True).data,
        'weather_history': WeatherObservationSerializer(weather_obs, many=True).data,
        'baselines': baselines,
        'counts': {
            'lst': lst_obs.count(),
            'et': et_obs.count(),
            'esi': esi_obs.count(),
            'weather': farm.weather_observations.count(),
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_environment_latest_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/environment/latest/
    Returns the latest observations for LST, ET, ESI, and Weather.
    Preserves distinct observation timestamps. If unavailable, returns available: false.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    from .serializers import (
        ThermalObservationSerializer, ETObservationSerializer,
        ESIObservationSerializer, WeatherObservationSerializer
    )

    latest_lst = farm.thermal_observations.order_by('-observation_datetime').first()
    latest_et = farm.et_observations.order_by('-observation_datetime').first()
    latest_esi = farm.esi_observations.order_by('-observation_datetime').first()
    latest_weather = farm.weather_observations.order_by('-observation_datetime').first()

    return Response({
        'farm_id': farm.id,
        'farm_name': farm.farm_name,
        'lst': {
            'available': latest_lst is not None,
            'data': ThermalObservationSerializer(latest_lst).data if latest_lst else None,
            'observed_at': latest_lst.observation_datetime.isoformat() if latest_lst else None,
        },
        'et': {
            'available': latest_et is not None,
            'data': ETObservationSerializer(latest_et).data if latest_et else None,
            'observed_at': latest_et.observation_datetime.isoformat() if latest_et else None,
        },
        'esi': {
            'available': latest_esi is not None,
            'data': ESIObservationSerializer(latest_esi).data if latest_esi else None,
            'observed_at': latest_esi.observation_datetime.isoformat() if latest_esi else None,
        },
        'weather': {
            'available': latest_weather is not None,
            'data': WeatherObservationSerializer(latest_weather).data if latest_weather else None,
            'observed_at': latest_weather.observation_datetime.isoformat() if latest_weather else None,
        },
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_environment_risk_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/environment/risk/ or GET /api/farms/{farm_id}/risk/
    Returns the deterministic rule-based environmental assessment for the farm.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    from .environmental_risk_engine import get_or_create_environmental_assessment
    from .serializers import EnvironmentalRiskAssessmentSerializer

    force_reassess = request.query_params.get('refresh', '').lower() in ('true', '1')
    assessment = get_or_create_environmental_assessment(farm, force_reassess=force_reassess)
    serializer = EnvironmentalRiskAssessmentSerializer(assessment)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def farm_environment_risk_history_view(request, farm_id=None, pk=None):
    """
    GET /api/farms/{farm_id}/environment/risk/history/ or GET /api/farms/{farm_id}/risk/history/
    Returns the historical risk assessments for the farm.
    """
    f_id = farm_id or pk
    farm, err_resp = _get_authenticated_farm(request, f_id)
    if err_resp:
        return err_resp

    from .serializers import EnvironmentalRiskAssessmentSerializer

    assessments = farm.environmental_risk_assessments.all().order_by('-assessment_datetime')[:50]
    serializer = EnvironmentalRiskAssessmentSerializer(assessments, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)



