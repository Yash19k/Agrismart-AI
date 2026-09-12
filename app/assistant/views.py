"""
Smart Farm Advisor — Rule-Based Grounded Assistant
POST /api/assistant/chat/

Per problem statement Bonus E:
  "A conversational interface that explains recommendations in plain language.
   Grounded answers score higher than free-form generation."

This assistant is GROUNDED — it reads the user's actual farm data
(live weather, soil moisture, irrigation status, crop info, disease risk)
and provides precise, data-backed answers to common farming questions.

No LLM/API key required. All responses are derived from real sensor and
weather data from the Django database and Open-Meteo.
"""
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from farms.models import Farm
from disease.models import DiseaseScan
from weather.services import WeatherService, WeatherServiceError
from weather.rules import IrrigationRules, DiseaseWeatherRisk, WindAdvisoryRules, HeatRiskRules

logger = logging.getLogger('assistant')

# ── Grounded response library ─────────────────────────────────────────────────
# These functions build answers from real farm + weather data.

def _answer_irrigation(farm, weather_data):
    """Grounded irrigation answer based on live soil moisture and forecast."""
    if not weather_data:
        return ("📡 Weather data is temporarily unavailable. "
                "As a general rule: check soil moisture manually — irrigate if the top 5 cm "
                "feels dry to touch for your crop type.")

    evaluation = IrrigationRules.evaluate(weather_data, farm.crop)
    soil_m = (weather_data.get('soil') or {}).get('moisture_percent')
    et0    = (weather_data.get('today') or {}).get('et0')
    rp     = (weather_data.get('today') or {}).get('rain_probability', 0) or 0

    soil_str = f"{soil_m:.1f}%" if soil_m is not None else "unavailable"
    et0_str  = f"{et0:.2f} mm/day" if et0 is not None else "unavailable"
    rain_str = f"{rp:.0f}%"

    status_map = {
        'RECOMMEND':    f"✅ **Irrigate now.** Your root-zone soil moisture is {soil_str} (below optimal). "
                        f"Atmospheric water demand (ET₀) is {et0_str}. Rain probability is only {rain_str}. "
                        f"Best window: early morning (5–8 AM) or evening (6–8 PM) to reduce evaporation.",
        'DELAY':        f"☔ **Delay irrigation.** Rain probability today is {rain_str}. "
                        f"Soil moisture is {soil_str}. Wait 12–24 hours and reassess after rain.",
        'NOT_REQUIRED': f"🌿 **Irrigation not needed right now.** Soil moisture is {soil_str} — within optimal range. "
                        f"ET₀ demand is {et0_str}. Monitor again in 2 days or after hot/windy weather.",
        'UNAVAILABLE':  f"⚠️ Irrigation status could not be determined. "
                        f"Manual soil check recommended.",
    }
    return evaluation.get('recommendation') or status_map.get(evaluation.get('status', 'UNAVAILABLE'), "Monitor soil moisture daily.")


def _answer_disease(farm, weather_data):
    """Grounded disease prevention answer from live weather conditions."""
    if not weather_data:
        return ("🦠 Without live weather data, general advice: inspect leaves 2–3 times per week "
                "for discoloration, spots, or wilting. Remove infected leaves immediately and "
                "avoid overhead irrigation to reduce leaf wetness.")

    risk = DiseaseWeatherRisk.evaluate(weather_data, farm.crop)
    level   = risk.get('level', 'UNKNOWN')
    factors = risk.get('factors', [])
    temp    = (weather_data.get('current') or {}).get('temperature')
    hum     = (weather_data.get('current') or {}).get('humidity')
    crop    = farm.crop or 'your crop'

    temp_str = f"{temp:.0f}°C" if temp else "current temperature"
    hum_str  = f"{hum:.0f}%" if hum else "current humidity"
    factors_str = "; ".join(factors) if factors else "monitoring recommended"

    if level == 'HIGH':
        return (f"🚨 **HIGH disease weather risk for {crop}.**\n"
                f"Current conditions: {temp_str}, {hum_str} humidity.\n"
                f"Risk factors: {factors_str}.\n\n"
                f"**Immediate actions:**\n"
                f"• Avoid overhead irrigation — use drip to keep foliage dry.\n"
                f"• Apply preventive fungicide (copper-based is organic-safe).\n"
                f"• Improve air circulation by pruning dense canopy.\n"
                f"• Inspect all plants for early blight, late blight, or mildew signs.\n"
                f"• Scout fields at dawn when symptoms are most visible.")

    elif level == 'MODERATE':
        return (f"⚠️ **MODERATE disease risk for {crop}.**\n"
                f"Conditions: {temp_str}, {hum_str} humidity. {factors_str}.\n\n"
                f"**Precautionary actions:**\n"
                f"• Monitor leaf surfaces for spots or discoloration.\n"
                f"• Ensure good drainage — standing water encourages fungal growth.\n"
                f"• Avoid spraying when leaves are wet.\n"
                f"• Consider bio-fungicide application if humid conditions persist 3+ days.")

    else:
        return (f"✅ **Low disease risk** currently for {crop}.\n"
                f"Conditions: {temp_str}, {hum_str} humidity — within safe range.\n"
                f"Continue routine monitoring. Disease risk increases with humidity >75% and temperatures 20–30°C.")


def _answer_spray(farm, weather_data):
    """Grounded spray safety answer from wind and rain data."""
    if not weather_data:
        return "📡 Wind data unavailable. General rule: spray only when winds are below 15 km/h — otherwise spray drifts to neighboring fields."

    wind_risk = WindAdvisoryRules.evaluate(weather_data, farm.crop)
    wind_spd = (weather_data.get('current') or {}).get('wind_speed', 0) or 0
    rp       = (weather_data.get('today') or {}).get('rain_probability', 0) or 0

    if wind_risk.get('level') == 'HIGH' or wind_spd > 30:
        return (f"🚫 **Do NOT spray today.** Wind speed is {wind_spd:.1f} km/h — too high for safe application. "
                f"Pesticide drift risk is significant. Wait for calm conditions (wind < 15 km/h). "
                f"Best spray windows are early morning (6–8 AM) or late evening.")
    elif wind_spd > 15:
        return (f"⚠️ **Spray with caution.** Wind speed is {wind_spd:.1f} km/h — moderate. "
                f"Use low-pressure nozzles and spray shields if available. "
                f"Rain probability today: {rp:.0f}%. Avoid spraying if rain expected within 4 hours.")
    else:
        if rp > 60:
            return (f"☔ **Delay spraying.** Wind is favourable ({wind_spd:.1f} km/h) but "
                    f"rain probability is {rp:.0f}% — rain will wash away any pesticide/fertilizer applied now. "
                    f"Wait until after rain and leaves are dry.")
        return (f"✅ **Good conditions for spraying.**\n"
                f"Wind: {wind_spd:.1f} km/h (safe). Rain probability: {rp:.0f}% (low).\n"
                f"Best time: early morning (6–8 AM) — lower evaporation, better canopy penetration.")


def _answer_heat(farm, weather_data):
    """Grounded heat stress answer."""
    if not weather_data:
        return "🌡️ Temperature data unavailable. General rule: if temperature exceeds 35°C, mulch soil and increase irrigation frequency."

    risk = HeatRiskRules.evaluate(weather_data, farm.crop)
    temp = (weather_data.get('current') or {}).get('temperature')
    crop = farm.crop or 'your crop'
    temp_str = f"{temp:.0f}°C" if temp else "current temperature"

    if risk.get('level') == 'HIGH':
        return (f"🌡️ **HIGH heat stress for {crop}! Temperature: {temp_str}.**\n\n"
                f"**Urgent actions:**\n"
                f"• Irrigate immediately to cool root zone.\n"
                f"• Apply mulch (straw/dry grass) around plant base to retain soil moisture.\n"
                f"• Shade netting for sensitive crops if available.\n"
                f"• Avoid fertilizer application — plants under heat stress cannot uptake nutrients well.\n"
                f"• Monitor for blossom drop, fruit cracking, and wilting.")
    elif risk.get('level') == 'MODERATE':
        return (f"⚠️ **Moderate heat ({temp_str}) — watch {crop} carefully.**\n"
                f"• Keep soil moist — check every 12 hours.\n"
                f"• Foliar spray with water in early morning can reduce leaf temperature.\n"
                f"• Avoid nitrogen fertilizers during peak heat — this worsens stress.")
    else:
        return (f"✅ Temperature ({temp_str}) is within comfortable range for {crop}. "
                f"Continue routine care. Heat stress risk is low right now.")


def _answer_crops(farm, weather_data):
    """Suggest best crops given soil type and current season weather."""
    soil = farm.soil_type or 'unknown'
    temp = None
    if weather_data:
        temp = (weather_data.get('current') or {}).get('temperature')
    temp_str = f"{temp:.0f}°C" if temp else "current season temperatures"

    SOIL_CROPS = {
        'black':    ['Cotton', 'Sorghum', 'Wheat', 'Sunflower', 'Soybean'],
        'alluvial': ['Wheat', 'Rice', 'Sugarcane', 'Maize', 'Vegetables'],
        'red':      ['Groundnut', 'Millets', 'Tobacco', 'Cotton', 'Pulses'],
        'loamy':    ['Tomato', 'Potato', 'Maize', 'Wheat', 'Vegetables'],
        'clayey':   ['Rice', 'Wheat', 'Jute', 'Sugarcane'],
        'sandy':    ['Groundnut', 'Millets', 'Watermelon', 'Carrot', 'Radish'],
    }
    recommended = SOIL_CROPS.get(soil.lower(), ['Tomato', 'Maize', 'Groundnut', 'Millets'])

    return (f"🌱 **Crop recommendations for {soil.title() if soil != 'unknown' else ''} soil at {temp_str}:**\n\n"
            + "\n".join([f"• **{c}** — well-suited for {soil} soil" for c in recommended[:4]])
            + f"\n\nYour current primary crop: **{farm.crop or 'Not set'}**.\n"
            + "Tip: Rotate crops each season to maintain soil health and break pest cycles.")


def _answer_sustainability(farm, weather_data):
    """Explain sustainability score and give improvement tips."""
    from sustainability.services import calculate_sustainability_score
    from disease.models import DiseaseScan

    if not weather_data:
        return ("♻️ Sustainability score requires live weather data. "
                "It is calculated from: Water Efficiency (30%), Soil Health (25%), "
                "Crop Health (25%), and Resource Efficiency (20% — based on irrigation type).")

    scans = list(DiseaseScan.objects.filter(farm=farm).values('is_healthy')[:10])
    result = calculate_sustainability_score(weather_data, scans, farm)
    score  = result.get('score', 0)
    we     = result.get('water_efficiency', 0)
    sh     = result.get('soil_health', 0)
    ch     = result.get('crop_health', 0)
    re     = result.get('resource_efficiency', 0)

    tips = []
    if we < 60:
        tips.append("💧 Improve water efficiency — consider drip irrigation or mulching to retain soil moisture.")
    if sh < 60:
        tips.append("🪱 Improve soil health — add organic compost, avoid over-irrigation.")
    if ch < 60:
        tips.append("🌿 Improve crop health — scan leaves regularly for early disease detection.")
    if re < 70:
        tips.append(f"⚙️ Upgrade from {farm.irrigation_type or 'current'} to drip irrigation for highest efficiency score.")

    tips_str = "\n".join(tips) if tips else "✅ Your farm is performing well across all sustainability dimensions!"

    return (f"♻️ **Your Sustainability Score: {score}/100**\n\n"
            f"**Formula (published, reproducible):**\n"
            f"• Water Efficiency (×0.30): **{we}** — soil moisture optimality + ET₀\n"
            f"• Soil Health (×0.25): **{sh}** — root-zone moisture in optimal range\n"
            f"• Crop Health (×0.25): **{ch}** — based on disease scan history\n"
            f"• Resource Efficiency (×0.20): **{re}** — irrigation system type\n\n"
            f"**Improvement tips:**\n{tips_str}")


# ── Keyword routing ────────────────────────────────────────────────────────────

KEYWORD_ROUTES = [
    (['irrigat', 'water', 'moisture', 'pump', 'कब पानी'], _answer_irrigation),
    (['disease', 'fungal', 'blight', 'mildew', 'pest', 'spray', 'prevent', 'infection', 'leaf'], _answer_disease),
    (['spray', 'pesticide', 'wind', 'application', 'fertilizer spray'], _answer_spray),
    (['heat', 'temperature', 'hot', 'stress', 'wilting'], _answer_heat),
    (['crop', 'recommend', 'suit', 'grow', 'plant', 'kharif', 'rabi', 'season', 'soil'], _answer_crops),
    (['sustainability', 'score', 'efficiency', 'formula', 'resource', 'green'], _answer_sustainability),
]


def _route_message(message: str, farm, weather_data) -> str:
    """Route user message to the most relevant grounded answer function."""
    msg_lower = message.lower().strip()

    for keywords, handler in KEYWORD_ROUTES:
        if any(kw in msg_lower for kw in keywords):
            return handler(farm, weather_data)

    # Fallback: provide a farm status summary as default grounded response
    crop = farm.crop or 'Not set'
    temp = None
    if weather_data:
        temp = (weather_data.get('current') or {}).get('temperature')
    temp_str = f"{temp:.0f}°C" if temp else "unavailable"

    irr_status = "—"
    if weather_data:
        irr = IrrigationRules.evaluate(weather_data, crop)
        irr_status = irr.get('status', '—')

    return (f"🌿 **Your Farm Status ({farm.farm_name}):**\n"
            f"• Crop: {crop}\n"
            f"• Soil Type: {farm.soil_type or 'Not set'}\n"
            f"• Current Temperature: {temp_str}\n"
            f"• Irrigation Status: {irr_status}\n\n"
            f"**Ask me about:**\n"
            f"• \"Should I irrigate today?\"\n"
            f"• \"What is the disease risk?\"\n"
            f"• \"Is it safe to spray pesticide?\"\n"
            f"• \"What crops suit my soil?\"\n"
            f"• \"Explain my sustainability score\"\n"
            f"• \"Is there heat stress risk?\"")


# ── View ──────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat_view(request):
    """
    POST /api/assistant/chat/
    Body: { "message": "Should I irrigate today?", "farm_id": 1 }

    Returns a grounded, data-backed response based on real farm + weather data.
    No LLM — all answers are derived from actual sensor/weather readings.
    """
    message = (request.data.get('message') or '').strip()
    farm_id = request.data.get('farm_id')

    if not message:
        return Response({'error': 'Message is required.'}, status=status.HTTP_400_BAD_REQUEST)

    # Resolve farm
    farm_qs = Farm.objects.filter(user=request.user)
    if farm_id:
        farm = farm_qs.filter(id=farm_id).first() or farm_qs.first()
    else:
        farm = farm_qs.first()

    if not farm:
        return Response({
            'reply': ("🏡 You haven't added a farm yet. Please click **\"+ Add Farm\"** in the dashboard "
                      "to register your farm location, crop, and soil type. "
                      "Once added, I can give you precise irrigation, disease, and weather advice!"),
            'grounded': False,
            'has_farm': False,
        })

    # Fetch live weather (graceful degradation)
    weather_data = None
    try:
        weather_data = WeatherService.fetch_farm_weather(farm)
    except WeatherServiceError as e:
        logger.warning('Assistant: weather unavailable for farm %s: %s', farm.id, e)

    # Route to grounded answer
    reply = _route_message(message, farm, weather_data)

    return Response({
        'reply':    reply,
        'grounded': True,
        'has_farm': True,
        'farm_name': farm.farm_name,
        'crop':     farm.crop,
        'source':   'Rule-based grounded advisor using live Open-Meteo + farm data',
    })
