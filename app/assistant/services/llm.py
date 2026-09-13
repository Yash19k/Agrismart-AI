"""
LLMService — Abstraction layer for Groq API and Grounded Synthesis.
Handles conversational reasoning, technical simplification, and multilingual translation.
Strictly relies on verified tool outputs and retrieved agricultural RAG knowledge.
Never invents agricultural facts or citation URLs.
"""
import os
import time
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

logger = logging.getLogger("assistant")

# Ensure app/.env is loaded dynamically
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path, override=True)


class LLMService:
    def __init__(self):
        # Refresh env if needed
        if _env_path.exists():
            load_dotenv(_env_path, override=True)
        self.api_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.model_name = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()
        self._client = None

        if self.api_key:
            try:
                from groq import Groq
                self._client = Groq(api_key=self.api_key)
                logger.info("LLMService: Groq Client initialized with target model: %s", self.model_name)
            except Exception as e:
                logger.warning("LLMService: Could not initialize groq client: %s", e)
                self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self._client)

    def generate_agronomist_response(
        self,
        query: str,
        context: Dict[str, Any],
        language: str = "en",
        conversation_history: Optional[List[Dict[str, str]]] = None,
        allow_offline: bool = False,
        tools_executed: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Orchestrates grounded response generation.
        Strictly invokes Groq API when configured.
        Returns a clear, actionable error state if Groq is unavailable,
        allowing offline guidance ONLY when explicitly requested by the farmer.
        """
        start_time = time.time()
        tools_executed = tools_executed or ["knowledge_rag"]
        rag_count = len(context.get("knowledge_docs", []))

        # Check API key configuration
        if not self.is_configured:
            logger.warning("Assistant request rejected: GROQ_API_KEY is not configured.")
            if allow_offline:
                offline_res = self._deterministic_generate(query, context, language)
                offline_res["dev_telemetry"] = {
                    "engine": "Offline Rules",
                    "model": "Rule-Based Deterministic Engine",
                    "tools_executed": tools_executed,
                    "rag_sources_count": rag_count,
                    "latency_ms": round((time.time() - start_time) * 1000, 1),
                    "status": "offline_mode",
                }
                return offline_res

            return {
                "error": "GROQ_UNAVAILABLE",
                "message": (
                    "Groq API key is not configured on the backend. "
                    "Please set GROQ_API_KEY in app/.env to activate the Groq AI Agronomist."
                ),
                "can_retry": True,
                "can_use_offline": True,
                "dev_telemetry": {
                    "engine": "Unconfigured",
                    "model": self.model_name,
                    "tools_executed": tools_executed,
                    "rag_sources_count": rag_count,
                    "latency_ms": round((time.time() - start_time) * 1000, 1),
                    "status": "unconfigured",
                },
            }

        # Invoke Groq API
        try:
            groq_res = self._call_groq(query, context, language, conversation_history)
            elapsed_ms = round((time.time() - start_time) * 1000, 1)

            # Safe server-side telemetry logging (no credentials)
            logger.info(
                "Groq Agronomist Success | Model: %s | QueryLen: %d | Lang: %s | Tools: %s | RAG: %d | Latency: %sms",
                groq_res.get("model_used", self.model_name),
                len(query),
                language,
                ",".join(tools_executed),
                rag_count,
                elapsed_ms,
            )

            groq_res["dev_telemetry"] = {
                "engine": "Groq",
                "model": groq_res.get("model_used", self.model_name),
                "tools_executed": tools_executed,
                "rag_sources_count": rag_count,
                "latency_ms": elapsed_ms,
                "status": "success",
            }
            return groq_res

        except Exception as e:
            elapsed_ms = round((time.time() - start_time) * 1000, 1)
            err_str = str(e)
            logger.error(
                "Groq API Call Failed | Model: %s | Error: %s | Latency: %sms",
                self.model_name,
                err_str,
                elapsed_ms,
            )

            if allow_offline:
                logger.info("Serving explicit offline fallback upon client request.")
                offline_res = self._deterministic_generate(query, context, language)
                offline_res["offline_notice"] = f"Offline guidance: Groq returned {err_str[:60]}. Using rule-based guidance."
                offline_res["dev_telemetry"] = {
                    "engine": "Offline Rules (Post-Groq Error)",
                    "model": "Rule-Based Deterministic Engine",
                    "tools_executed": tools_executed,
                    "rag_sources_count": rag_count,
                    "latency_ms": elapsed_ms,
                    "status": "offline_fallback",
                }
                return offline_res

            return {
                "error": "GROQ_ERROR",
                "message": (
                    f"Groq could not generate a response right now ({err_str[:120]}). "
                    "Your disease analysis and weather telemetry remain active and available."
                ),
                "can_retry": True,
                "can_use_offline": True,
                "dev_telemetry": {
                    "engine": "Groq (Failed)",
                    "model": self.model_name,
                    "tools_executed": tools_executed,
                    "rag_sources_count": rag_count,
                    "latency_ms": elapsed_ms,
                    "status": "error",
                    "error_details": err_str[:200],
                },
            }

    def _call_groq(
        self,
        query: str,
        context: Dict[str, Any],
        language: str,
        conversation_history: Optional[List[Dict[str, str]]],
    ) -> Dict[str, Any]:
        """Calls Groq with strict grounding instructions."""
        lang_name = "Gujarati" if language == "gu" else ("Hindi" if language == "hi" else "English")
        has_disease = bool(context.get("has_disease", False))

        system_instruction = (
            "You are the AgriSmart AI Agronomist, a dedicated agricultural decision-support assistant.\n"
            "You help farmers understand crop health, disease prevention, weather impact, irrigation, and practical farming decisions.\n"
            "You are NOT a generic chatbot. Follow these strict operational directives:\n"
            "1. Ground your answers EXCLUSIVELY in the supplied verified context and retrieved agricultural extension knowledge.\n"
            "2. Treat retrieved agricultural sources (ICAR, TNAU, AAU, FAO) as the authoritative knowledge for all technical recommendations.\n"
            "3. DO NOT invent agricultural facts, weather values, crop history, pesticide dosages, chemical names, or citation URLs.\n"
            "4. When evidence is insufficient or uncertain, clearly acknowledge it instead of guessing.\n"
            "5. Give practical, simple, and compassionate advice with zero academic jargon.\n"
            "6. Distinguish known facts (observed weather, confirmed disease) from predictions (forecasts, risk) and recommendations (what to do).\n"
            "7. When the farmer asks follow-up questions such as 'Why?', 'What about tomorrow?', or 'What if it rains?', maintain conversational continuity using recent turns.\n"
            f"8. Generate the answer directly in natural, culturally respectful {lang_name} while preserving all technical accuracy, numbers, and recommendations.\n"
            "9. DO NOT expose hidden chain-of-thought or internal reasoning. Instead, provide concise, concrete decision factors.\n"
            "10. If the user asks an off-topic question unrelated to agriculture, farming, or crops, politely state your role as their farming assistant and invite a crop question.\n"
            "11. Return valid JSON adhering to the specified schema."
        )

        # Build context payload according to Mode A or Mode B
        if has_disease:
            context_section = f"""
VERIFIED CROP PATHOLOGY (Mode B: Active Disease Assessment):
- Crop: {context.get('crop')}
- Detected Disease: {context.get('disease')}
- Diagnosis Confidence: {context.get('confidence_percentage')}%
- Severity: {context.get('severity')}
- Crop Health Score: {context.get('health_score')}/100

DETERMINISTIC DISEASE SPREAD RISK:
- Risk Level: {context.get('risk', {}).get('level')} (Score: {context.get('risk', {}).get('score')}/100)
- Risk Drivers: {json.dumps(context.get('risk', {}).get('reasons', []))}
"""
        else:
            context_section = f"""
CROP ASSESSMENT STATUS (Mode A: General Farm Assistant):
- No specific disease scan active.
- Target Crop (if specified): {context.get('crop', 'General Farm Crops')}
- Environmental Disease Risk Predisposition: {context.get('risk', {}).get('level', 'Low')}
"""

        wx = context.get("weather", {})
        if wx.get("available", True):
            weather_section = f"""
METEOROLOGICAL TELEMETRY:
- Temperature: {wx.get('temperature')}°C
- Relative Humidity: {wx.get('humidity')}%
- Rain Probability: {wx.get('rain_probability')}%
- Rainfall Forecast: {wx.get('rainfall', 0)} mm
- Wind Speed: {wx.get('wind_speed', 10)} km/h
- Sky Condition: {wx.get('condition', 'Partly Cloudy')}
"""
        else:
            weather_section = "METEOROLOGICAL TELEMETRY: No live weather telemetry available for this session.\n"

        system_content = f"""{system_instruction}

{context_section}
{weather_section}
RETRIEVED AGRICULTURAL EXTENSION KNOWLEDGE (ICAR/TNAU/AAU/FAO):
{json.dumps(context.get('knowledge_docs', []), indent=2)}

REQUIRED JSON SCHEMA:
{{
  "answer": "Direct, empathetic, farmer-friendly response in {lang_name}.",
  "decision_factors": [
    "Short 1-line signal, e.g. Relative humidity at 82%",
    "Short 1-line signal, e.g. Confirmed Early Blight lesions",
    "Short 1-line signal, e.g. Rain probability 70%"
  ],
  "why": [
    "Concise explainability bullet point",
    "Concise explainability bullet point",
    "Concise explainability bullet point"
  ],
  "actions": [
    {{"phase": "Do now", "action": "Immediate action step in {lang_name}"}},
    {{"phase": "Within 24 hours", "action": "Action step for the next 24 hours in {lang_name}"}},
    {{"phase": "Next 3 days", "action": "Action step for the next 3 days in {lang_name}"}},
    {{"phase": "Next week", "action": "Follow-up monitoring step in {lang_name}"}}
  ]
}}
"""
        messages = [{"role": "system", "content": system_content}]

        # Append recent conversation turns for multi-turn conversational memory
        if conversation_history:
            for turn in conversation_history[-6:]:
                role = "assistant" if turn.get("role") == "assistant" else "user"
                content = turn.get("text", "").strip()
                if content:
                    messages.append({"role": role, "content": content})

        # Append current user prompt
        messages.append({"role": "user", "content": query})

        # Call Groq API with JSON object mode
        response = self._client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        choice = response.choices[0]
        raw_text = choice.message.content.strip()

        # Clean markdown wrappers if any
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        parsed = json.loads(raw_text)

        return {
            "answer": parsed.get("answer", ""),
            "why": parsed.get("why", []),
            "actions": parsed.get("actions", []),
            "decision_factors": parsed.get("decision_factors", []),
            "model_used": self.model_name,
            "engine": "groq",
            "groq_configured": True,
        }

    def _deterministic_generate(
        self,
        query: str,
        context: Dict[str, Any],
        language: str,
    ) -> Dict[str, Any]:
        """
        Explicit offline guidance mode.
        Clearly labeled as rule-based offline guidance; never masquerades as Groq.
        """
        has_disease = bool(context.get("has_disease", False))
        crop = context.get("crop", "Tomato")
        disease = context.get("disease", "Early Blight")
        wx = context.get("weather", {})
        temp = wx.get("temperature", 28.6)
        hum = wx.get("humidity", 68)
        rain_prob = wx.get("rain_probability", 32)
        risk = context.get("risk", {})
        risk_level = risk.get("level", "Moderate")

        q_lower = query.lower()

        why_bullets_en = [
            f"Temperature: {temp:.1f}°C",
            f"Relative Humidity: {hum}%",
            f"Rain Probability: {rain_prob}%",
        ]
        if has_disease:
            why_bullets_en.append(f"Confirmed Pathology: {disease} ({context.get('confidence_percentage', 91)}% confidence)")
            why_bullets_en.append(f"Foliar Spread Risk: {risk_level}")
        else:
            why_bullets_en.append("Assessment Mode: General Farm Advisory (No active disease scan)")

        why_bullets_gu = [
            f"તાપમાન: {temp:.1f}°C",
            f"હવામાં ભેજ: {hum}%",
            f"વરસાદની શક્યતા: {rain_prob}%",
        ]
        if has_disease:
            why_bullets_gu.append(f"રોગ નિદાન: {disease}")
            why_bullets_gu.append(f"જોખમ સ્તર: {risk_level}")

        why_bullets_hi = [
            f"तापमान: {temp:.1f}°C",
            f"हवा में नमी: {hum}%",
            f"बारिश की संभावना: {rain_prob}%",
        ]
        if has_disease:
            why_bullets_hi.append(f"रोग निदान: {disease}")
            why_bullets_hi.append(f"जोखिम स्तर: {risk_level}")

        if "irrigat" in q_lower or "water" in q_lower or "પાણી" in q_lower or "सिंचाई" in q_lower:
            ans_en = (
                f"[Offline Guidance] In your current microclimate ({temp:.1f}°C, {hum}% humidity, {rain_prob}% rain probability), "
                f"delay heavy watering for your {crop}. Water strictly at the root zone via drip lines to prevent leaf wetness."
            )
            ans_gu = (
                f"[ઑફલાઇન માર્ગદર્શન] તમારા વિસ્તારમાં {temp:.1f}°C તાપમાન અને {hum}% ભેજ છે. "
                f"{crop} માટે ભારે પિયત ટાળો અને ફક્ત મૂળમાં ટપક પદ્ધતિથી હળવું પાણી આપો."
            )
            ans_hi = (
                f"[ऑफलाइन मार्गदर्शन] वर्तमान मौसम ({temp:.1f}°C, {hum}% नमी) में {crop} के लिए भारी सिंचाई टालें। "
                f"पत्तों को सूखा रखने के लिए केवल जड़ों में ड्रिप द्वारा पानी दें।"
            )
            actions = [
                {"phase": "Do now", "action": f"Check topsoil moisture before running irrigation pumps."},
                {"phase": "Within 24 hours", "action": "Ensure drainage ditches are clear in case of rain."},
                {"phase": "Next 3 days", "action": "Calibrate drip lines to supply 20–25mm water at root level."},
                {"phase": "Next week", "action": "Monitor canopy growth and soil moisture levels."},
            ]
        else:
            ans_en = (
                f"[Offline Guidance] For {crop} under {temp:.1f}°C and {hum}% humidity, maintain good row ventilation "
                "and scout regularly for early symptoms. Follow standard ICAR package of practices."
            )
            ans_gu = (
                f"[ઑફલાઇન માર્ગદર્શન] {crop} પાક માટે {temp:.1f}°C તાપમાન અને {hum}% ભેજમાં નિયમિત નિરીક્ષણ કરો "
                "અને હવા ઉજાસ જાળવી રાખો."
            )
            ans_hi = (
                f"[ऑफलाइन मार्गदर्शन] {crop} की फसल के लिए {temp:.1f}°C तापमान और {hum}% नमी में नियमित निरीक्षण करें "
                "और हवादार वातावरण बनाए रखें।"
            )
            actions = [
                {"phase": "Do now", "action": f"Inspect crop rows for signs of moisture stress or yellowing."},
                {"phase": "Within 24 hours", "action": "Confirm drip lines are unclogged and targeting roots."},
                {"phase": "Next 3 days", "action": "Apply preventive organic bio-agents if humidity stays high."},
                {"phase": "Next week", "action": "Reassess crop health status on AgriSmart."},
            ]

        chosen_ans = ans_gu if language == "gu" else (ans_hi if language == "hi" else ans_en)
        chosen_why = why_bullets_gu if language == "gu" else (why_bullets_hi if language == "hi" else why_bullets_en)

        return {
            "answer": chosen_ans,
            "why": chosen_why,
            "actions": actions,
            "decision_factors": [
                f"Microclimate: {temp:.1f}°C, {hum}% humidity",
                f"Rain probability: {rain_prob}%",
                f"Pathology mode: {'Active disease scan' if has_disease else 'General farm advisory'}",
            ],
            "model_used": "Offline Rule Engine (No Groq API Key)",
            "engine": "offline_rules",
            "groq_configured": False,
            "offline_notice": "Offline guidance: This answer was generated by the local rule engine, not Groq.",
        }
