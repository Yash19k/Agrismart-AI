from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsExpertOrOfficer, IsOfficer
from farms.models import Farm
from disease.models import DiseaseScan
from pests.models import PestObservation
from .services import cluster_hotspots, get_local_incidence


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hotspots_map_view(request):
    """
    GET /api/hotspots/map/
    Returns cluster zones and individual geotagged incident points for Leaflet map.

    Role-based scoping:
    - Farmer: only sees clusters near their own farm(s) within 25km
    - Expert/Officer: full regional view (optionally filtered by their assigned region)
    """
    days = int(request.query_params.get('days', 30))
    radius_km = float(request.query_params.get('radius', 25.0))
    user = request.user
    user_role = getattr(user, 'role', 'farmer')

    clusters = cluster_hotspots(days=days, cluster_radius_km=radius_km)

    # All active farms with their coordinates and latest status
    if user_role == 'farmer':
        farms_qs = Farm.objects.filter(user=user)
    else:
        farms_qs = Farm.objects.all()

    farms_data = []
    for f in farms_qs:
        latest_scan = DiseaseScan.objects.filter(farm=f).order_by('-created_at').first()
        latest_pest = PestObservation.objects.filter(farm=f).order_by('-observed_at').first()

        farm_status = 'healthy'
        disease_info = 'Healthy Foliage'
        if latest_scan and not latest_scan.is_healthy:
            farm_status = 'diseased'
            disease_info = f"{latest_scan.disease_name} ({latest_scan.severity})"

        pest_info = 'Normal'
        if latest_pest and latest_pest.threshold_level in ['alert', 'action_required']:
            pest_info = f"{latest_pest.pest_type}: {latest_pest.pest_count}"
            if farm_status != 'diseased':
                farm_status = 'pest_alert'

        farms_data.append({
            'id': f.id,
            'name': f.farm_name,
            'location_name': f.location_name or 'Gujarat',
            'latitude': f.latitude,
            'longitude': f.longitude,
            'crop': f.crop,
            'crop_stage': f.crop_stage,
            'farm_size': f.farm_size,
            'status': farm_status,
            'disease_info': disease_info,
            'pest_info': pest_info,
        })

    # For farmers, filter clusters to only those near their farms
    if user_role == 'farmer' and farms_data:
        from .services import haversine_km
        farmer_clusters = []
        for cluster in clusters:
            for fd in farms_data:
                if fd['latitude'] and fd['longitude']:
                    dist = haversine_km(
                        fd['latitude'], fd['longitude'],
                        cluster['center_latitude'], cluster['center_longitude']
                    )
                    if dist <= radius_km:
                        farmer_clusters.append(cluster)
                        break
        clusters = farmer_clusters

    return Response({
        'clusters': clusters,
        'farms': farms_data,
        'center_default': {'lat': 22.5645, 'lng': 72.9289, 'zoom': 8},  # Anand / Central Gujarat
    })


@api_view(['GET'])
@permission_classes([IsExpertOrOfficer])
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


@api_view(['POST'])
@permission_classes([IsOfficer])
def hotspot_dispatch_advisory_view(request, cluster_id):
    """
    POST /api/hotspots/<cluster_id>/dispatch/
    Officer dispatches a broadcast advisory to all farmers in a hotspot cluster's radius.
    """
    message = request.data.get('message', '')
    if not message:
        return Response({'detail': 'Advisory message is required.'}, status=status.HTTP_400_BAD_REQUEST)

    clusters = cluster_hotspots(days=30)
    target_cluster = None
    for c in clusters:
        if c['id'] == cluster_id:
            target_cluster = c
            break

    if not target_cluster:
        return Response({'detail': 'Cluster not found.'}, status=status.HTTP_404_NOT_FOUND)

    # Find all farmers with farms inside the cluster radius
    from .services import haversine_km
    center_lat = target_cluster['center_latitude']
    center_lon = target_cluster['center_longitude']
    cluster_radius = target_cluster.get('radius_km', 15.0)

    notified_users = set()
    for farm in Farm.objects.filter(latitude__isnull=False, longitude__isnull=False).select_related('user'):
        dist = haversine_km(center_lat, center_lon, farm.latitude, farm.longitude)
        if dist <= cluster_radius and farm.user_id not in notified_users:
            notified_users.add(farm.user_id)
            try:
                from alerts.models import Alert
                Alert.objects.create(
                    recipient=farm.user,
                    alert_type='hotspot_dispatch',
                    message=f"🚨 Advisory from Agriculture Office: {message} (Zone: {target_cluster['zone_name']})",
                )
            except Exception:
                pass

    return Response({
        'status': 'dispatched',
        'cluster': cluster_id,
        'zone_name': target_cluster['zone_name'],
        'farmers_notified': len(notified_users),
    })
