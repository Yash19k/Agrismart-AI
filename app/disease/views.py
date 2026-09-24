import os
import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView

from farms.models import Farm
from .models import DiseaseScan
from .serializers import DiseaseScanSerializer, DiseasePredictSerializer
from .model_service import get_disease_model_service
from assistant.agent.tools.weather import get_current_weather
from risk.engine import calculate_risk
from risk.ipm import get_ipm_guidance
from risk.forecast import generate_7day_forecast

logger = logging.getLogger("disease.views")


class DiseasePredictView(APIView):
    """
    POST /api/disease/predict/

    Full pipeline endpoint:
    1. ConvNeXt-Tiny inference
    2. Multi-factor risk engine (weather + crop stage + pest history + local incidence)
    3. IPM guidance (cultural → biological → chemical)
    4. Auto-flag to expert queue if high risk / low confidence
    5. Auto-schedule follow-up if diseased
    6. Referral trigger if critical / ambiguous
    7. Expert/officer notification for flagged scans
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ser = DiseasePredictSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        crop_type = ser.validated_data.get('crop_type', 'Unknown')
        farm_id = ser.validated_data.get('farm_id')
        image = ser.validated_data.get('image')

        user = request.user
        farm = None
        if farm_id:
            farm = Farm.objects.filter(id=farm_id, user=user).first()
        if not farm:
            farm = Farm.objects.filter(user=user).first()

        # Save initial scan record
        scan = DiseaseScan.objects.create(
            user=user,
            farm=farm,
            image=image,
            crop_type=crop_type,
            model_status='pending',
        )

        # ── 1. ConvNeXt-Tiny Model Inference ──────────────────────────────────
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
        scan.plant_name = pred_res["crop_name"]
        scan.disease_name = pred_res["disease_name"]
        scan.model_status = 'ready'

        # ── 2. Multi-Factor Risk Engine ───────────────────────────────────────
        weather_ctx = get_current_weather(farm)

        # Gather additional inputs for comprehensive risk scoring
        crop_stage = getattr(farm, 'crop_stage', 'vegetative') if farm else 'vegetative'

        # Pest count from latest observation
        pest_count = 0
        try:
            from pests.models import PestObservation
            latest_pest = PestObservation.objects.filter(farm=farm).order_by('-observed_at').first() if farm else None
            if latest_pest:
                pest_count = latest_pest.pest_count or 0
        except Exception:
            pass

        # Local incidence from hotspot services
        local_incidence_count = 0
        try:
            if farm and farm.latitude and farm.longitude:
                from hotspots.services import get_local_incidence
                local_incidence_count = get_local_incidence(farm.latitude, farm.longitude)
        except Exception:
            pass

        # Call the comprehensive risk engine (replaces old assistant.agent.tools.risk)
        risk_ctx = calculate_risk(
            crop_stage=crop_stage,
            humidity=weather_ctx.get('humidity', 60.0),
            temperature=weather_ctx.get('temperature', 25.0),
            rainfall_prob=weather_ctx.get('rain_probability', 20.0),
            disease_confidence=pred_res["confidence"] if not pred_res["is_healthy"] else 0.0,
            disease_severity=pred_res["severity_level"].lower() if not pred_res["is_healthy"] else 'none',
            is_healthy=pred_res["is_healthy"],
            pest_count=pest_count,
            local_incidence_count=local_incidence_count,
        )

        # ── 3. IPM Guidance ───────────────────────────────────────────────────
        ipm_guidance = get_ipm_guidance(
            disease_name=pred_res["disease_name"],
            risk_level=risk_ctx["level"],
        )

        # ── Build response payload ────────────────────────────────────────────
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

        # 7-Day dynamic progression forecast
        daily_weather_forecast = []
        try:
            from weather.services import WeatherService
            if farm:
                w_full = WeatherService.fetch_farm_weather(farm)
                daily_weather_forecast = w_full.get('daily', [])
        except Exception:
            pass

        disease_forecast = generate_7day_forecast(
            base_crop_stage=crop_stage,
            disease_confidence=pred_res["confidence"] if not pred_res["is_healthy"] else 0.0,
            disease_severity=pred_res["severity_level"].lower() if not pred_res["is_healthy"] else 'none',
            is_healthy=pred_res["is_healthy"],
            daily_weather_forecast=daily_weather_forecast,
            current_weather=weather_ctx,
        )

        # ── 4. Pipeline Orchestration (auto-flag, follow-up, referral, notify) ─

        # 4a. Auto-flag to expert queue
        try:
            if not pred_res["is_healthy"]:
                if risk_ctx["level"] in ("high", "critical") or pred_res["confidence"] < 0.6:
                    scan.needs_expert_review = True
                    scan.priority = 'urgent' if risk_ctx["level"] == "critical" else 'normal'
        except Exception:
            pass

        # 4b. Auto-schedule follow-up
        followup_data = None
        try:
            if not pred_res["is_healthy"] and farm:
                from followups.models import FollowUp
                days_until = 5 if risk_ctx["level"] == "critical" else 7
                followup = FollowUp.objects.create(
                    original_scan=scan,
                    farm=farm,
                    user=user,
                    scheduled_date=timezone.now().date() + timedelta(days=days_until),
                )
                followup_data = {
                    'id': followup.id,
                    'scheduled_date': followup.scheduled_date.isoformat(),
                    'days_until': days_until,
                }
        except Exception as e:
            logger.warning("Auto follow-up creation failed: %s", e)

        # 4c. Referral trigger
        referral_data = None
        try:
            if risk_ctx["level"] == "critical" or pred_res["confidence"] < 0.4:
                scan.referral_recommended = True
                from referral.kvk_directory import lookup_nearest_kvk
                kvk = lookup_nearest_kvk(
                    district=getattr(farm, 'location_name', '') if farm else '',
                    latitude=farm.latitude if farm else None,
                    longitude=farm.longitude if farm else None,
                )
                reason = (
                    "Critical risk level — immediate agronomist consultation recommended."
                    if risk_ctx["level"] == "critical"
                    else "Low model confidence — visual diagnosis inconclusive, laboratory verification advised."
                )
                referral_data = {
                    'recommended': True,
                    'reason': reason,
                    'contact_type': 'KVK',
                    'kvk_name': kvk.get('name', ''),
                    'kvk_contact': kvk.get('contact', ''),
                    'kvk_district': kvk.get('district', ''),
                    'kvk_note': kvk.get('note', ''),
                }
        except Exception as e:
            logger.warning("Referral lookup failed: %s", e)

        # Save scan with all orchestration flags
        scan.save()

        # 4d. Notify assigned expert/officer for flagged scans
        try:
            if scan.needs_expert_review:
                from alerts.models import Alert
                from accounts.models import User as AuthUser
                from hotspots.services import haversine_km

                # Find experts/officers assigned to this region
                staff_users = AuthUser.objects.filter(
                    role__in=['expert', 'officer'],
                    assigned_region_lat__isnull=False,
                    assigned_region_lon__isnull=False,
                )
                for staff in staff_users:
                    if farm and farm.latitude and farm.longitude:
                        dist = haversine_km(
                            staff.assigned_region_lat, staff.assigned_region_lon,
                            farm.latitude, farm.longitude
                        )
                        radius = staff.assigned_region_radius_km or 50.0
                        if dist <= radius:
                            Alert.objects.create(
                                recipient=staff,
                                alert_type='expert_review_needed',
                                related_scan=scan,
                                message=f"New scan flagged for review: {pred_res['disease_name']} on {pred_res['crop_name']} ({pred_res['confidence_percent']} confidence, {risk_ctx['level_display']} risk). Farm: {farm.farm_name if farm else 'Unknown'}.",
                            )
                    else:
                        # No farm coordinates — notify all staff
                        Alert.objects.create(
                            recipient=staff,
                            alert_type='expert_review_needed',
                            related_scan=scan,
                            message=f"New scan flagged for review: {pred_res['disease_name']} on {pred_res['crop_name']} ({pred_res['confidence_percent']} confidence, {risk_ctx['level_display']} risk).",
                        )
        except Exception as e:
            logger.warning("Expert notification failed: %s", e)

        # ── Build full response ───────────────────────────────────────────────
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

            # Spread Risk — from comprehensive engine (replaces old narrow risk)
            "spread_risk_level": risk_ctx["level_display"],
            "spread_risk_score": risk_ctx["score"],
            "spread_risk_explanation": risk_ctx["summary"],
            "spread_risk_factors": [
                f"{k}: {v['input']} (score {v['score']}/{v['max']})"
                for k, v in risk_ctx.get("breakdown", {}).items()
                if v.get('score', 0) > 0
            ],
            "risk_breakdown": risk_ctx.get("breakdown", {}),
            "risk_disclaimer": risk_ctx.get("disclaimer", ""),
            "weather": weather_ctx,

            # IPM Guidance (cultural → biological → chemical)
            "ipm_guidance": ipm_guidance,

            # Disease Forecast & Irrigation
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

            # Pipeline status
            "needs_expert_review": scan.needs_expert_review,
            "priority": scan.priority,
            "followup": followup_data,
            "referral": referral_data,

            # Summary for Agronomist
            "summary": {
                "headline": f"{pred_res['crop_name']} — {pred_res['disease_name']}",
                "text": f"Diagnosis confirmed {pred_res['disease_name']} at {pred_res['confidence_percent']} confidence. Combined risk score: {risk_ctx['score']}/100 ({risk_ctx['level_display']}). Review recommended treatment actions.",
                "priority": "High Priority" if risk_ctx["level"] in ("high", "critical") else "Normal Priority",
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
@permission_classes([IsAuthenticated])
def disease_history(request):
    """GET /api/disease/history/?farm_id=<id>"""
    farm_id = request.query_params.get('farm_id')
    user = request.user
    user_role = getattr(user, 'role', 'farmer')

    if user_role == 'farmer':
        qs = DiseaseScan.objects.filter(user=user)
    else:
        qs = DiseaseScan.objects.all()

    if farm_id:
        qs = qs.filter(farm_id=farm_id)
    ser = DiseaseScanSerializer(qs, many=True, context={'request': request})
    return Response(ser.data)
