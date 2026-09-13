/**
 * Centralized Demo Data for Crop Disease Detection
 * Provides realistic agronomic assessment data for UI demonstration and test flows.
 */

export const diseaseDemoResult = {
  uploadedImage: 'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?auto=format&fit=crop&w=800&q=80',
  fileName: 'tomato_leaf.jpg',
  fileSize: '2.4 MB',
  analyzedAt: 'Today, 10:42 AM',

  prediction: {
    cropName: 'Tomato',
    scientificCrop: 'Solanum lycopersicum',
    diseaseName: 'Early Blight',
    pathogen: 'Alternaria solani',
    confidence: 91.4,
    status: 'Disease Detected',
    isHealthy: false,
    message: 'The uploaded leaf shows clear symptoms of Early Blight (Alternaria solani). Immediate preventive measures are recommended.',
  },

  cropHealth: {
    score: 72,
    status: 'Moderate Risk',
    explanation: 'Your crop shows some signs of disease. Early action can prevent further spread.',
  },

  severity: {
    level: 'Moderate',
    score: 55,
    activeSegments: 3,
    totalSegments: 6,
    affectedLeafArea: '15-25%',
    explanation: 'The infection appears to affect a noticeable portion of the leaf.',
  },

  spreadRisk: {
    level: 'High',
    score: 75,
    activeSegments: 4,
    totalSegments: 6,
    explanation: 'High humidity and favorable weather conditions may increase the risk of spread.',
    factors: [
      'High ambient canopy humidity (>70%)',
      'Warm daytime temperatures (26-30°C)',
      'Close canopy spacing favoring spore dispersal',
    ],
  },

  weather: {
    temperature: 28.6,
    temperatureUnit: '°C',
    humidity: 68,
    humidityUnit: '%',
    rainProbability: 32,
    rainProbabilityUnit: '%',
    rainfall: 0.5,
    rainfallUnit: 'mm',
    windSpeed: 11.2,
    windSpeedUnit: 'km/h',
    condition: 'Partly Cloudy',
    source: 'Open-Meteo',
    lastUpdated: 'Today, 10:42 AM',
  },

  diseaseInformation: {
    diseaseName: 'Early Blight',
    category: 'Fungal Infection',
    scientificName: 'Alternaria solani',
    affectedCrop: 'Tomato (Solanum lycopersicum)',
    description:
      'Early blight is a common fungal disease caused by Alternaria solani. It affects tomato plants and can reduce yield if not managed properly. The disease usually appears as dark, circular spots with yellow halos on older leaves and can spread to stems and fruits.',
    tags: [
      'Fungal Disease',
      'Common in Warm & Humid Conditions',
      'Affects Leaves, Stems and Fruits',
    ],
  },

  symptoms: [
    'Dark brown circular spots on leaves',
    'Yellow halo around the spots',
    'Older leaves turn yellow and dry',
    'Spots may increase in size over time',
    'Can spread to stems and fruits',
  ],

  possibleCauses: [
    'High humidity',
    'Warm temperature (25–30°C)',
    'Poor air circulation',
    'Overhead irrigation',
    'Infected plant material',
    'Fungal spores in soil or nearby plants',
  ],

  diseaseForecast: [
    { day: 'Day 1', risk: 'Moderate', value: 45 },
    { day: 'Day 2', risk: 'Moderate', value: 50 },
    { day: 'Day 3', risk: 'High', value: 65 },
    { day: 'Day 4', risk: 'High', value: 72 },
    { day: 'Day 5', risk: 'High', value: 75 },
    { day: 'Day 6', risk: 'Moderate', value: 60 },
    { day: 'Day 7', risk: 'Moderate', value: 55 },
  ],

  irrigationAdvice: {
    recommendation: 'Delay irrigation',
    actionType: 'delay',
    method: 'Drip Irrigation',
    explanation:
      'Rain probability is high and humidity is elevated. Avoid unnecessary watering and prevent leaf wetness.',
    wateringCaution: 'Avoid overhead watering to stop fungal splash dispersal.',
    weatherRelationship: 'Elevated humidity increases leaf wetness duration.',
    recommendationsList: [
      'Avoid overhead irrigation',
      'Use drip irrigation if needed',
      'Monitor soil moisture',
      'Resume irrigation once weather improves',
    ],
  },

  actionTimeline: [
    {
      period: 'Today',
      iconType: 'scissors',
      iconBg: 'bg-emerald-500',
      items: [
        'Remove infected leaves',
        'Inspect nearby plants',
        'Avoid overhead watering',
      ],
      priority: 'High Priority',
      priorityColor: 'bg-red-50 text-red-600 border border-red-100',
    },
    {
      period: 'Next 24 Hours',
      iconType: 'clock',
      iconBg: 'bg-blue-500',
      items: [
        'Monitor for new symptoms',
        'Check humidity levels',
        'Air circulation',
      ],
      priority: 'Medium Priority',
      priorityColor: 'bg-blue-50 text-blue-600 border border-blue-100',
    },
    {
      period: 'Next 3 Days',
      iconType: 'calendar',
      iconBg: 'bg-amber-500',
      items: [
        'Apply recommended fungicide (consult expert)',
        'Check nearby crop patches',
        'Assess leaf recovery rate',
      ],
      priority: 'Medium Priority',
      priorityColor: 'bg-amber-50 text-amber-600 border border-amber-100',
    },
    {
      period: 'Next Week',
      iconType: 'trending',
      iconBg: 'bg-purple-500',
      items: [
        'Follow-up inspection',
        'Track yield health metrics',
        'Maintain protective mulching',
      ],
      priority: 'Low Priority',
      priorityColor: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    },
  ],

  agronomistSummary: {
    headline: 'Your tomato crop needs early attention.',
    summary:
      'The leaf shows signs of Early Blight with moderate severity. Current weather conditions are favorable for disease spread. Take immediate actions to prevent further infection and monitor the crop closely over the next few days.',
    priority: 'Immediate Attention',
    keyRecommendations: [
      'Remove infected leaves',
      'Avoid overhead irrigation',
      'Monitor weather and humidity',
      'Follow preventive fungicide application (consult local expert)',
    ],
    expertNote:
      'Always consult with your local Krishi Vigyan Kendra (KVK) or extension officer before chemical fungicide application.',
  },

  confidenceBreakdown: [
    { disease: 'Early Blight (Alternaria solani)', probability: 91.4, isTarget: true },
    { disease: 'Leaf Mold (Passalora fulva)', probability: 5.2, isTarget: false },
    { disease: 'Healthy', probability: 3.4, isTarget: false },
  ],
};
