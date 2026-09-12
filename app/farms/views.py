from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Farm, Crop, Activity
from .serializers import FarmSerializer


class FarmListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FarmSerializer

    def get_queryset(self):
        return Farm.objects.filter(user=self.request.user).prefetch_related('crops')

    def perform_create(self, serializer):
        farm = serializer.save(user=self.request.user)
        if farm.crop:
            Crop.objects.get_or_create(farm=farm, name=farm.crop.strip(), defaults={'status': 'active'})
        Activity.objects.create(
            farm=farm,
            icon='🏡',
            title=f"{farm.farm_name} registered",
            sub=farm.location_display,
            activity_type='farm'
        )


class FarmDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FarmSerializer

    def get_queryset(self):
        return Farm.objects.filter(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def primary_farm(request):
    """Return the user's first (primary) farm."""
    farm = Farm.objects.filter(user=request.user).prefetch_related('crops').first()
    if not farm:
        return Response(
            {'detail': 'No farm found. Please add your farm first.'},
            status=status.HTTP_404_NOT_FOUND
        )
    serializer = FarmSerializer(farm, context={'request': request})
    return Response(serializer.data)
