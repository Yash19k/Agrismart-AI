from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from disease.models import DiseaseScan
from .models import FollowUp
from .serializers import FollowUpSerializer


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def followups_list_create_view(request):
    """
    GET: List follow-up reminders.
    POST: Schedule a follow-up for a diseased scan.
    Scoped by role: farmers see only their own follow-ups.
    """
    user = request.user
    user_role = getattr(user, 'role', 'farmer')

    if request.method == 'GET':
        if user_role == 'farmer':
            qs = FollowUp.objects.filter(user=user)
        else:
            qs = FollowUp.objects.all()

        farm_id = request.query_params.get('farm_id')
        status_filter = request.query_params.get('status')

        if farm_id:
            qs = qs.filter(farm_id=farm_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Update overdue records dynamically
        for f in qs:
            f.update_status()

        serializer = FollowUpSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = FollowUpSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            followup = serializer.save()
            return Response(
                FollowUpSerializer(followup, context={'request': request}).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def followup_complete_view(request, pk):
    """
    POST /api/followups/<pk>/complete/
    Closes a follow-up record with the results of a re-check scan and farmer treatment report.
    """
    user = request.user
    user_role = getattr(user, 'role', 'farmer')

    if user_role == 'farmer':
        followup = FollowUp.objects.filter(pk=pk, user=user).first()
    else:
        followup = FollowUp.objects.filter(pk=pk).first()

    if not followup:
        return Response({'detail': 'Follow-up not found.'}, status=status.HTTP_404_NOT_FOUND)

    recheck_scan_id = request.data.get('recheck_scan_id')
    outcome = request.data.get('outcome', 'resolved')
    intervention = request.data.get('intervention_applied', '')
    recovery = request.data.get('recovery_percentage', 100.0)
    notes = request.data.get('notes', '')

    if recheck_scan_id:
        recheck_scan = DiseaseScan.objects.filter(id=recheck_scan_id).first()
        if recheck_scan:
            followup.recheck_scan = recheck_scan

    followup.outcome = outcome
    followup.status = 'completed'
    followup.intervention_applied = intervention
    followup.recovery_percentage = float(recovery) if recovery is not None else None
    followup.notes = notes
    followup.completed_at = timezone.now()
    followup.save()

    return Response(FollowUpSerializer(followup, context={'request': request}).data)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def followup_detail_view(request, pk):
    user = request.user
    user_role = getattr(user, 'role', 'farmer')

    if user_role == 'farmer':
        followup = FollowUp.objects.filter(pk=pk, user=user).first()
    else:
        followup = FollowUp.objects.filter(pk=pk).first()

    if not followup:
        return Response({'detail': 'Follow-up not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        followup.update_status()
        return Response(FollowUpSerializer(followup, context={'request': request}).data)

    elif request.method == 'PUT':
        serializer = FollowUpSerializer(followup, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            updated = serializer.save()
            return Response(FollowUpSerializer(updated, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        followup.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)
