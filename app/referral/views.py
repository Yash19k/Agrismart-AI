from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm
from .models import Referral
from .serializers import ReferralSerializer


class ReferralListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/referrals/
    POST /api/referrals/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralSerializer

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', 'farmer')

        if role == 'farmer':
            qs = Referral.objects.filter(farm__user=user)
        else:
            qs = Referral.objects.all()

        farm_id = self.request.query_params.get('farm_id')
        if farm_id:
            qs = qs.filter(farm_id=farm_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        user = self.request.user
        farm = serializer.validated_data.get('farm')
        if getattr(user, 'role', 'farmer') == 'farmer' and farm.user != user:
            raise PermissionDenied("You can only request referrals for your own farm parcels.")

        serializer.save(requested_by=user)


class ReferralDetailUpdateView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/referrals/<id>/
    PATCH /api/referrals/<id>/
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ReferralSerializer

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', 'farmer')
        if role == 'farmer':
            return Referral.objects.filter(farm__user=user)
        return Referral.objects.all()

    def perform_update(self, serializer):
        user = self.request.user
        role = getattr(user, 'role', 'farmer')
        new_status = self.request.data.get('status')

        # Farmers can only request or cancel their request
        if role == 'farmer' and new_status in ('completed', 'declined'):
            raise PermissionError("Only extension experts and officers can mark referrals as completed or declined.")

        serializer.save()
