"""
AgriSmart Agronomist Agent.
Master orchestrator combining:
- Mode A (General Farm Assistant) & Mode B (Context-Aware Disease Assistant)
- Crop disease context (Tool 1)
- Live weather telemetry (Tool 2)
- Deterministic disease risk engine (Tool 3)
- RAG knowledge retrieval with source metadata (Tool 4)
- Crop history tracking (Tool 5)
- Groq API (openai/gpt-oss-120b) LLM reasoning and multilingual generation
"""
import logging
from typing import Dict, Any, Optional, List

from .tools.disease import get_crop_disease_context
from .tools.weather import get_current_weather
from .tools.risk import calculate_disease_risk
from .tools.knowledge import search_knowledge_tool
from .tools.history import get_crop_history
from .state import (
    get_or_create_session,
    append_message,
    get_conversation_history,
    update_session_context,
    get_last_context,
    clear_session_context,
)
from .prompts import (
    is_non_agricultural_query,
    get_domain_rejection_response,
    get_dynamic_suggested_questions,
)
from assistant.services.llm import LLMService
from assistant.services.citations import format_citations

logger = logging.getLogger("assistant")


class AgriSmartAgronomistAgent:
    def __init__(self):
        self.llm_service = LLMService()

    def process_message(
        self,
        message: str,
        session_id: Optional[str] = None,
        provided_context: Optional[Dict[str, Any]] = None,
        user=None,
        farm=None,
        language: str = "en",
        clear_context: bool = False,
        allow_offline: bool = False,
    ) -> Dict[str, Any]:
        """
        Main execution pipeline for farmer questions.
        Supports Mode A (General Farm Assistant) and Mode B (Context-Aware Disease Assistant).
        """
        query = (message or "").strip()
        lang = language if language in ("en", "gu", "hi") else "en"
        sid = session_id or "default"

        # 0. Handle clear context command (user clicked [Clear Context] to enter Mode A)
        if clear_context:
            clear_session_context(sid)

        # 1. Check off-topic domain boundaries
        if is_non_agricultural_query(query):
            rej = get_domain_rejection_response(lang)
            rej["session_id"] = sid
            return rej

        # 2. Session Context resolution (Handle follow-up questions like 'Why?' or 'What about tomorrow?')
        session = get_or_create_session(sid)
        last_ctx = {} if clear_context else get_last_context(sid)

        merged_ctx = dict(last_ctx)
        if provided_context:
            merged_ctx.update(provided_context)

        # 3. Tool Execution: Collect Grounded Evidence
        tools_executed: List[str] = []

        # Tool 1: Disease Context
        disease_ctx = get_crop_disease_context(user, farm, merged_ctx)
        has_disease = bool(disease_ctx.get("available", False))
        if has_disease:
            tools_executed.append("disease_tool")

        # Tool 2: Weather Context
        weather_ctx = get_current_weather(farm, merged_ctx)
        if weather_ctx.get("available", False):
            tools_executed.append("weather_tool")

        # Tool 3: Deterministic Disease Risk
        risk_ctx = calculate_disease_risk(disease_ctx, weather_ctx)
        tools_executed.append("risk_engine")

        # Tool 4: Knowledge RAG Retrieval
        crop_name = disease_ctx.get("crop") if has_disease else merged_ctx.get("crop", "")
        disease_name = disease_ctx.get("disease") if has_disease else ""
        knowledge_docs = search_knowledge_tool(
            query=query,
            crop=crop_name,
            disease=disease_name,
            top_k=3,
        )
        tools_executed.append("knowledge_rag")

        # Tool 5: Crop History
        if has_disease:
            history_ctx = get_crop_history(user, farm, disease_ctx.get("health_score"))
            if history_ctx.get("has_previous"):
                tools_executed.append("crop_history")
        else:
            history_ctx = {"available": False, "has_previous": False}

        # Construct unified grounded context packet
        agent_context = {
            "has_disease": has_disease,
            "crop": crop_name or "General Farm Crops",
            "disease": disease_name or "None",
            "confidence": disease_ctx.get("confidence"),
            "confidence_percentage": disease_ctx.get("confidence_percentage"),
            "severity": disease_ctx.get("severity"),
            "health_score": disease_ctx.get("health_score"),
            "is_healthy": disease_ctx.get("is_healthy", True),
            "assessment_id": disease_ctx.get("assessment_id"),
            "scan_date": disease_ctx.get("scan_date"),
            "weather": weather_ctx,
            "risk": risk_ctx,
            "knowledge_docs": knowledge_docs,
            "history": history_ctx,
        }

        # Save context to session for seamless follow-up turns (only if disease context exists)
        if has_disease:
            update_session_context(sid, agent_context)

        # 4. Generate Grounded Response via LLMService (Groq API)
        conv_history = get_conversation_history(sid)
        llm_output = self.llm_service.generate_agronomist_response(
            query=query,
            context=agent_context,
            language=lang,
            conversation_history=conv_history,
            allow_offline=allow_offline,
            tools_executed=tools_executed,
        )

        # Check for Groq error states (unconfigured or API failure)
        if "error" in llm_output:
            return {
                "error": llm_output["error"],
                "message": llm_output["message"],
                "can_retry": llm_output.get("can_retry", True),
                "can_use_offline": llm_output.get("can_use_offline", True),
                "session_id": sid,
                "has_disease": has_disease,
                "context_used": {
                    "crop": agent_context["crop"],
                    "disease": agent_context["disease"],
                    "has_disease": has_disease,
                    "risk_level": risk_ctx["level"],
                },
                "dev_telemetry": llm_output.get("dev_telemetry", {}),
            }

        # 5. Format & Verify Citations
        citations = format_citations(knowledge_docs, weather_ctx)

        # 6. Dynamic Suggested Questions
        suggested_questions = get_dynamic_suggested_questions(
            crop=agent_context["crop"],
            disease=agent_context["disease"],
            is_healthy=disease_ctx.get("is_healthy", True),
            risk_level=risk_ctx["level"],
            language=lang,
        )

        # 7. Record to conversation history
        append_message(sid, "user", query)
        append_message(sid, "assistant", llm_output["answer"], meta={"engine": llm_output.get("engine")})

        return {
            "answer": llm_output["answer"],
            "why": llm_output.get("why", []),
            "actions": llm_output.get("actions", []),
            "risk": {
                "level": risk_ctx["level"],
                "score": risk_ctx["score"],
                "active_segments": risk_ctx["active_segments"],
                "total_segments": 6,
                "reasons": risk_ctx["reasons"],
            },
            "citations": citations,
            "has_disease": has_disease,
            "context_used": {
                "crop": agent_context["crop"],
                "disease": agent_context["disease"],
                "confidence": agent_context["confidence_percentage"],
                "severity": agent_context["severity"],
                "health_score": agent_context["health_score"],
                "assessment_id": agent_context.get("assessment_id"),
                "scan_date": agent_context.get("scan_date"),
                "temperature": weather_ctx.get("temperature"),
                "humidity": weather_ctx.get("humidity"),
                "rain_probability": weather_ctx.get("rain_probability"),
                "risk_level": risk_ctx["level"],
                "model_engine": llm_output.get("engine", "groq"),
            },
            "decision_factors": llm_output.get("decision_factors", risk_ctx["reasons"]),
            "history_trend": history_ctx,
            "suggested_questions": suggested_questions,
            "session_id": sid,
            "language": lang,
            "engine": llm_output.get("engine", "groq"),
            "model_used": llm_output.get("model_used", self.llm_service.model_name),
            "offline_notice": llm_output.get("offline_notice"),
            "dev_telemetry": llm_output.get("dev_telemetry", {}),
        }

    def get_session_active_context(
        self,
        session_id: Optional[str] = None,
        user=None,
        farm=None,
    ) -> Dict[str, Any]:
        """
        Returns active context for the session or user.
        Used by GET /api/assistant/context/.
        """
        sid = session_id or "default"
        last_ctx = get_last_context(sid)

        disease_ctx = get_crop_disease_context(user, farm, last_ctx)
        has_disease = bool(disease_ctx.get("available", False))
        weather_ctx = get_current_weather(farm, last_ctx)
        risk_ctx = calculate_disease_risk(disease_ctx, weather_ctx)

        return {
            "has_disease": has_disease,
            "crop": disease_ctx.get("crop") if has_disease else None,
            "disease": disease_ctx.get("disease") if has_disease else None,
            "confidence": disease_ctx.get("confidence_percentage") if has_disease else None,
            "severity": disease_ctx.get("severity") if has_disease else None,
            "health_score": disease_ctx.get("health_score") if has_disease else None,
            "assessment_id": disease_ctx.get("assessment_id") if has_disease else None,
            "scan_date": disease_ctx.get("scan_date") if has_disease else None,
            "weather": weather_ctx,
            "risk": risk_ctx,
            "session_id": sid,
        }

    def generate_today_brief(
        self,
        provided_context: Optional[Dict[str, Any]] = None,
        user=None,
        farm=None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Generates today's farm brief (proactive summary).
        """
        disease_ctx = get_crop_disease_context(user, farm, provided_context)
        weather_ctx = get_current_weather(farm, provided_context)
        risk_ctx = calculate_disease_risk(disease_ctx, weather_ctx)

        has_disease = bool(disease_ctx.get("available", False))
        crop = disease_ctx.get("crop", "Your Farm Crops")
        disease = disease_ctx.get("disease", "No Disease")
        risk_level = risk_ctx.get("level", "Low")
        hum = weather_ctx.get("humidity", 65)
        rp = weather_ctx.get("rain_probability", 20)
        temp = weather_ctx.get("temperature", 28)

        if language == "gu":
            headline = "સુપ્રભાત! આજે તમારા ખેતરમાં આ બાબતો પર ધ્યાન આપવાની જરૂર છે."
            if has_disease:
                high_priority = f"{crop}માં {disease}નું જોખમ {risk_level} છે. હવામાં ભેજ {hum}% અને વરસાદની શક્યતા {rp}% છે. આજે મૂળમાં જ પાણી આપો અને રોગિષ્ટ પાંદડા કાપી લો."
            else:
                high_priority = f"તમારા વિસ્તારમાં હવામાં ભેજ {hum}% અને તાપમાન {temp}°C છે. પાકનું સામાન્ય નિરીક્ષણ કરો અને પિયતનું આયોજન કરો."
            watch = "નજીકના છોડના પાંદડા પર પીળા ધાબા કે ટપકાં દેખાય છે કે નહીં તે ચકાસો."
            later = "આવતીકાલે ફરીથી પાકની સ્થિતિનું મૂલ્યાંકન કરો."
        elif language == "hi":
            headline = "सुप्रभात! आज आपके खेत में इन बातों पर विशेष ध्यान देने की जरूरत है।"
            if has_disease:
                high_priority = f"{crop} में {disease} का जोखिम {risk_level} है। हवा में नमी {hum}% और बारिश की संभावना {rp}% है। आज सिंचाई सावधानी से करें।"
            else:
                high_priority = f"आपके क्षेत्र में हवा में नमी {hum}% और तापमान {temp}°C है। फसल का सामान्य निरीक्षण करें और सिंचाई का ध्यान रखें।"
            watch = "आसपास के पौधों की पत्तियों पर नए लक्षण दिखें तो तुरंत नोट करें।"
            later = "कल पुनः फसल सुधार की समीक्षा करें।"
        else:
            headline = "Good morning! Here's what needs your agricultural attention today."
            if has_disease:
                high_priority = f"{disease} spread risk is {risk_level.upper()} for your {crop}. Humidity is {hum}% and rain probability is {rp}%. Recommended: Avoid overhead wetting and prune infected leaves."
            else:
                high_priority = f"Conditions for your {crop} indicate {hum}% humidity and {temp}°C temperature. Microclimate risk is {risk_level}. Optimal conditions for field maintenance."
            watch = "Check canopy airflow and inspect leaf undersides for signs of moisture accumulation."
            later = "Review soil moisture levels before the next watering cycle."

        return {
            "headline": headline,
            "high_priority": high_priority,
            "watch": watch,
            "later": later,
            "has_disease": has_disease,
            "crop": crop,
            "disease": disease,
            "risk_level": risk_level,
            "temperature": temp,
            "humidity": hum,
            "rain_probability": rp,
            "language": language,
        }
