import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from farms.models import Farm
from .models import CropPredictionRecord
from .serializers import CropPredictInputSerializer, CropPredictionRecordSerializer
from .service import get_crop_recommendation_service, REGIONAL_PRESETS

logger = logging.getLogger("crops.views")


class CropPredictView(APIView):
    """
    POST /api/crops/predict/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CropPredictInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        n = data["N"]
        p = data["P"]
        k = data["K"]
        temp = data["temperature"]
        humidity = data["humidity"]
        ph = data["ph"]
        rainfall = data["rainfall"]
        farm_id = data.get("farm_id")

        # Resolve user & farm
        user = request.user
        farm = None
        if farm_id:
            farm = Farm.objects.filter(id=farm_id, user=user).first()
        if not farm:
            farm = Farm.objects.filter(user=user).first()

        try:
            service = get_crop_recommendation_service()
            result = service.predict(
                nitrogen=n,
                phosphorus=p,
                potassium=k,
                temperature=temp,
                humidity=humidity,
                ph=ph,
                rainfall=rainfall
            )

            # Persist record for farmer's records
            record = CropPredictionRecord.objects.create(
                user=user,
                farm=farm,
                nitrogen=n,
                phosphorus=p,
                potassium=k,
                ph=ph,
                temperature=temp,
                humidity=humidity,
                rainfall=rainfall,
                recommended_crop=result["recommended_crop"],
                confidence=result["confidence"],
                top_3_crops=result["top_3_recommendations"],
                agronomic_details=result["agronomic_profile"]
            )
            result["record_id"] = record.id

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Crop prediction inference failed: %s", e)
            return Response(
                {
                    "error": "PREDICTION_FAILED",
                    "message": "We could not compute crop recommendation for these parameters.",
                    "details": str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def crop_presets(request):
    """GET /api/crops/presets/"""
    return Response(REGIONAL_PRESETS)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def crop_history(request):
    """GET /api/crops/history/"""
    user = request.user
    farm_id = request.query_params.get('farm_id')
    qs = CropPredictionRecord.objects.filter(user=user)
    if farm_id:
        qs = qs.filter(farm_id=farm_id)

    ser = CropPredictionRecordSerializer(qs[:20], many=True)
    return Response(ser.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def crop_catalog(request):
    """GET /api/crops/catalog/"""
    service = get_crop_recommendation_service()
    return Response(service.metadata)
