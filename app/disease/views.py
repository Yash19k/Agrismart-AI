import os
import logging
from datetime import timedelta
from PIL import Image

from django.utils import timezone
from django.conf import settings
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

# Configurable max upload size (default: 8 MB)
MAX_IMAGE_SIZE_BYTES = getattr(settings, 'MAX_DISEASE_IMAGE_SIZE_BYTES', 8 * 1024 * 1024)
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
SAFETY_CONFIDENCE_THRESHOLD = float(getattr(settings, 'SAFETY_CONFIDENCE_THRESHOLD', 0.80))

SUPPORTED_MODEL_CROPS = {
    "apple", "blueberry", "cherry", "corn", "corn (maize)", "grape", "orange",
    "peach", "pepper", "bell pepper", "potato", "raspberry", "soybean", "squash",
    "strawberry", "tomato"
}


class DiseasePredictView(APIView):
    """
    POST /api/disease/predict/

    Canonical Pipeline Endpoint:
    1. Validates extension, size (<8MB), and image decodability.
    2. ConvNeXt-Tiny inference with uncalibrated softmax confidence and dynamic classes.
    3. Multi-factor risk engine (weather + crop stage + pest history + local incidence).
    4. IPM guidance (monitoring → cultural → mechanical → biological → chemical gated).
    5. Safety Gate 2.1: chemical withheld if confidence < 0.80 or crop mismatch/unsupported.
    6. Auto-queue to expert review if safety gate triggers or risk is high/critical.
    7. Auto-referral recommendation if diagnosis uncertain or risk critical.
    8. Auto-schedule follow-up monitoring.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ser = DiseasePredictSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        crop_type = ser.validated_data.get('crop_type', 'Unknown')
        farm_id = ser.validated_data.get('farm_id')
        leaf_extent = ser.validated_data.get('leaf_extent', 'unknown')
        image = ser.validated_data.get('image')

        # ── 0. Strict Image & Contract Validation ─────────────────────────────
        # Size validation
        if image.size > MAX_IMAGE_SIZE_BYTES:
            max_mb = MAX_IMAGE_SIZE_BYTES // (1024 * 1024)
            return Response(
                {
                    "error": "FILE_TOO_LARGE",
                    "message": f"Image file size ({image.size / (1024*1024):.1f} MB) exceeds maximum allowed size of {max_mb} MB.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Extension validation
        ext = os.path.splitext(image.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            return Response(
                {
                    "error": "INVALID_IMAGE_FORMAT",
                    "message": f"File extension '{ext}' is not supported. Please upload JPG, PNG, or WEBP.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Real image decode validation
        try:
            pil_img = Image.open(image)
            pil_img.verify()
            image.seek(0)
        except Exception as e:
            return Response(
                {
                    "error": "CORRUPT_IMAGE",
                    "message": "Uploaded file is corrupted or not a valid image file.",
                    "details": str(e),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            farmer_leaf_extent=leaf_extent,
            model_status='pending',
        )

        # ── 1. ConvNeXt-Tiny Model Inference ──────────────────────────────────
        try:
            model_service = get_disease_model_service()
            pred_res = model_service.predict(scan.image.path, farmer_leaf_extent=leaf_extent)
        except (RuntimeError, FileNotFoundError) as e:
            err_msg = str(e)
            if "Git LFS" in err_msg or "Weights not downloaded" in err_msg or "checkpoint not found" in err_msg:
                logger.error("ConvNeXt-Tiny weights unavailable: %s", e)
                scan.model_status = 'error'
                scan.notes = err_msg
                scan.save()
                return Response(
                    {
                        "error": "MODEL_UNAVAILABLE",
                        "message": "Model weights are not downloaded or are Git LFS pointers. Run 'git lfs pull', or download from GitHub release and verify sha256.",
                        "details": err_msg,
                    },
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )
            logger.exception("ConvNeXt-Tiny inference failed: %s", e)
            scan.model_status = 'error'
            scan.notes = err_msg
            scan.save()
            return Response(
                {
                    "error": "INFERENCE_FAILED",
                    "message": "We could not process this image. Please upload a clear photo of the crop leaf.",
                    "details": err_msg,
                    "model_status": "error",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            logger.exception("ConvNeXt-Tiny unexpected error: %s", e)
            scan.model_status = 'error'
            scan.notes = str(e)
            scan.save()
            return Response(
                {
                    "error": "INFERENCE_FAILED",
                    "message": "An unexpected error occurred during leaf analysis.",
                    "details": str(e),
                    "model_status": "error",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Update scan with real model predictions (immutable once set)
        scan.predicted_class = pred_res["predicted_class"]
        scan.confidence = pred_res["confidence"]
        scan.severity = pred_res["typical_severity"].lower()
        scan.farmer_leaf_extent = leaf_extent
        scan.is_healthy = pred_res["is_healthy"]
        scan.crop_type = pred_res["crop_name"]
        scan.plant_name = pred_res["crop_name"]
        scan.disease_name = pred_res["disease_name"]
        scan.model_status = 'ready'

        # ── 2. Crop Mismatch & Support Check ──────────────────────────────────
        farm_crop = getattr(farm, 'crop_name', None) or getattr(farm, 'crop', None) or crop_type
        crop_mismatch = False
        unsupported_crop = False
        if farm_crop and farm_crop.lower() not in ("unknown", ""):
            fc_clean = farm_crop.lower().strip()
            pred_crop_clean = pred_res["crop_name"].lower().strip()
            # Check if farm crop is in supported list
            if not any(sup in fc_clean for sup in SUPPORTED_MODEL_CROPS):
                unsupported_crop = True
            elif fc_clean not in pred_crop_clean and pred_crop_clean not in fc_clean:
                crop_mismatch = True

        # ── 3. Multi-Factor Risk Engine ───────────────────────────────────────
        weather_ctx = get_current_weather(farm)
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

        # Local incidence from hotspots
        local_incidence_count = 0
        try:
            if farm and farm.latitude and farm.longitude:
                from hotspots.services import get_local_incidence
                local_incidence_count = get_local_incidence(farm.latitude, farm.longitude)
        except Exception:
            pass

        risk_ctx = calculate_risk(
            crop_stage=crop_stage,
            humidity=weather_ctx.get('humidity', 60.0),
            temperature=weather_ctx.get('temperature', 25.0),
            rainfall_prob=weather_ctx.get('rain_probability', 20.0),
            disease_confidence=pred_res["confidence"] if not pred_res["is_healthy"] else 0.0,
            disease_severity=pred_res["typical_severity"].lower() if not pred_res["is_healthy"] else 'none',
            is_healthy=pred_res["is_healthy"],
            pest_count=pest_count,
            local_incidence_count=local_incidence_count,
            farmer_leaf_extent=leaf_extent,
        )

        # ── 4. Safety Gate 2.1 & Review Routing ───────────────────────────────
        # Chemical advice safety gate condition
        safety_gate_passed = (
            pred_res["is_healthy"] or
            (
                pred_res["confidence"] >= SAFETY_CONFIDENCE_THRESHOLD
                and not crop_mismatch
                and not unsupported_crop
            )
        )

        # Auto-flagging rules for expert review queue
        needs_review = False
        review_priority = 'normal'
        uncertainty_reason = None

        if not pred_res["is_healthy"]:
            if unsupported_crop:
                needs_review = True
                review_priority = 'urgent'
                uncertainty_reason = f"Crop '{farm_crop}' is not supported by the vision model. Sent for expert diagnosis."
            elif crop_mismatch:
                needs_review = True
                review_priority = 'urgent'
                uncertainty_reason = f"Predicted crop ({pred_res['crop_name']}) does not match farm crop ({farm_crop})."
            elif pred_res["confidence"] < SAFETY_CONFIDENCE_THRESHOLD:
                needs_review = True
                review_priority = 'normal'
                uncertainty_reason = "Diagnosis uncertain. Do not spray. Get an expert review."
            elif risk_ctx["level"] in ("high", "critical"):
                needs_review = True
                review_priority = 'urgent' if risk_ctx["level"] == "critical" else 'normal'

        scan.needs_expert_review = needs_review
        scan.priority = review_priority

        # ── 5. IPM Guidance (Tiered & Safety-Gated) ───────────────────────────
        ipm_guidance = get_ipm_guidance(
            disease_name=pred_res["disease_name"],
            risk_level=risk_ctx["level"],
            safety_gate_passed=safety_gate_passed,
            is_expert_confirmed=False,
            crop_mismatch=crop_mismatch,
            unsupported_crop=unsupported_crop,
        )

        # ── 6. 7-Day Risk Forecast ───────────────────────────────────────────
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
            disease_severity=pred_res["typical_severity"].lower() if not pred_res["is_healthy"] else 'none',
            is_healthy=pred_res["is_healthy"],
            daily_weather_forecast=daily_weather_forecast,
            current_weather=weather_ctx,
        )

        # ── 7. Follow-up & Referral Orchestration ─────────────────────────────
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

        # Referral trigger (recommended if critical risk, low confidence, or crop mismatch)
        referral_data = None
        if needs_review or risk_ctx["level"] == "critical":
            scan.referral_recommended = True
            try:
                from referral.kvk_directory import lookup_nearest_kvk
                kvk = lookup_nearest_kvk(
                    district=getattr(farm, 'location_name', '') if farm else '',
                    latitude=farm.latitude if farm else None,
                    longitude=farm.longitude if farm else None,
                )
                referral_data = {
                    'recommended': True,
                    'reason': uncertainty_reason or "Elevated risk profile; agronomist consultation advised.",
                    'contact_type': 'KVK',
                    'kvk_name': kvk.get('name', ''),
                    'kvk_contact': kvk.get('contact', ''),
                    'kvk_district': kvk.get('district', ''),
                    'kvk_note': kvk.get('note', ''),
                    'directory_notice': "Demo/static directory, verify contact before use.",
                }
            except Exception as e:
                logger.warning("Referral lookup failed: %s", e)

        scan.save()

        # Notify expert/officer if flagged
        try:
            if scan.needs_expert_review:
                from alerts.models import Alert
                from accounts.models import User as AuthUser
                from hotspots.services import haversine_km

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
                                message=f"Review required: {pred_res['disease_name']} on {pred_res['crop_name']} ({pred_res['confidence_percent']} uncalibrated confidence). Farm: {farm.farm_name if farm else 'Unknown'}.",
                            )
                    else:
                        Alert.objects.create(
                            recipient=staff,
                            alert_type='expert_review_needed',
                            related_scan=scan,
                            message=f"Review required: {pred_res['disease_name']} on {pred_res['crop_name']} ({pred_res['confidence_percent']} uncalibrated confidence).",
                        )
        except Exception as e:
            logger.warning("Expert alert creation failed: %s", e)

        image_url = request.build_absolute_uri(scan.image.url) if scan.image else None
        file_size_kb = f"{scan.image.size / 1024:.1f} KB" if scan.image else "Unknown"

        cultural_recs = pred_res.get("cultural_practices", [])
        action_timeline = {
            "today": [cultural_recs[0]] if len(cultural_recs) > 0 else ["Isolate affected crop foliage."],
            "next24Hours": [cultural_recs[1]] if len(cultural_recs) > 1 else ["Inspect adjacent rows for early symptom onset."],
            "next3Days": [cultural_recs[2]] if len(cultural_recs) > 2 else ["Monitor humidity and re-examine leaf undersides."],
            "nextWeek": ["Reassess foliage regeneration and complete follow-up recheck."],
        }

        response_data = {
            "id": scan.id,
            "image_url": image_url,
            "file_name": os.path.basename(scan.image.name) if scan.image else "leaf.jpg",
            "file_size": file_size_kb,
            "created_at": scan.created_at.strftime("Today, %I:%M %p"),

            # Model Output
            "crop_name": pred_res["crop_name"],
            "scientific_crop": pred_res.get("scientific_name") or pred_res["crop_name"],
            "predicted_class": pred_res["predicted_class"],
            "disease_name": pred_res["disease_name"],
            "pathogen": pred_res["pathogen"],
            "confidence": pred_res["confidence"],
            "confidence_percent": pred_res["confidence_percent"],
            "confidence_label": "model confidence (uncalibrated)",
            "is_healthy": pred_res["is_healthy"],
            "status": "Healthy Foliage" if pred_res["is_healthy"] else "Disease Detected",
            "final_diagnosis": scan.final_diagnosis,
            "is_verified": scan.is_verified,

            # Crop Health & Severity (Honest reporting: reference + farmer extent)
            "typical_severity": pred_res["typical_severity"],
            "farmer_leaf_extent": pred_res["farmer_leaf_extent"],
            "health_score": pred_res["health_score"],
            "health_status": "Optimal Health" if pred_res["is_healthy"] else f"Typical Severity: {pred_res['typical_severity']}",
            "health_explanation": "Foliage exhibits intact surface cuticle barrier." if pred_res["is_healthy"] else f"Typical disease severity is {pred_res['typical_severity']}. Farmer reported {leaf_extent} leaves affected.",

            # Biology Reference
            "category": pred_res["category"],
            "scientific_name": pred_res["scientific_name"],
            "symptoms": pred_res["symptoms"],
            "possible_causes": pred_res["possible_causes"],
            "cultural_practices": pred_res["cultural_practices"],

            # Spread Risk
            "spread_risk_level": risk_ctx["level_display"],
            "spread_risk_score": risk_ctx["score"],
            "spread_risk_explanation": risk_ctx["summary"],
            "risk_breakdown": risk_ctx.get("breakdown", {}),
            "risk_disclaimer": risk_ctx.get("disclaimer", ""),
            "weather": weather_ctx,

            # Safety Gate & IPM
            "safety_gate_passed": safety_gate_passed,
            "safety_notice": (
                "Diagnosis uncertain. Do not spray. Get an expert review."
                if not safety_gate_passed and not pred_res["is_healthy"]
                else None
            ),
            "crop_mismatch": crop_mismatch,
            "unsupported_crop": unsupported_crop,
            "ipm_guidance": ipm_guidance,

            # Forecast & Irrigation
            "disease_forecast": disease_forecast,
            "irrigation": {
                "recommendation": "Root-Zone Drip Watering" if not pred_res["is_healthy"] else "Regular Irrigation",
                "action_type": "delay" if weather_ctx.get("rain_probability", 0) > 60 else "regular",
                "method": "Targeted Drip Line",
                "explanation": "Avoid overhead spray to keep leaf surfaces dry and stop fungal spore splash.",
                "caution": "Do not wet canopy during high humidity periods.",
            },
            "action_timeline": action_timeline,

            # Pipeline Orchestration
            "needs_expert_review": scan.needs_expert_review,
            "priority": scan.priority,
            "followup": followup_data,
            "referral": referral_data,

            # Model Transparency
            "model_status": "ready",
            "model_metrics": pred_res["model_metadata"],
            "confidence_breakdown": pred_res["alternatives"],
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
        if farm_id:
            qs = qs.filter(farm_id=farm_id, farm__user=user)
    else:
        qs = DiseaseScan.objects.all()
        if farm_id:
            qs = qs.filter(farm_id=farm_id)

    ser = DiseaseScanSerializer(qs, many=True, context={'request': request})
    return Response(ser.data)
