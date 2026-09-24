import math
from datetime import timedelta
from django.utils import timezone
from collections import defaultdict

from farms.models import Farm
from disease.models import DiseaseScan
from pests.models import PestObservation


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in kilometers.
    """
    r = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def get_local_incidence(lat: float, lon: float, radius_km: float = 10.0, days: int = 14) -> int:
    """
    Counts active disease outbreaks or threshold-exceeding pest incidents
    within `radius_km` of (lat, lon) in the past `days`.
    """
    cutoff = timezone.now() - timedelta(days=days)
    count = 0

    # 1. Nearby diseased scans
    scans = DiseaseScan.objects.filter(
        created_at__gte=cutoff,
        is_healthy=False,
        farm__isnull=False
    ).select_related('farm')

    for scan in scans:
        if scan.farm and scan.farm.latitude and scan.farm.longitude:
            dist = haversine_km(lat, lon, scan.farm.latitude, scan.farm.longitude)
            if dist <= radius_km:
                count += 1

    # 2. Nearby pest alerts/actions
    pests = PestObservation.objects.filter(
        observed_at__gte=cutoff,
        threshold_level__in=['alert', 'action_required'],
        farm__isnull=False
    ).select_related('farm')

    for obs in pests:
        if obs.farm and obs.farm.latitude and obs.farm.longitude:
            dist = haversine_km(lat, lon, obs.farm.latitude, obs.farm.longitude)
            if dist <= radius_km:
                count += 1

    return count


def cluster_hotspots(days: int = 21, cluster_radius_km: float = 25.0) -> list:
    """
    Clusters active disease scans and pest alerts across the region into hotspot zones.
    """
    cutoff = timezone.now() - timedelta(days=days)
    incidents = []

    # Collect disease incidents
    for scan in DiseaseScan.objects.filter(created_at__gte=cutoff, is_healthy=False, farm__isnull=False).select_related('farm'):
        incidents.append({
            'type': 'disease',
            'id': scan.id,
            'farm_id': scan.farm.id,
            'farm_name': scan.farm.farm_name,
            'crop': scan.crop_type or scan.farm.crop or 'Crop',
            'pathogen': scan.disease_name or 'Pathogen',
            'severity': scan.severity or 'medium',
            'latitude': scan.farm.latitude,
            'longitude': scan.farm.longitude,
            'date': scan.created_at.strftime('%Y-%m-%d'),
            'score': 15 if scan.severity == 'high' else 10
        })

    # Collect pest incidents
    for obs in PestObservation.objects.filter(observed_at__gte=cutoff, threshold_level__in=['alert', 'action_required'], farm__isnull=False).select_related('farm'):
        incidents.append({
            'type': 'pest',
            'id': obs.id,
            'farm_id': obs.farm.id,
            'farm_name': obs.farm.farm_name,
            'crop': obs.farm.crop or 'Crop',
            'pathogen': f"Pest: {obs.pest_type} ({obs.pest_count})",
            'severity': 'high' if obs.threshold_level == 'action_required' else 'medium',
            'latitude': obs.farm.latitude,
            'longitude': obs.farm.longitude,
            'date': obs.observed_at.strftime('%Y-%m-%d'),
            'score': 15 if obs.threshold_level == 'action_required' else 8
        })

    if not incidents:
        return []

    # Simple greedy distance clustering
    visited = [False] * len(incidents)
    clusters = []

    for i in range(len(incidents)):
        if visited[i]:
            continue

        cluster_pts = [incidents[i]]
        visited[i] = True

        for j in range(i + 1, len(incidents)):
            if visited[j]:
                continue
            dist = haversine_km(
                incidents[i]['latitude'], incidents[i]['longitude'],
                incidents[j]['latitude'], incidents[j]['longitude']
            )
            if dist <= cluster_radius_km:
                cluster_pts.append(incidents[j])
                visited[j] = True

        # Synthesize cluster
        avg_lat = sum(p['latitude'] for p in cluster_pts) / len(cluster_pts)
        avg_lon = sum(p['longitude'] for p in cluster_pts) / len(cluster_pts)
        total_score = sum(p['score'] for p in cluster_pts)

        if total_score >= 35 or len(cluster_pts) >= 5:
            severity = 'critical'
        elif total_score >= 20 or len(cluster_pts) >= 3:
            severity = 'high'
        else:
            severity = 'moderate'

        # Dominant issues & crops
        crops = list({p['crop'] for p in cluster_pts if p['crop']})
        issues = list({p['pathogen'] for p in cluster_pts if p['pathogen']})
        unique_farms = list({p['farm_id'] for p in cluster_pts})

        # Name zone based on location of first incident or nearest city
        center_farm = cluster_pts[0]['farm_name']

        clusters.append({
            'id': f"cluster-{i + 1}",
            'center_latitude': round(avg_lat, 4),
            'center_longitude': round(avg_lon, 4),
            'zone_name': f"{center_farm} Cluster",
            'severity': severity,
            'incident_count': len(cluster_pts),
            'affected_farms_count': len(unique_farms),
            'affected_crops': crops,
            'primary_threats': issues[:4],
            'radius_km': max(5.0, round(cluster_radius_km * 0.6, 1)),
            'incidents': cluster_pts,
        })

    return sorted(clusters, key=lambda c: (c['severity'] == 'critical', c['incident_count']), reverse=True)
