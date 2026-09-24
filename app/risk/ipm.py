"""
Integrated Pest & Disease Management (IPM) Advisory Generator.
Adheres to CIBRC safety guidelines: provides cultural, biological, and chemical safety guidance
WITHOUT fabricating arbitrary chemical dosages.
"""

DISEASE_IPM_KNOWLEDGE = {
    'early blight': {
        'cultural': [
            'Maintain at least 60 cm row spacing to encourage air circulation and rapid leaf drying.',
            'Avoid overhead sprinkler irrigation; switch to drip or furrow irrigation to minimize canopy wetness.',
            'Prune lower senescent leaves (bottom 30 cm) where early inoculum builds up.',
            'Rotate solanaceous crops with non-hosts like maize, pulses, or mustard for 2-3 seasons.'
        ],
        'biological': [
            'Foliar spray of Trichoderma harzianum or Bacillus subtilis bio-formulations during early canopy development.',
            'Apply neem oil extract (Azadirachtin 0.03% or 10,000 ppm) as a preventive botanical barrier on new foliage.'
        ],
        'chemical_guidance': {
            'disclaimer': 'Use only registered/labelled products approved by CIBRC (Central Insecticides Board & Registration Committee) or state agricultural extension services. Follow manufacturer label instructions strictly regarding dosage, spray volume, water pH, and Pre-Harvest Interval (PHI).',
            'recommended_actives': [
                'Mancozeb 75% WP (contact protective fungicide)',
                'Chlorothalonil 75% WP (preventive broad-spectrum protectant)',
                'Difenoconazole 25% EC (systemic curative, only under confirmed high-pressure threshold)'
            ],
            'safety_precautions': [
                'Wear protective gloves, goggles, and mask during handling.',
                'Do not spray against the wind or during peak bee foraging hours (10 AM - 3 PM).',
                'Observe a minimum 7-14 day Pre-Harvest Interval (PHI) before picking.'
            ]
        }
    },
    'late blight': {
        'cultural': [
            'Immediately rogue out and destroy severely blighted plants outside the farm perimeter.',
            'Ensure ridge height is at least 20 cm in potato fields to prevent tuber spore wash.',
            'Avoid nitrogen over-fertilization which promotes dense, vulnerable succulent growth.'
        ],
        'biological': [
            'Apply bio-agent Pseudomonas fluorescens liquid formulation as early preventive wash.',
            'Neem-based seed and foliage treatment prior to cool, foggy weather onset.'
        ],
        'chemical_guidance': {
            'disclaimer': 'Use only registered/labelled products approved by CIBRC. Follow official container labels and state university package of practices. Avoid repeated consecutive sprays of systemic compounds to prevent resistance.',
            'recommended_actives': [
                'Metalaxyl + Mancozeb combination WP',
                'Cymoxanil + Mancozeb WP',
                'Dimethomorph 50% WP (under critical outbreak conditions)'
            ],
            'safety_precautions': [
                'Ensure thorough upper and lower leaf coverage with fine mist nozzles.',
                'Rotate chemical modes of action (FRAC groups) between successive applications.'
            ]
        }
    },
    'powdery mildew': {
        'cultural': [
            'Thin dense foliage to permit direct sunlight penetration through the middle canopy.',
            'Remove dry infected leaves and weed hosts around field margins.',
            'Avoid water stress; maintain balanced moisture levels.'
        ],
        'biological': [
            'Bio-control using Ampelomyces quisqualis hyperparasitic fungus.',
            'Wettable sulphur bio-friendly preparations or potassium bicarbonate spray.'
        ],
        'chemical_guidance': {
            'disclaimer': 'Use only registered/labelled products. Consult the local Krishi Vigyan Kendra (KVK) for regional label approvals.',
            'recommended_actives': [
                'Wettable Sulphur 80% WP (preventive protectant; avoid in temperatures >32°C)',
                'Hexaconazole 5% EC (systemic triazole fungicide)'
            ],
            'safety_precautions': [
                'Do not mix sulphur with oil-based formulations or apply within 14 days of an oil spray.'
            ]
        }
    }
}

DEFAULT_IPM = {
    'cultural': [
        'Inspect field twice weekly, especially lower leaves and underside of canopy.',
        'Sanitize pruning tools with 10% sodium hypochlorite solution between rows.',
        'Ensure proper field drainage to avoid root zone waterlogging.'
    ],
    'biological': [
        'Apply Trichoderma viride or Bacillus subtilis enrichments to root zones.',
        'Maintain border flowering crops (marigold, mustard) to harbor natural predators (ladybugs, chrysoperla).'
    ],
    'chemical_guidance': {
        'disclaimer': 'Use only registered/labelled products approved by CIBRC or local agricultural extension office. Do not apply unregistered chemicals.',
        'recommended_actives': [
            'Copper Oxychloride 50% WP (broad spectrum protective fungicide/bactericide)',
            'Neem oil 1500 ppm botanical formulation'
        ],
        'safety_precautions': [
            'Wear complete PPE including respirators and protective boots.',
            'Never wash spray equipment in local irrigation canals or ponds.'
        ]
    }
}


def get_ipm_guidance(disease_name: str = '', pest_name: str = '', risk_level: str = 'low') -> dict:
    """Returns tiered IPM recommendations tailored to disease/pest diagnosis and risk tier."""
    clean_d = (disease_name or '').lower().strip()

    # Find matching knowledge
    selected = None
    for key, val in DISEASE_IPM_KNOWLEDGE.items():
        if key in clean_d:
            selected = val
            break

    if not selected:
        selected = DEFAULT_IPM

    # Tailor based on risk level
    guidance = {
        'cultural': selected['cultural'],
        'biological': selected['biological'],
        'chemical_guidance': selected['chemical_guidance'],
        'risk_level': risk_level,
        'intervention_urgency': {
            'low': 'Routine monitoring: follow cultural and preventive organic practices.',
            'medium': 'Targeted scouting: deploy biological controls and prepare preventive barrier sprays.',
            'high': 'Active management: implement recommended IPM measures immediately; inspect every 48 hours.',
            'critical': 'Emergency containment: quarantine infected zone, consult local KVK agronomist, apply registered label treatments strictly as directed.'
        }.get(risk_level, 'Routine field inspection recommended.')
    }
    return guidance
