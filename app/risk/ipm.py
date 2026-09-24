"""
Integrated Pest & Disease Management (IPM) Advisory Generator.
Adheres strictly to Problem Statement Section 2.1 & Section 4 Phase 4:
- Structured step tiers in canonical order:
  1. monitoring
  2. cultural
  3. mechanical
  4. biological
  5. chemical (gated by Safety Gate 2.1)
  6. follow_up
- Step objects contain: {code, tier, text, params}
- Multilingual translation ready (codes mapped to en/hi/gu)
- Safety Gate 2.1:
  Chemical options are shown ONLY if the case is expert-confirmed,
  OR model confidence >= 0.80 AND predicted crop matches farm crop AND crop is supported.
  Otherwise: "Diagnosis uncertain. Do not spray. Get an expert review."
- Never invent arbitrary pesticide dosages, concentrations, or registration claims.
"""
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger('risk.ipm')

IPM_KNOWLEDGE = {
    'early blight': {
        'steps': [
            {
                'code': 'IPM_MONITOR_INSPECT_LOWER_CANOPY',
                'tier': 'monitoring',
                'text': 'Inspect the field twice weekly, prioritizing lower senescent foliage and underside of leaves for concentric ring lesions.',
                'params': {'frequency_days': 3, 'focus': 'lower canopy'}
            },
            {
                'code': 'IPM_CULT_WIDE_ROW_SPACING',
                'tier': 'cultural',
                'text': 'Maintain adequate crop row spacing (at least 60 cm) to encourage brisk airflow and accelerate foliar drying.',
                'params': {'spacing_cm': 60}
            },
            {
                'code': 'IPM_CULT_DRIP_IRRIGATION',
                'tier': 'cultural',
                'text': 'Avoid overhead sprinkler irrigation; switch to drip or furrow irrigation to minimize canopy wetness duration.',
                'params': {'irrigation_type': 'drip'}
            },
            {
                'code': 'IPM_CULT_SOLANACEOUS_ROTATION',
                'tier': 'cultural',
                'text': 'Rotate solanaceous crops with non-hosts such as maize, pulses, or mustard for 2 to 3 consecutive seasons.',
                'params': {'seasons': 2}
            },
            {
                'code': 'IPM_MECH_PRUNE_LOWER_LEAVES',
                'tier': 'mechanical',
                'text': 'Prune and safely discard lower diseased leaves (bottom 30 cm) using sterilized cutting shears.',
                'params': {'prune_height_cm': 30}
            },
            {
                'code': 'IPM_BIO_TRICHODERMA_FOLIAR',
                'tier': 'biological',
                'text': 'Apply foliar bio-protective spray of Trichoderma harzianum or Bacillus subtilis bio-formulations during early canopy development.',
                'params': {'bio_agent': 'Trichoderma harzianum'}
            },
            {
                'code': 'IPM_BIO_NEEM_BOTANICAL',
                'tier': 'biological',
                'text': 'Apply cold-pressed neem oil extract (Azadirachtin 0.03% or 10,000 ppm) as a preventive botanical barrier on fresh foliage.',
                'params': {'active': 'Azadirachtin', 'target': 'botanical barrier'}
            },
            {
                'code': 'IPM_CHEM_APPROVED_PROTECTANT',
                'tier': 'chemical',
                'text': 'Under verified high disease pressure, consult certified state agricultural university package of practices for registered protectant actives (e.g. Mancozeb 75% WP or Chlorothalonil 75% WP). Strictly follow manufacturer container label and respect Pre-Harvest Interval (PHI).',
                'params': {
                    'actives': ['Mancozeb 75% WP', 'Chlorothalonil 75% WP'],
                    'cibrc_caveat': 'Verify state CIBRC registration. Adhere strictly to container label instructions. Do not exceed recommended concentrations.'
                }
            },
            {
                'code': 'IPM_FOLLOWUP_5_DAYS',
                'tier': 'follow_up',
                'text': 'Re-scout tagged diagnostic plants in 5 to 7 days to record whether lesion progression has halted.',
                'params': {'recheck_days': 5}
            }
        ]
    },
    'late blight': {
        'steps': [
            {
                'code': 'IPM_MONITOR_WATER_SOAKED_MARGINS',
                'tier': 'monitoring',
                'text': 'Monitor field borders daily for pale green water-soaked lesions and white mildew down on leaf undersides under cool, humid weather.',
                'params': {'frequency_days': 1, 'symptoms': 'water-soaked lesions'}
            },
            {
                'code': 'IPM_CULT_DESTROY_BLIGHT_POCKETS',
                'tier': 'cultural',
                'text': 'Immediately rogue out and bury severely blighted plants outside the farm perimeter to destroy airborne sporangial reservoirs.',
                'params': {'action': 'rogue out and bury'}
            },
            {
                'code': 'IPM_CULT_HIGH_RIDGE_HILLING',
                'tier': 'cultural',
                'text': 'Ensure ridge height is at least 20 cm in potato or solanaceous beds to prevent tuber spore wash during rains.',
                'params': {'ridge_height_cm': 20}
            },
            {
                'code': 'IPM_MECH_DISINFECT_EQUIPMENT',
                'tier': 'mechanical',
                'text': 'Disinfect field implements and rubber boots with 10% sodium hypochlorite solution before entering uninfected plots.',
                'params': {'disinfectant': '10% sodium hypochlorite'}
            },
            {
                'code': 'IPM_BIO_PSEUDOMONAS_WASH',
                'tier': 'biological',
                'text': 'Apply bio-agent Pseudomonas fluorescens liquid formulation as an early protective foliar wash.',
                'params': {'bio_agent': 'Pseudomonas fluorescens'}
            },
            {
                'code': 'IPM_CHEM_APPROVED_BLIGHT',
                'tier': 'chemical',
                'text': 'Under verified critical blight emergency, consult local extension / KVK officers for CIBRC registered dual-action formulations (e.g. Cymoxanil + Mancozeb or Metalaxyl + Mancozeb). Always rotate FRAC chemical groups to avoid pathogen resistance.',
                'params': {
                    'actives': ['Cymoxanil + Mancozeb WP', 'Metalaxyl + Mancozeb WP'],
                    'cibrc_caveat': 'Use only labeled products. Wear complete PPE. Observe strict 7-14 day Pre-Harvest Interval.'
                }
            },
            {
                'code': 'IPM_FOLLOWUP_3_DAYS',
                'tier': 'follow_up',
                'text': 'Recheck foliar canopy within 48 to 72 hours due to rapid secondary sporulation cycles.',
                'params': {'recheck_days': 3}
            }
        ]
    },
    'powdery mildew': {
        'steps': [
            {
                'code': 'IPM_MONITOR_WHITE_POWDER',
                'tier': 'monitoring',
                'text': 'Scout upper leaf surfaces and succulent terminal shoots weekly for powdery white talc-like fungal patches.',
                'params': {'frequency_days': 7}
            },
            {
                'code': 'IPM_CULT_SUNLIGHT_PENETRATION',
                'tier': 'cultural',
                'text': 'Thin dense upper canopy to allow direct sunlight and dry breezes into the lower plant levels.',
                'params': {'action': 'canopy thinning'}
            },
            {
                'code': 'IPM_MECH_STRIP_INFECTED_SHOOTS',
                'tier': 'mechanical',
                'text': 'Manually clip off heavily coated leaf tips and remove fallen debris from the soil surface.',
                'params': {'action': 'clip terminal shoots'}
            },
            {
                'code': 'IPM_BIO_AMPELOMYCES',
                'tier': 'biological',
                'text': 'Deploy hyperparasitic fungal bio-formulations (Ampelomyces quisqualis) or potassium bicarbonate bio-washes.',
                'params': {'bio_agent': 'Ampelomyces quisqualis'}
            },
            {
                'code': 'IPM_CHEM_APPROVED_SULPHUR',
                'tier': 'chemical',
                'text': 'If disease threshold persists, consult extension authorities for registered wettable sulphur 80% WP formulations. CAUTION: Never apply sulphur formulations when ambient temperature exceeds 32°C or within 14 days of oil sprays.',
                'params': {
                    'actives': ['Wettable Sulphur 80% WP'],
                    'cibrc_caveat': 'Verify temperature safety limits (>32°C causes phytotoxicity). Do not combine with oil sprays.'
                }
            },
            {
                'code': 'IPM_FOLLOWUP_7_DAYS',
                'tier': 'follow_up',
                'text': 'Inspect newly emerging foliage in 7 days for freedom from powdery fungal expansion.',
                'params': {'recheck_days': 7}
            }
        ]
    },
    'default': {
        'steps': [
            {
                'code': 'IPM_MONITOR_ROUTINE_SCOUTING',
                'tier': 'monitoring',
                'text': 'Perform structured field scouting twice weekly across a zigzag "W" or "Z" pattern through the plot.',
                'params': {'frequency_days': 4, 'pattern': 'zigzag'}
            },
            {
                'code': 'IPM_CULT_BALANCED_NUTRITION',
                'tier': 'cultural',
                'text': 'Avoid excessive nitrogen fertilization; maintain balanced potash and micronutrient levels to enhance foliar resistance.',
                'params': {'action': 'balanced fertilization'}
            },
            {
                'code': 'IPM_CULT_DRAINAGE',
                'tier': 'cultural',
                'text': 'Maintain clean drainage channels to prevent root zone saturation and waterborne pathogen transmission.',
                'params': {'action': 'clear drainage'}
            },
            {
                'code': 'IPM_MECH_WEED_HOST_REMOVAL',
                'tier': 'mechanical',
                'text': 'Eradicate wild alternative weed hosts and volunteer seedlings along field bunds and fence lines.',
                'params': {'action': 'weed eradication'}
            },
            {
                'code': 'IPM_BIO_SOIL_ENRICHMENT',
                'tier': 'biological',
                'text': 'Incorporate bio-inoculants (Trichoderma viride or Pseudomonas fluorescens) enriched in well-decomposed FYM at root zones.',
                'params': {'bio_agent': 'Trichoderma viride'}
            },
            {
                'code': 'IPM_BIO_NEEM_BOTANICAL',
                'tier': 'biological',
                'text': 'Apply botanical barrier sprays like neem kernel extract (1500 ppm) early in the morning.',
                'params': {'active': 'Neem formulation 1500 ppm'}
            },
            {
                'code': 'IPM_CHEM_CAVEAT_ONLY',
                'tier': 'chemical',
                'text': 'Chemical interventions should strictly be a last resort. Use only products certified and labeled by the Central Insecticides Board & Registration Committee (CIBRC) for this specific crop and pathogen.',
                'params': {
                    'cibrc_caveat': 'Consult your district Krishi Vigyan Kendra (KVK) officer for locally approved label products.'
                }
            },
            {
                'code': 'IPM_FOLLOWUP_SCHEDULE',
                'tier': 'follow_up',
                'text': 'Schedule an in-field follow-up review in 5 to 7 days to record crop vigor and symptom changes.',
                'params': {'recheck_days': 6}
            }
        ]
    }
}


def get_ipm_guidance(
    disease_name: str = '',
    pest_name: str = '',
    risk_level: str = 'low',
    safety_gate_passed: bool = True,
    is_expert_confirmed: bool = False,
    crop_mismatch: bool = False,
    unsupported_crop: bool = False,
) -> Dict[str, Any]:
    """
    Returns structured, tiered IPM steps in the canonical order:
    monitoring -> cultural -> mechanical -> biological -> chemical (safety-gated) -> follow_up.

    Safety Gate (Section 2.1):
    Chemical tier is included ONLY if:
    - is_expert_confirmed == True, OR
    - (safety_gate_passed == True and not crop_mismatch and not unsupported_crop)
    Otherwise, the chemical step is replaced by an explicit safety block:
    "Diagnosis uncertain. Do not spray. Get an expert review."
    """
    clean_d = (disease_name or '').lower().strip()

    # Find matching knowledge base entry
    selected = None
    for key, val in IPM_KNOWLEDGE.items():
        if key != 'default' and key in clean_d:
            selected = val
            break
    if not selected:
        selected = IPM_KNOWLEDGE['default']

    raw_steps = selected.get('steps', [])

    # Evaluate Safety Gate 2.1
    allow_chemical = is_expert_confirmed or (safety_gate_passed and not crop_mismatch and not unsupported_crop)

    processed_steps: List[Dict[str, Any]] = []
    chemical_guidance_dict: Dict[str, Any] = {}
    cultural_list: List[str] = []
    biological_list: List[str] = []

    for step in raw_steps:
        tier = step['tier']

        if tier == 'chemical':
            if allow_chemical:
                processed_steps.append({
                    'code': step['code'],
                    'tier': 'chemical',
                    'text': step['text'],
                    'params': step.get('params', {}),
                    'safety_gate_cleared': True,
                    'is_expert_confirmed': is_expert_confirmed,
                })
                chemical_guidance_dict = {
                    'disclaimer': 'Use only registered/labelled products approved by CIBRC. Follow manufacturer label instructions strictly regarding dosage, spray volume, and Pre-Harvest Interval (PHI).',
                    'recommended_actives': step.get('params', {}).get('actives', ['Consult local KVK for labeled protectants']),
                    'safety_precautions': [
                        'Wear protective gloves, mask, and goggles during handling.',
                        'Never spray against the wind or during peak pollinator foraging hours (10 AM - 3 PM).',
                        'Strictly observe Pre-Harvest Intervals (PHI) before harvest.'
                    ]
                }
            else:
                # Safety Gate Blocked — strict PS requirement
                uncertain_msg = "Diagnosis uncertain. Do not spray. Get an expert review."
                if unsupported_crop:
                    uncertain_msg = "Crop not supported by the image model. Do not spray chemicals. Get an expert review."
                elif crop_mismatch:
                    uncertain_msg = "Predicted disease crop does not match your farm crop. Do not spray. Get an expert review."

                processed_steps.append({
                    'code': 'IPM_CHEM_SAFETY_GATE_BLOCKED',
                    'tier': 'chemical',
                    'text': uncertain_msg,
                    'params': {
                        'blocked': True,
                        'reason': uncertain_msg,
                        'safety_gate_cleared': False
                    },
                    'safety_gate_cleared': False,
                    'warning': uncertain_msg,
                })
                chemical_guidance_dict = {
                    'disclaimer': uncertain_msg,
                    'recommended_actives': [],
                    'safety_precautions': [
                        'Chemical applications suspended pending certified expert verification.',
                        'Auto-recommended extension/KVK referral initiated.'
                    ]
                }
        else:
            processed_steps.append(step)
            if tier == 'cultural':
                cultural_list.append(step['text'])
            elif tier == 'biological':
                biological_list.append(step['text'])

    # Ensure canonical ordering: monitoring -> cultural -> mechanical -> biological -> chemical -> follow_up
    tier_order = {
        'monitoring': 1,
        'cultural': 2,
        'mechanical': 3,
        'biological': 4,
        'chemical': 5,
        'follow_up': 6,
    }
    processed_steps.sort(key=lambda s: tier_order.get(s['tier'], 99))

    urgency_text = {
        'low': 'Routine monitoring: follow cultural and preventive organic practices.',
        'medium': 'Targeted scouting: deploy biological controls and prepare preventive barrier sprays.',
        'high': 'Active management: implement recommended IPM measures immediately; inspect every 48 hours.',
        'critical': 'Emergency containment: quarantine infected zone, consult local KVK agronomist, apply registered label treatments strictly as directed.'
    }.get(risk_level, 'Routine field inspection recommended.')

    return {
        'steps': processed_steps,
        'safety_gate_passed': allow_chemical,
        'is_expert_confirmed': is_expert_confirmed,
        'risk_level': risk_level,
        'intervention_urgency': urgency_text,
        'translation_notice': 'Machine-assisted translation. Verify chemical details with local agricultural extension officer.',
        # Legacy fields for backward compatibility
        'cultural': cultural_list,
        'biological': biological_list,
        'chemical_guidance': chemical_guidance_dict,
    }
