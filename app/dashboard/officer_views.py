"""
Officer Dashboard — Regional Surveillance View.
GET /api/dashboard/officer/

Unified endpoint for agriculture officers providing:
- Active hotspot clusters in-region
- Expert review backlog by priority
- Pest pressure summary
- Follow-up completion rate (surveillance coverage)
- 30-day disease/pest trend
"""
import logging
from datetime import timedelta
from collections import Counter

from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsOfficer
from farms.models import Farm
from disease.models import DiseaseScan
from pests.models import PestObservation
from followups.models import FollowUp
from expert.models import ExpertReview
from hotspots.services import cluster_hotspots, haversine_km

logger = logging.getLogger('dashboard')


def _filter_by_region(queryset, user, farm_fk='farm'):
    """Filter a queryset to only include records within the officer's assigned region."""
    if not (user.assigned_region_lat and user.assigned_region_lon):
        return queryset  # No region set — show all

    radius = user.assigned_region_radius_km or 50.0
    # Get farm IDs within radius
    farm_ids = []
    for farm in Farm.objects.filter(latitude__isnull=False, longitude__isnull=False):
        dist = haversine_km(
            user.assigned_region_lat, user.assigned_region_lon,
            farm.latitude, farm.longitude
        )
        if dist <= radius:
            farm_ids.append(farm.id)

    if farm_fk == 'farm':
        return queryset.filter(farm_id__in=farm_ids)
    elif farm_fk == 'scan__farm':
        return queryset.filter(scan__farm_id__in=farm_ids)
    return queryset


@api_view(['GET'])
@permission_classes([IsOfficer])
def officer_dashboard_view(request):
    """
    GET /api/dashboard/officer/
    Returns a comprehensive regional surveillance dashboard for agriculture officers.
    """
    user = request.user
    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)

    # ── 1. Active hotspot clusters (region-filtered) ───────────────────────
    all_clusters = cluster_hotspots(days=30)
    if user.assigned_region_lat and user.assigned_region_lon:
        radius = user.assigned_region_radius_km or 50.0
        clusters = [
            c for c in all_clusters
            if haversine_km(
                user.assigned_region_lat, user.assigned_region_lon,
                c['center_latitude'], c['center_longitude']
            ) <= radius
        ]
    else:
        clusters = all_clusters

    # ── 2. Expert review backlog (region-filtered) ─────────────────────────
    reviewed_ids = ExpertReview.objects.filter(
        status__in=['confirmed', 'corrected']
    ).values_list('scan_id', flat=True)

    pending_scans = DiseaseScan.objects.filter(
        needs_expert_review=True
    ).exclude(id__in=reviewed_ids)
    pending_scans = _filter_by_region(pending_scans, user)

    urgent_count = pending_scans.filter(priority='urgent').count()
    normal_count = pending_scans.filter(priority='normal').count()

    # ── 3. Pest pressure summary (region-filtered) ─────────────────────────
    pest_qs = PestObservation.objects.filter(observed_at__gte=thirty_days_ago)
    pest_qs = _filter_by_region(pest_qs, user)

    pest_summary = {
        'total_observations': pest_qs.count(),
        'action_required': pest_qs.filter(threshold_level='action_required').count(),
        'alert': pest_qs.filter(threshold_level='alert').count(),
        'top_pests': list(
            pest_qs.values('pest_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        ),
    }

    # ── 4. Follow-up completion rate (surveillance coverage) ───────────────
    followup_qs = FollowUp.objects.all()
    followup_qs = _filter_by_region(followup_qs, user)

    total_followups = followup_qs.count()
    completed_followups = followup_qs.filter(status='completed').count()
    overdue_followups = followup_qs.filter(
        status='scheduled',
        scheduled_date__lt=now.date()
    ).count()
    scheduled_followups = followup_qs.filter(
        status='scheduled',
        scheduled_date__gte=now.date()
    ).count()

    completion_rate = round(
        (completed_followups / total_followups * 100) if total_followups > 0 else 0, 1
    )

    # ── 5. 30-day trend (daily disease/pest incident counts) ───────────────
    trend_data = []
    for day_offset in range(30, -1, -1):
        day = (now - timedelta(days=day_offset)).date()
        day_start = timezone.make_aware(
            timezone.datetime.combine(day, timezone.datetime.min.time())
        )
        day_end = day_start + timedelta(days=1)

        disease_count = DiseaseScan.objects.filter(
            created_at__gte=day_start, created_at__lt=day_end,
            is_healthy=False
        ).count()
        pest_count = PestObservation.objects.filter(
            observed_at__gte=day_start, observed_at__lt=day_end,
            threshold_level__in=['alert', 'action_required']
        ).count()

        trend_data.append({
            'date': day.isoformat(),
            'disease_incidents': disease_count,
            'pest_incidents': pest_count,
            'total': disease_count + pest_count,
        })

    # ── 6. Region summary ─────────────────────────────────────────────────
    farms_in_region = Farm.objects.all()
    if user.assigned_region_lat and user.assigned_region_lon:
        region_farm_ids = []
        for f in farms_in_region.filter(latitude__isnull=False, longitude__isnull=False):
            dist = haversine_km(
                user.assigned_region_lat, user.assigned_region_lon,
                f.latitude, f.longitude
            )
            if dist <= (user.assigned_region_radius_km or 50.0):
                region_farm_ids.append(f.id)
        farms_in_region = farms_in_region.filter(id__in=region_farm_ids)

    return Response({
        'officer': {
            'name': user.get_full_name() or user.username,
            'assigned_region': user.assigned_region or 'All regions',
        },
        'hotspot_clusters': [
            {
                'id': c['id'],
                'zone_name': c['zone_name'],
                'severity': c['severity'],
                'incident_count': c['incident_count'],
                'affected_farms_count': c['affected_farms_count'],
                'affected_crops': c['affected_crops'],
                'primary_threats': c['primary_threats'],
                'center_latitude': c['center_latitude'],
                'center_longitude': c['center_longitude'],
                'radius_km': c['radius_km'],
            }
            for c in clusters
        ],
        'expert_review_backlog': {
            'total_pending': urgent_count + normal_count,
            'urgent': urgent_count,
            'normal': normal_count,
        },
        'pest_pressure': pest_summary,
        'followup_coverage': {
            'total': total_followups,
            'completed': completed_followups,
            'scheduled': scheduled_followups,
            'overdue': overdue_followups,
            'completion_rate_percent': completion_rate,
        },
        'trend_30_days': trend_data,
        'region_stats': {
            'total_farms': farms_in_region.count(),
            'total_acreage': round(sum(f.farm_size or 2.5 for f in farms_in_region), 1),
        },
    })
