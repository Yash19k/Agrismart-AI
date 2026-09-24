from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm
from .models import SensorReading
from .serializers import SensorReadingSerializer


class SensorReadingListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/sensors/readings/?farm_id=<id>
    POST /api/sensors/readings/
    Enforces authentication and farm ownership.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SensorReadingSerializer

    def get_queryset(self):
        user = self.request.user
        farm_id = self.request.query_params.get('farm_id')

        if getattr(user, 'role', 'farmer') == 'farmer':
            qs = SensorReading.objects.filter(farm__user=user)
        else:
            qs = SensorReading.objects.all()

        if farm_id:
            qs = qs.filter(farm_id=farm_id)
        return qs.order_by('-recorded_at')

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        farm = serializer.validated_data['farm']
        if getattr(user, 'role', 'farmer') == 'farmer' and farm.user != user:
            raise PermissionDenied("You do not own this farm parcel.")
        serializer.save()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def latest_sensor_reading_view(request):
    """
    GET /api/sensors/latest/?farm_id=<id>
    Returns the most recent sensor reading for a farm.
    """
    farm_id = request.query_params.get('farm_id')
    user = request.user

    if not farm_id:
        # Default to user's first farm if available
        farm = Farm.objects.filter(user=user).first()
    else:
        if getattr(user, 'role', 'farmer') == 'farmer':
            farm = Farm.objects.filter(id=farm_id, user=user).first()
        else:
            farm = Farm.objects.filter(id=farm_id).first()

    if not farm:
        return Response(
            {'detail': 'Farm not found or you do not have permission to view it.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    latest = SensorReading.objects.filter(farm=farm).order_by('-recorded_at').first()
    if not latest:
        return Response({
            'detail': 'No sensor readings recorded for this farm yet.',
            'has_reading': False,
            'farm_id': farm.id,
            'farm_name': farm.farm_name,
        }, status=status.HTTP_200_OK)

    ser = SensorReadingSerializer(latest)
    return Response({
        **ser.data,
        'has_reading': True,
        'label': 'Simulated sensor data' if latest.source == 'simulated' else 'Manual entry',
    }, status=status.HTTP_200_OK)
