from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsExpertOrOfficer
from disease.models import DiseaseScan
from .models import ExpertReview
from .serializers import ExpertReviewSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def expert_review_list_create_view(request):
    """
    GET: List expert reviews.
      - Farmers: only reviews for their own scans
      - Experts/Officers: all reviews (optionally filtered)
    POST: Submit an agronomist review for a scan (expert/officer only).
    """
    if request.method == 'GET':
        qs = ExpertReview.objects.all()
        scan_id = request.query_params.get('scan_id')
        status_param = request.query_params.get('status')

        # Farmers can only see reviews for their own scans
        user_role = getattr(request.user, 'role', 'farmer')
        if user_role == 'farmer':
            qs = qs.filter(scan__user=request.user)

        if scan_id:
            qs = qs.filter(scan_id=scan_id)
        if status_param:
            qs = qs.filter(status=status_param)

        serializer = ExpertReviewSerializer(qs[:50], many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        # Only experts/officers can submit reviews
        user_role = getattr(request.user, 'role', 'farmer')
        if user_role not in ('expert', 'officer'):
            return Response(
                {'detail': 'Only verified experts and officers can submit reviews.'},
                status=status.HTTP_403_FORBIDDEN
            )

        scan_id = request.data.get('scan')
        scan = DiseaseScan.objects.filter(id=scan_id).first()
        if not scan:
            return Response({'detail': 'Invalid scan ID.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = ExpertReviewSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            review = serializer.save()

            # Auto-sync to feedback dataset if confirmed or corrected
            if review.status in ['confirmed', 'corrected']:
                try:
                    from feedback.services import sync_expert_review_to_feedback
                    sync_expert_review_to_feedback(review)
                except Exception:
                    pass

            # Send alert back to the farmer whose scan was reviewed
            try:
                from alerts.models import Alert
                farmer = scan.user
                if farmer and farmer != request.user:
                    expert_name = request.user.get_full_name() or request.user.username
                    Alert.objects.create(
                        recipient=farmer,
                        alert_type='expert_review_completed',
                        related_scan=scan,
                        message=f'Your scan for {scan.disease_name or scan.crop_type} has been reviewed by {expert_name}. Status: {review.get_status_display()}.',
                    )
            except Exception:
                pass

            return Response(
                ExpertReviewSerializer(review, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsExpertOrOfficer])
def unreviewed_queue_view(request):
    """
    GET /api/expert/queue/
    Returns disease scans awaiting expert verification.
    Scoped to the expert/officer's assigned region.
    Sorted by priority (urgent first) then recency.
    """
    # Scans that do not have a confirmed or corrected review
    reviewed_scan_ids = ExpertReview.objects.filter(
        status__in=['confirmed', 'corrected']
    ).values_list('scan_id', flat=True)

    unreviewed_scans = DiseaseScan.objects.exclude(
        id__in=reviewed_scan_ids
    ).select_related('farm', 'user')

    # Region scoping: filter by expert/officer's assigned region
    user = request.user
    if user.assigned_region_lat and user.assigned_region_lon and user.assigned_region_radius_km:
        from hotspots.services import haversine_km
        radius = user.assigned_region_radius_km or 50.0
        filtered_ids = []
        for s in unreviewed_scans:
            if s.farm and s.farm.latitude and s.farm.longitude:
                dist = haversine_km(
                    user.assigned_region_lat, user.assigned_region_lon,
                    s.farm.latitude, s.farm.longitude
                )
                if dist <= radius:
                    filtered_ids.append(s.id)
        unreviewed_scans = unreviewed_scans.filter(id__in=filtered_ids)

    # Sort: urgent priority first, then by recency
    unreviewed_scans = unreviewed_scans.order_by(
        '-needs_expert_review', '-priority', '-created_at'
    )[:30]

    results = []
    for s in unreviewed_scans:
        image_url = request.build_absolute_uri(s.image.url) if s.image else None
        results.append({
            'scan_id': s.id,
            'farm_name': s.farm.farm_name if s.farm else 'Independent Plot',
            'farmer_name': s.user.get_display_name() if s.user else 'Farmer',
            'crop_name': s.crop_type or 'Unknown',
            'predicted_disease': s.disease_name or s.predicted_class,
            'confidence': s.confidence,
            'confidence_percent': f"{round(s.confidence * 100, 1)}%" if s.confidence else '0%',
            'severity': s.severity,
            'is_healthy': s.is_healthy,
            'needs_expert_review': getattr(s, 'needs_expert_review', False),
            'priority': getattr(s, 'priority', 'normal'),
            'image_url': image_url,
            'created_at': s.created_at.strftime('%Y-%m-%d %H:%M'),
        })

    return Response(results)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsExpertOrOfficer])
def expert_review_detail_view(request, pk):
    """Detail, edit or remove an expert review."""
    review = ExpertReview.objects.filter(pk=pk).first()
    if not review:
        return Response({'detail': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(ExpertReviewSerializer(review, context={'request': request}).data)

    elif request.method == 'PUT':
        serializer = ExpertReviewSerializer(review, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated = serializer.save()
            if updated.status in ['confirmed', 'corrected']:
                try:
                    from feedback.services import sync_expert_review_to_feedback
                    sync_expert_review_to_feedback(updated)
                except Exception:
                    pass
            return Response(ExpertReviewSerializer(updated, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        review.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)
