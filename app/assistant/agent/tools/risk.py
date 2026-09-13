"""
Tool 3: calculate_disease_risk
Deterministic agronomic risk calculation combining pathogen biology with live meteorological telemetry.
No hallucinated numbers — pure rule-based logic.
"""
from typing import Dict, Any, List


def calculate_disease_risk(
    disease_ctx: Dict[str, Any],
    weather_ctx: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Computes disease spread risk level ('High', 'Moderate', 'Low', 'None'),
    score (0–100), and specific causal environmental drivers.
    """
    humidity = weather_ctx.get("humidity", 50)
    rain_prob = weather_ctx.get("rain_probability", 0)
    temp = weather_ctx.get("temperature", 25.0)

    # If no disease assessment is active (Mode A: General Assistant)
    if not disease_ctx.get("available", True):
        reasons: List[str] = []
        score = 15
        if humidity >= 80:
            score += 35
            reasons.append(f"High ambient humidity ({humidity}%) elevates fungal spore germination risk")
        elif humidity >= 65:
            score += 15
            reasons.append(f"Moderate humidity ({humidity}%) in canopy")
        if rain_prob >= 60:
            score += 30
            reasons.append(f"Elevated rain probability ({rain_prob}%) prolongs leaf wetness")

        level = "High" if score >= 65 else ("Moderate" if score >= 35 else "Low")
        return {
            "available": False,
            "has_disease": False,
            "level": level,
            "score": score,
            "active_segments": 4 if level == "High" else (2 if level == "Moderate" else 1),
            "total_segments": 6,
            "reasons": reasons or ["Atmospheric conditions are within standard protective range"],
            "recommendation": "Maintain standard preventive scouting and balanced nutrition.",
        }

    is_healthy = disease_ctx.get("is_healthy", False)
    disease = disease_ctx.get("disease", "Unknown")

    if is_healthy:
        return {
            "available": True,
            "has_disease": False,
            "level": "Low",
            "score": 10,
            "active_segments": 1,
            "total_segments": 6,
            "reasons": [
                "Specimen is healthy with intact cuticle barrier",
                "Zero pathological lesion coverage detected",
                "Optimal photosynthetic leaf vigor",
            ],
            "recommendation": "Maintain standard preventive scouting and balanced nutrition.",
        }

    reasons: List[str] = []
    base_score = 40  # baseline for confirmed disease detection

    # Pathogen detection driver
    reasons.append(f"{disease} infection confirmed on leaf tissue")

    # Humidity factor
    if humidity >= 80:
        base_score += 25
        reasons.append(f"Very high relative humidity ({humidity}%) accelerates fungal sporulation")
    elif humidity >= 65:
        base_score += 15
        reasons.append(f"Elevated humidity ({humidity}%) keeps canopy moisture high")
    else:
        base_score -= 5

    # Rain probability factor
    if rain_prob >= 60:
        base_score += 20
        reasons.append(f"High rain probability ({rain_prob}%) causes leaf splashing and spore spread")
    elif rain_prob >= 30:
        base_score += 10
        reasons.append(f"Moderate chance of rain ({rain_prob}%) within forecast window")

    # Temperature factor for foliar pathogens
    if 20.0 <= temp <= 30.0:
        base_score += 10
        reasons.append(f"Temperature ({temp:.1f}°C) is in the optimal growth range for foliar pathogens")

    score = max(5, min(95, base_score))

    if score >= 70:
        level = "High"
        active_segments = 5
        rec = "Implement immediate barrier pruning, withhold overhead water, and apply protective spray."
    elif score >= 45:
        level = "Moderate"
        active_segments = 3
        rec = "Monitor daily, reduce irrigation cycle length, and inspect underside of surrounding leaves."
    else:
        level = "Low"
        active_segments = 2
        rec = "Favorable conditions for recovery. Continue balanced crop management."

    return {
        "available": True,
        "has_disease": True,
        "level": level,
        "score": score,
        "active_segments": active_segments,
        "total_segments": 6,
        "reasons": reasons,
        "recommendation": rec,
    }
