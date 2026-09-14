import os
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from farms.models import Farm
from .models import DiseaseScan
from .serializers import DiseaseScanSerializer, DiseasePredictSerializer
from .model_service import get_disease_model_service
from assistant.agent.tools.weather import get_current_weather
from assistant.agent.tools.risk import calculate_disease_risk

logger = logging.getLogger("disease.views")


class DiseasePredictView(APIView):
    """
    POST /api/disease/predict/

    Accepts a crop leaf image via multipart/form-data.
    Runs ConvNeXt-Tiny deep learning inference (agrismart_convnext_tiny_final.pth).
    Saves the analyzed scan and returns structured diagnostic, weather, and risk intelligence.
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ser = DiseasePredictSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        crop_type = ser.validated_data.get('crop_type', 'Unknown')
        farm_id = ser.validated_data.get('farm_id')
        image = ser.validated_data.get('image')

        user = request.user if request.user and request.user.is_authenticated else None
        farm = None
        if user and farm_id:
            farm = Farm.objects.filter(id=farm_id, user=user).first()
        elif user:
            farm = Farm.objects.filter(user=user).first()

        # If user is not authenticated, check if a demo user exists
        if not user:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.filter(email='farmer@agrismart.ai').first() or User.objects.first()

        # Save initial scan record
        scan = DiseaseScan.objects.create(
            user=user,
            farm=farm,
            image=image,
            crop_type=crop_type,
            model_status='pending',
        )

        # Run ConvNeXt-Tiny Model Inference
        try:
            model_service = get_disease_model_service()
            pred_res = model_service.predict(scan.image.path)
        except Exception as e:
            logger.exception("ConvNeXt-Tiny inference failed: %s", e)
            scan.model_status = 'error'
            scan.notes = str(e)
            scan.save()
            return Response(
                {
                    "error": "INFERENCE_FAILED",
                    "message": "We could not process this image. Please upload a clear photo of the crop leaf.",
                    "details": str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Update scan with real model predictions
        scan.predicted_class = pred_res["predicted_class"]
        scan.confidence = pred_res["confidence"]
        scan.severity = pred_res["severity_level"].lower()
        scan.is_healthy = pred_res["is_healthy"]
        scan.crop_type = pred_res["crop_name"]
        scan.model_status = 'ready'
        scan.save()

        # Fetch environmental telemetry & calculate deterministic spread risk
        weather_ctx = get_current_weather(farm)
        disease_ctx = {
            "available": True,
            "crop": pred_res["crop_name"],
            "disease": pred_res["disease_name"],
            "confidence": pred_res["confidence"],
            "confidence_percentage": round(pred_res["confidence"] * 100, 1),
            "severity": pred_res["severity_level"],
            "is_healthy": pred_res["is_healthy"],
        }
        risk_ctx = calculate_disease_risk(disease_ctx, weather_ctx)

        # Build full agronomic payload matching frontend mapDiseaseApiResponse
        image_url = request.build_absolute_uri(scan.image.url) if scan.image else None
        file_size_kb = f"{scan.image.size / 1024:.1f} KB" if scan.image else "Unknown"

        # Action timeline based on clinical recommendations
        recs = pred_res.get("recommendations", [])
        action_timeline = {
            "today": [recs[0]] if len(recs) > 0 else ["Isolate affected crop foliage."],
            "next24Hours": [recs[1]] if len(recs) > 1 else ["Inspect adjacent rows for early symptom onset."],
            "next3Days": [recs[2]] if len(recs) > 2 else ["Apply targeted organic/chemical protectant if humidity remains elevated."],
            "nextWeek": ["Reassess crop foliage and monitor canopy regeneration."],
        }

        # 7-Day progression forecast
        base_val = risk_ctx["score"]
        disease_forecast = [
            {"day": "Day 1", "risk": risk_ctx["level"], "value": base_val},
            {"day": "Day 2", "risk": risk_ctx["level"], "value": min(100, max(10, base_val + 5))},
            {"day": "Day 3", "risk": "Moderate" if base_val > 50 else "Low", "value": min(100, max(10, base_val + 2))},
            {"day": "Day 4", "risk": "Moderate" if base_val > 50 else "Low", "value": min(100, max(10, base_val - 3))},
            {"day": "Day 5", "risk": "Low" if base_val < 60 else "Moderate", "value": min(100, max(10, base_val - 8))},
            {"day": "Day 6", "risk": "Low", "value": min(100, max(10, base_val - 12))},
            {"day": "Day 7", "risk": "Low", "value": min(100, max(10, base_val - 15))},
        ]

        response_data = {
            "id": scan.id,
            "image_url": image_url,
            "file_name": os.path.basename(scan.image.name) if scan.image else "leaf.jpg",
            "file_size": file_size_kb,
            "created_at": scan.created_at.strftime("Today, %I:%M %p"),

            # Prediction
            "crop_name": pred_res["crop_name"],
            "scientific_crop": pred_res.get("scientific_name") or pred_res["crop_name"],
            "predicted_class": pred_res["predicted_class"],
            "disease_name": pred_res["disease_name"],
            "pathogen": pred_res["pathogen"],
            "confidence": pred_res["confidence"],
            "confidence_percent": pred_res["confidence_percent"],
            "is_healthy": pred_res["is_healthy"],
            "status": "Healthy Foliage" if pred_res["is_healthy"] else "Disease Detected",
            "message": (
                f"The leaf analysis detected {pred_res['disease_name']} with {pred_res['confidence_percent']} confidence."
                if not pred_res["is_healthy"]
                else f"Healthy {pred_res['crop_name']} foliage with intact cuticle barrier."
            ),

            # Crop Health & Severity
            "health_score": pred_res["health_score"],
            "health_status": "Optimal Health" if pred_res["is_healthy"] else ("Severe Threat" if pred_res["severity_level"] == "Critical" else "Moderate Risk"),
            "health_explanation": "Foliage exhibits high cellular turgor with intact surface cuticle." if pred_res["is_healthy"] else f"Observed lesions indicate active {pred_res['disease_name']}.",
            "severity_level": pred_res["severity_level"],
            "severity_score": pred_res["severity_score"],
            "affected_area": pred_res["affected_area"],
            "severity_explanation": f"Observed necrotic lesion coverage is {pred_res['affected_area']} of the leaf blade.",

            # Disease Biology
            "category": pred_res["category"],
            "scientific_name": pred_res["scientific_name"],
            "description": f"{pred_res['disease_name']} is an agricultural pathology affecting {pred_res['crop_name']}. Pathogen: {pred_res['pathogen'] or 'Phytopathological agent'}.",
            "symptoms": pred_res["symptoms"],
            "possible_causes": pred_res["possible_causes"],

            # Spread Risk & Environmental Context
            "spread_risk_level": risk_ctx["level"],
            "spread_risk_score": risk_ctx["score"],
            "spread_risk_explanation": " ".join(risk_ctx.get("reasons", [])),
            "spread_risk_factors": risk_ctx.get("reasons", []),
            "weather": weather_ctx,

            # Irrigation Advice & Timeline
            "disease_forecast": disease_forecast,
            "irrigation": {
                "recommendation": "Root-Zone Drip Watering" if not pred_res["is_healthy"] else "Regular Irrigation",
                "action_type": "delay" if weather_ctx.get("rain_probability", 0) > 60 else "regular",
                "method": "Targeted Drip Line",
                "explanation": "Avoid overhead spray to keep leaf surfaces dry and stop fungal spore splash.",
                "caution": "Do not wet canopy during high humidity periods.",
                "weather_relationship": f"Microclimate humidity is {weather_ctx.get('humidity', 65)}% with {weather_ctx.get('rain_probability', 20)}% rain chance.",
            },
            "action_timeline": action_timeline,

            # Summary for Agronomist
            "summary": {
                "headline": f"{pred_res['crop_name']} — {pred_res['disease_name']}",
                "text": f"Diagnosis confirmed {pred_res['disease_name']} at {pred_res['confidence_percent']} confidence. Review recommended treatment actions.",
                "priority": "High Priority" if risk_ctx["level"] == "High" else "Normal Priority",
                "recommendations": pred_res.get("recommendations", []),
                "expert_note": "Agronomic advice based on ICAR and state agricultural university crop protection guidelines.",
            },

            # Alternatives (Top 3 Predictions)
            "confidence_breakdown": pred_res["alternatives"],

            # Model Transparency
            "model_status": "ready",
            "model_metrics": {
                "model": "ConvNeXt-Tiny",
                "total_classes": pred_res["model_metadata"]["total_classes"],
                "inference_time_ms": pred_res["inference_time_ms"],
                "device": pred_res["device"],
                "lab_test_accuracy": pred_res["model_metadata"]["lab_test_accuracy"],
                "plantdoc_field_accuracy": pred_res["model_metadata"]["plantdoc_field_accuracy"],
                "limitation_notice": "Current prototype model achieves ~55.5% out-of-distribution field accuracy (PlantDoc) and 98.9% lab accuracy. Output is for decision support.",
            },
        }

        return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])
def disease_history(request):
    """GET /api/disease/history/?farm_id=<id>"""
    farm_id = request.query_params.get('farm_id')
    user = request.user if request.user and request.user.is_authenticated else None
    if not user:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.filter(email='farmer@agrismart.ai').first() or User.objects.first()

    qs = DiseaseScan.objects.filter(user=user)
    if farm_id:
        qs = qs.filter(farm_id=farm_id)
    ser = DiseaseScanSerializer(qs, many=True, context={'request': request})
    return Response(ser.data)
