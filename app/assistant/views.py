"""
AgriSmart Assistant API Views.
POST /api/assistant/chat/
GET  /api/assistant/context/
POST /api/assistant/clear-context/
POST /api/assistant/brief/
GET  /api/assistant/suggested/
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from farms.models import Farm
from .agent.agent import AgriSmartAgronomistAgent
from .agent.prompts import get_dynamic_suggested_questions

logger = logging.getLogger("assistant")
_agent_instance = None


def get_agent() -> AgriSmartAgronomistAgent:
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = AgriSmartAgronomistAgent()
    return _agent_instance


@api_view(["POST"])
@permission_classes([AllowAny])
def chat_view(request):
    """
    POST /api/assistant/chat/
    Body:
    {
        "message": "Should I irrigate today?",
        "session_id": "optional-session-id",
        "context": { ... },
        "clear_context": false,
        "allow_offline": false,
        "language": "en" | "gu" | "hi"
    }
    """
    data = request.data or {}
    message = (data.get("message") or "").strip()
    session_id = data.get("session_id")
    context = data.get("context") or {}
    language = data.get("language") or "en"
    clear_context = bool(data.get("clear_context", False))
    allow_offline = bool(data.get("allow_offline", False))
    farm_id = context.get("farm_id") or data.get("farm_id")

    if not message:
        return Response({"error": "Message is required."}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve user and farm if available
    user = request.user if request.user and request.user.is_authenticated else None
    farm = None
    if user:
        farm_qs = Farm.objects.filter(user=user)
        if farm_id:
            farm = farm_qs.filter(id=farm_id).first() or farm_qs.first()
        else:
            farm = farm_qs.first()
    elif farm_id:
        farm = Farm.objects.filter(id=farm_id).first()

    agent = get_agent()
    result = agent.process_message(
        message=message,
        session_id=session_id,
        provided_context=context if not clear_context else None,
        user=user,
        farm=farm,
        language=language,
        clear_context=clear_context,
        allow_offline=allow_offline,
    )

    return Response(result, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def context_view(request):
    """
    GET /api/assistant/context/?session_id=...
    Returns current active assessment context for Mode A vs Mode B detection.
    """
    session_id = request.query_params.get("session_id")
    user = request.user if request.user and request.user.is_authenticated else None
    farm = None
    if user:
        farm = Farm.objects.filter(user=user).first()

    agent = get_agent()
    ctx = agent.get_session_active_context(session_id=session_id, user=user, farm=farm)
    return Response(ctx, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def clear_context_view(request):
    """
    POST /api/assistant/clear-context/
    Body: { "session_id": "..." }
    Clears disease/crop context to switch session to Mode A (General Farm Assistant).
    """
    data = request.data or {}
    session_id = data.get("session_id") or "default"
    from .agent.state import clear_session_context
    clear_session_context(session_id)
    return Response({
        "cleared": True,
        "mode": "Mode A — General Farm Assistant",
        "session_id": session_id,
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([AllowAny])
def farm_brief_view(request):
    """
    POST /api/assistant/brief/
    Returns proactive Today's Farm Brief based on active crop, disease, and weather context.
    """
    data = request.data or {}
    context = data.get("context") or {}
    language = data.get("language") or "en"
    farm_id = context.get("farm_id") or data.get("farm_id")

    user = request.user if request.user and request.user.is_authenticated else None
    farm = None
    if user:
        farm_qs = Farm.objects.filter(user=user)
        farm = farm_qs.filter(id=farm_id).first() if farm_id else farm_qs.first()

    agent = get_agent()
    brief = agent.generate_today_brief(
        provided_context=context,
        user=user,
        farm=farm,
        language=language,
    )

    return Response(brief, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def suggested_questions_view(request):
    """
    GET /api/assistant/suggested/?crop=Tomato&disease=Early+Blight&risk=High&lang=en
    """
    crop = request.query_params.get("crop", "Tomato")
    disease = request.query_params.get("disease", "Early Blight")
    risk = request.query_params.get("risk", "High")
    lang = request.query_params.get("lang", "en")
    is_healthy = request.query_params.get("healthy", "false").lower() == "true"

    questions = get_dynamic_suggested_questions(
        crop=crop,
        disease=disease,
        is_healthy=is_healthy,
        risk_level=risk,
        language=lang,
    )

    return Response({"suggested_questions": questions}, status=status.HTTP_200_OK)
