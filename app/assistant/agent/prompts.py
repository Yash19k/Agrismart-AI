"""
Prompt templates, domain boundary checker, and dynamic suggested questions generator.
"""
from typing import List, Dict, Any

NON_AGRI_KEYWORDS = [
    "cricket", "football", "match", "movie", "song", "bitcoin",
    "crypto", "stock market", "president", "election", "game",
    "who is", "celebrity", "joke", "code python", "write essay"
]


def is_non_agricultural_query(query: str) -> bool:
    """Detects queries clearly outside the farming domain."""
    q_lower = query.lower().strip()
    return any(k in q_lower for k in NON_AGRI_KEYWORDS)


def get_domain_rejection_response(language: str = "en") -> Dict[str, Any]:
    """Polite rejection message for off-topic queries."""
    if language == "gu":
        ans = (
            "હું ફક્ત ખેતી, પાક રોગ નિદાન, હવામાન અને સિંચાઈ સંબંધિત પ્રશ્નો માટે માર્ગદર્શન આપવા માટે રચાયેલ છું. "
            "કૃપા કરીને તમારા પાક અથવા ખેત સંચાલન વિશે પ્રશ્ન પૂછો!"
        )
    elif language == "hi":
        ans = (
            "मैं केवल कृषि, फसल रोग, मौसम और सिंचाई से संबंधित प्रश्नों में सहायता के लिए समर्पित हूँ। "
            "कृपया अपनी फसल या खेत प्रबंधन से जुड़ा सवाल पूछें!"
        )
    else:
        ans = (
            "I am designed specifically to help with your crop pathology, weather intelligence, irrigation, and farming decisions. "
            "Please ask me about your current crop situation or field management!"
        )

    return {
        "answer": ans,
        "why": ["Query is outside agricultural and crop pathology domain"],
        "actions": [
            {"phase": "Suggested", "action": "Ask: 'Should I irrigate today?'"},
            {"phase": "Suggested", "action": "Ask: 'What should I do now?'"},
        ],
        "decision_factors": ["Domain boundary check"],
        "citations": [],
        "is_off_topic": True,
    }


def get_dynamic_suggested_questions(
    crop: str = "Tomato",
    disease: str = "Early Blight",
    is_healthy: bool = False,
    risk_level: str = "High",
    language: str = "en",
) -> List[str]:
    """
    Generates context-aware suggested questions based on the active crop and disease.
    Never uses static generic questions.
    """
    if language == "gu":
        if is_healthy:
            return [
                f"{crop}ની તંદુરસ્તી જાળવી રાખવા શું કરવું?",
                "આજે પાકને પાણી આપવું જોઈએ?",
                "આગામી હવામાનની પાક પર શું અસર થશે?",
                "પાક ઉત્પાદન વધારવા કયા ખાતર આપવા?",
            ]
        return [
            "આજે મારે શું કરવું જોઈએ?",
            f"આજે {crop}ને પાણી આપવું જોઈએ?",
            f"રોગ ફેલાવવાનું જોખમ કેમ {risk_level} છે?",
            f"{disease} રોગ આજુબાજુના છોડમાં ફેલાતો કેવી રીતે અટકાવવો?",
            "જો હું આજે પાણી આપીશ તો શું થશે?",
            "આગામી વરસાદથી પાક પર શું અસર થશે?",
        ]

    if language == "hi":
        if is_healthy:
            return [
                f"{crop} की अच्छी सेहत बनाए रखने के लिए क्या करें?",
                "क्या मुझे आज सिंचाई करनी चाहिए?",
                "आने वाले मौसम का फसल पर क्या असर होगा?",
                "पैदावार बढ़ाने के लिए कौन से पोषक तत्व दें?",
            ]
        return [
            "मुझे आज क्या करना चाहिए?",
            f"क्या आज {crop} में पानी देना चाहिए?",
            f"रोग फैलने का जोखिम {risk_level} क्यों है?",
            f"{disease} को अन्य पौधों में फैलने से कैसे रोकें?",
            "अगर मैं आज पानी दे दूं तो क्या होगा?",
            "क्या मेरी फसल में सुधार हो रहा है?",
        ]

    # English defaults
    if is_healthy:
        return [
            f"What routine care does my {crop} need now?",
            "Should I irrigate today?",
            "How will tomorrow's weather affect this crop?",
            "What micronutrients boost foliar strength?",
        ]

    return [
        "What should I do today?",
        f"Should I irrigate my {crop} today?",
        f"Why is my disease risk {risk_level.lower()}?",
        f"How can I stop {disease} from spreading?",
        "What happens if I irrigate today?",
        "How will tomorrow's weather affect my crop?",
        "Is my crop getting better?",
    ]
