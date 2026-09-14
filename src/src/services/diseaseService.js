import { predictDisease } from '../api/disease';

/**
 * Format file size into human-readable string (KB/MB)
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Analyze crop leaf image using the real ConvNeXt-Tiny deep learning backend.
 *
 * @param {File} imageFile - The leaf image selected by the user.
 * @returns {Promise<object>} - Fully resolved analysis result.
 */
export async function analyzeDisease(imageFile) {
  if (!imageFile) {
    throw new Error('Please select a crop leaf image before starting analysis.');
  }

  // Generate a live preview URL from the actual user-selected file
  const previewUrl = URL.createObjectURL(imageFile);

  try {
    const apiResponse = await predictDisease(imageFile);
    const mapped = mapDiseaseApiResponse(apiResponse);
    return {
      ...mapped,
      uploadedImage: previewUrl,
      fileName: imageFile.name || 'leaf_sample.jpg',
      fileSize: formatFileSize(imageFile.size),
    };
  } catch (err) {
    console.error('Plant disease inference API error:', err);
    throw new Error(
      err?.response?.data?.message ||
      "We couldn't analyze this image. Please try another clear leaf image."
    );
  }
}

/**
 * Backend response mapper.
 * Normalizes the Django API response payload into the structure expected by all UI components.
 *
 * @param {object} apiResponse - Raw backend response payload from POST /api/disease/predict/
 * @returns {object} - Normalized structure matching UI contract
 */
export function mapDiseaseApiResponse(apiResponse) {
  if (!apiResponse) return null;

  const rawConf = apiResponse.confidence ?? apiResponse.confidence_percentage;
  const confPercent = typeof rawConf === 'number'
    ? (rawConf <= 1 ? Math.round(rawConf * 1000) / 10 : rawConf)
    : parseFloat(rawConf) || 0;

  return {
    uploadedImage: apiResponse.image_url || null,
    fileName: apiResponse.file_name || 'uploaded_leaf.jpg',
    fileSize: apiResponse.file_size || 'Not available',
    analyzedAt: apiResponse.created_at || 'Just now',

    prediction: {
      cropName: apiResponse.crop_name || apiResponse.crop_type || 'Unknown Crop',
      scientificCrop: apiResponse.scientific_crop || '',
      diseaseName: apiResponse.disease_name || apiResponse.predicted_class || 'No Disease Detected',
      pathogen: apiResponse.pathogen || '',
      confidence: confPercent,
      confidencePercent: apiResponse.confidence_percent || `${confPercent}%`,
      status: apiResponse.status || (apiResponse.is_healthy ? 'Healthy Foliage' : 'Disease Detected'),
      isHealthy: Boolean(apiResponse.is_healthy),
      message: apiResponse.message || apiResponse.recommendations || 'Analysis completed.',
    },

    cropHealth: {
      score: apiResponse.health_score ?? (apiResponse.is_healthy ? 95 : 65),
      status: apiResponse.health_status || (apiResponse.is_healthy ? 'Healthy' : 'Moderate Risk'),
      explanation: apiResponse.health_explanation || 'Assessment based on current leaf tissue condition.',
    },

    severity: {
      level: apiResponse.severity_level || (apiResponse.is_healthy ? 'None' : 'Moderate'),
      score: apiResponse.severity_score ?? (apiResponse.is_healthy ? 0 : 50),
      affectedLeafArea: apiResponse.affected_area || 'Not available',
      explanation: apiResponse.severity_explanation || 'Observed leaf lesion coverage.',
    },

    diseaseInformation: {
      diseaseName: apiResponse.disease_name || apiResponse.predicted_class || 'Crop Condition',
      category: apiResponse.category || 'Fungal Infection',
      scientificName: apiResponse.scientific_name || apiResponse.pathogen || '',
      affectedCrop: apiResponse.crop_name || 'Crop',
      description: apiResponse.description || 'Consult agricultural extension for localized disease patterns.',
    },

    symptoms: apiResponse.symptoms || [],
    possibleCauses: apiResponse.possible_causes || [],

    spreadRisk: {
      level: apiResponse.spread_risk_level || 'Medium',
      score: apiResponse.spread_risk_score ?? 50,
      explanation: apiResponse.spread_risk_explanation || 'Environmental conditions assessment.',
      factors: apiResponse.spread_risk_factors || [],
    },

    weather: {
      temperature: apiResponse.weather?.temperature ?? null,
      temperatureUnit: '°C',
      humidity: apiResponse.weather?.humidity ?? null,
      humidityUnit: '%',
      rainProbability: apiResponse.weather?.rain_probability ?? null,
      rainProbabilityUnit: '%',
      rainfall: apiResponse.weather?.rainfall ?? null,
      rainfallUnit: 'mm',
      windSpeed: apiResponse.weather?.wind_speed ?? null,
      windSpeedUnit: 'km/h',
      condition: apiResponse.weather?.condition ?? 'Not available',
      source: apiResponse.weather?.source ?? 'Open-Meteo API',
      lastUpdated: apiResponse.weather?.last_updated ?? 'Live',
    },

    diseaseForecast: apiResponse.disease_forecast || [],
    irrigationAdvice: {
      recommendation: apiResponse.irrigation?.recommendation || 'Regular Irrigation',
      actionType: apiResponse.irrigation?.action_type || 'regular',
      method: apiResponse.irrigation?.method || 'Drip Irrigation',
      explanation: apiResponse.irrigation?.explanation || 'Maintain regular watering schedule.',
      wateringCaution: apiResponse.irrigation?.caution || 'Keep foliage dry.',
      weatherRelationship: apiResponse.irrigation?.weather_relationship || 'Weather dependent.',
    },

    actionTimeline: apiResponse.action_timeline || {
      today: [],
      next24Hours: [],
      next3Days: [],
      nextWeek: [],
    },

    agronomistSummary: {
      headline: apiResponse.summary?.headline || 'Agronomic Assessment Complete',
      summary: apiResponse.summary?.text || 'Review recommendations below for targeted field action.',
      priority: apiResponse.summary?.priority || 'Normal Priority',
      recommendations: apiResponse.summary?.recommendations || [],
      expertNote:
        apiResponse.summary?.expert_note ||
        'Follow local agricultural extension guidance and consult a certified agronomist.',
    },

    confidenceBreakdown: Array.isArray(apiResponse.confidence_breakdown)
      ? apiResponse.confidence_breakdown.map((item, idx) => ({
          disease: item.disease ? `${item.crop ? item.crop + ' — ' : ''}${item.disease}` : (item.raw_class || 'Alternative'),
          probability: typeof item.probability === 'number'
            ? item.probability
            : Math.round((item.confidence || 0) * 1000) / 10,
          isTarget: idx === 0 || item.isTarget,
        }))
      : (apiResponse.confidenceBreakdown || []),

    modelMetrics: apiResponse.model_metrics || null,
  };
}
