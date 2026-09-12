from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from farms.models import Farm
from .models import DiseaseScan
from .serializers import DiseaseScanSerializer, DiseasePredictSerializer


class DiseasePredictView(APIView):
    """
    POST /api/disease/predict/

    Accepts a crop leaf image, stores it, and returns a pending status.
    The ML model (model/predict.py) is not yet implemented.
    Once implemented, update this view to call predict_image() and
    populate predicted_class, confidence, severity, is_healthy.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        ser = DiseasePredictSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        crop_type = ser.validated_data.get('crop_type', 'Unknown')
        farm_id   = ser.validated_data.get('farm_id')
        image     = ser.validated_data.get('image')

        farm = None
        if farm_id:
            farm = Farm.objects.filter(id=farm_id, user=request.user).first()

        scan = DiseaseScan.objects.create(
            user=request.user,
            farm=farm,
            image=image,
            crop_type=crop_type,
            model_status='pending',
        )

        data = DiseaseScanSerializer(scan, context={'request': request}).data
        data['model_message'] = (
            'The crop disease detection model is being prepared. '
            'Your image has been saved and will be analysed once the model is ready.'
        )
        data['status'] = 'model_pending'
        return Response(data, status=status.HTTP_202_ACCEPTED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def disease_history(request):
    """GET /api/disease/history/?farm_id=<id>"""
    farm_id = request.query_params.get('farm_id')
    qs = DiseaseScan.objects.filter(user=request.user)
    if farm_id:
        qs = qs.filter(farm_id=farm_id)
    ser = DiseaseScanSerializer(qs, many=True, context={'request': request})
    return Response(ser.data)
