from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Alert
from .serializers import AlertSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alert_list_view(request):
    """
    GET /api/alerts/
    Returns the authenticated user's alerts (own alerts only), newest first.
    """
    qs = Alert.objects.filter(recipient=request.user)[:50]
    serializer = AlertSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def alert_unread_count_view(request):
    """
    GET /api/alerts/unread-count/
    Quick endpoint for the bell icon badge.
    """
    count = Alert.objects.filter(recipient=request.user, is_read=False).count()
    return Response({'unread_count': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def alert_mark_read_view(request, pk):
    """
    POST /api/alerts/<pk>/mark-read/
    Marks a single alert as read.
    """
    alert = Alert.objects.filter(pk=pk, recipient=request.user).first()
    if not alert:
        return Response({'detail': 'Alert not found.'}, status=status.HTTP_404_NOT_FOUND)
    alert.is_read = True
    alert.save()
    return Response(AlertSerializer(alert).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def alert_mark_all_read_view(request):
    """
    POST /api/alerts/mark-all-read/
    Marks all of the user's unread alerts as read.
    """
    updated = Alert.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({'marked_read': updated})
