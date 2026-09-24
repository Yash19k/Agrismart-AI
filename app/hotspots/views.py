from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from farms.models import Farm
from disease.models import DiseaseScan
from pests.models import PestObservation
from .services import cluster_hotspots, get_local_incidence


@api_view(['GET'])
@permission_classes([AllowAny])
def hotspots_map_view(request):
    """
    GET /api/hotspots/map/
    Returns cluster zones and individual geotagged incident points for Leaflet map.
    """
    days = int(request.query_params.get('days', 30))
    radius_km = float(request.query_params.get('radius', 25.0))

    clusters = cluster_hotspots(days=days, cluster_radius_km=radius_km)

    # All active farms with their coordinates and latest status
    farms_data = []
    for f in Farm.objects.all():
        latest_scan = DiseaseScan.objects.filter(farm=f).order_by('-created_at').first()
        latest_pest = PestObservation.objects.filter(farm=f).order_by('-observed_at').first()

        status = 'healthy'
        disease_info = 'Healthy Foliage'
        if latest_scan and not latest_scan.is_healthy:
            status = 'diseased'
            disease_info = f"{latest_scan.disease_name} ({latest_scan.severity})"

        pest_info = 'Normal'
        if latest_pest and latest_pest.threshold_level in ['alert', 'action_required']:
            pest_info = f"{latest_pest.pest_type}: {latest_pest.pest_count}"
            if status != 'diseased':
                status = 'pest_alert'

        farms_data.append({
            'id': f.id,
            'name': f.farm_name,
            'location_name': f.location_name or 'Gujarat',
            'latitude': f.latitude,
            'longitude': f.longitude,
            'crop': f.crop,
            'crop_stage': f.crop_stage,
            'farm_size': f.farm_size,
            'status': status,
            'disease_info': disease_info,
            'pest_info': pest_info,
        })

    return Response({
        'clusters': clusters,
        'farms': farms_data,
        'center_default': {'lat': 22.5645, 'lng': 72.9289, 'zoom': 8}, # Anand / Central Gujarat
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def hotspots_regional_summary_view(request):
    """
    GET /api/hotspots/regional-summary/
    Aggregates surveillance metrics across all farms for agricultural officers.
    """
    clusters = cluster_hotspots(days=30)
    farms = Farm.objects.all()

    total_farms = farms.count()
    total_acreage = sum(f.farm_size or 2.5 for f in farms)

    critical_clusters = [c for c in clusters if c['severity'] == 'critical']
    high_clusters = [c for c in clusters if c['severity'] == 'high']

    # Identify most impacted crop
    crop_counts = {}
    for c in clusters:
        for crop in c.get('affected_crops', []):
            crop_counts[crop] = crop_counts.get(crop, 0) + c['incident_count']
    top_threatened_crop = max(crop_counts.items(), key=lambda x: x[1])[0] if crop_counts else 'None'

    # Diseases identified in last 30 days
    recent_diseases = list(
        DiseaseScan.objects.filter(is_healthy=False)
        .values_list('disease_name', flat=True)
    )
    disease_counts = {}
    for d in recent_diseases:
        if d:
            disease_counts[d] = disease_counts.get(d, 0) + 1
    top_disease = max(disease_counts.items(), key=lambda x: x[1])[0] if disease_counts else 'None'

    # Pest pressure
    recent_pests = list(
        PestObservation.objects.filter(threshold_level__in=['alert', 'action_required'])
        .values_list('pest_type', flat=True)
    )
    pest_counts = {}
    for p in recent_pests:
        if p:
            pest_counts[p] = pest_counts.get(p, 0) + 1
    top_pest = max(pest_counts.items(), key=lambda x: x[1])[0] if pest_counts else 'None'

    return Response({
        'total_farms_monitored': total_farms,
        'total_acreage_monitored': round(total_acreage, 1),
        'active_hotspot_clusters': len(clusters),
        'critical_clusters_count': len(critical_clusters),
        'high_clusters_count': len(high_clusters),
        'top_threatened_crop': top_threatened_crop,
        'top_dominant_disease': top_disease,
        'top_pest_vector': top_pest,
        'clusters_summary': [
            {
                'id': c['id'],
                'zone_name': c['zone_name'],
                'severity': c['severity'],
                'incident_count': c['incident_count'],
                'affected_crops': c['affected_crops'],
                'threats': c['primary_threats']
            }
            for c in clusters
        ]
    })
