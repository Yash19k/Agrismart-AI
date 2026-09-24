from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from django.utils import timezone
from datetime import timedelta

from farms.models import Farm
from .models import PestObservation, PEST_THRESHOLDS
from .serializers import PestObservationSerializer


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def pest_observation_list_create_view(request):
    """
    GET: List pest observations with optional farm_id filter.
    POST: Record a new pest trap observation with count & image.
    """
    if request.method == 'GET':
        qs = PestObservation.objects.all()
        farm_id = request.query_params.get('farm_id')
        pest_type = request.query_params.get('pest_type')
        threshold = request.query_params.get('threshold_level')

        if farm_id:
            qs = qs.filter(farm_id=farm_id)
        if pest_type:
            qs = qs.filter(pest_type__iexact=pest_type)
        if threshold:
            qs = qs.filter(threshold_level=threshold)

        serializer = PestObservationSerializer(qs[:50], many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = PestObservationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            observation = serializer.save()
            return Response(PestObservationSerializer(observation).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def pest_summary_view(request, farm_id=None):
    """
    GET /api/pests/summary/ or /api/pests/summary/<farm_id>/
    Returns aggregated pest pressure metrics and breakdown by species.
    """
    qs = PestObservation.objects.all()
    if farm_id:
        qs = qs.filter(farm_id=farm_id)

    total_records = qs.count()
    total_insects = qs.aggregate(Sum('pest_count'))['pest_count__sum'] or 0

    action_needed = qs.filter(threshold_level='action_required').count()
    alert_count = qs.filter(threshold_level='alert').count()
    normal_count = qs.filter(threshold_level='normal').count()

    # Species breakdown
    species_breakdown = list(
        qs.values('pest_type')
        .annotate(total_count=Sum('pest_count'), records=Count('id'))
        .order_by('-total_count')
    )

    # Recent 7 days trend
    since_date = timezone.now() - timedelta(days=7)
    recent_qs = qs.filter(observed_at__gte=since_date)
    recent_total = recent_qs.aggregate(Sum('pest_count'))['pest_count__sum'] or 0

    return Response({
        'total_observations': total_records,
        'total_pests_counted': total_insects,
        'action_required_count': action_needed,
        'alert_count': alert_count,
        'normal_count': normal_count,
        'species_breakdown': species_breakdown,
        'last_7_days_total': recent_total,
        'threshold_reference': PEST_THRESHOLDS,
    })


@api_view(['DELETE'])
@permission_classes([AllowAny])
def pest_observation_delete_view(request, pk):
    """Delete a pest trap observation."""
    obs = PestObservation.objects.filter(pk=pk).first()
    if not obs:
        return Response({'detail': 'Observation not found.'}, status=status.HTTP_404_NOT_FOUND)
    obs.delete()
    return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)
