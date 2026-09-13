/**
 * FRONTEND DEMO MODE — BACKEND NOT CONNECTED
 *
 * This service acts as an adapter layer for crop disease detection.
 * In demo mode, it simulates an asynchronous analysis pipeline using centralized demo data.
 * When backend integration is ready, replace `analyzeDisease` with the real Django endpoint call:
 *   POST /api/disease/predict/
 *
 * All UI components receive clean, normalized props shaped by this service.
 */

import { diseaseDemoResult } from '../data/diseaseDemoData';
import { SAMPLE_LEAVES } from '../data/sampleLeaves';

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
 * Analyze crop leaf image.
 * Simulated frontend-only implementation with realistic latency.
 * If the image is one of our provided sample leaves, returns its tailored diagnostic profile.
 *
 * @param {File} imageFile - The leaf image selected by the user.
 * @returns {Promise<object>} - Fully resolved analysis result.
 */
export async function analyzeDisease(imageFile) {
  // Validate file presence
  if (!imageFile) {
    throw new Error('Please select a crop leaf image before starting analysis.');
  }

  // Simulate network latency & model inference (1400ms)
  await new Promise((resolve) => setTimeout(resolve, 1400));

  // Generate a live preview URL from the actual user-selected file
  const previewUrl = URL.createObjectURL(imageFile);

  const now = new Date();
  const timeString = `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  // Check if this is one of our provided sample leaves
  let diagnosticProfile = diseaseDemoResult;
  if (imageFile.sampleMeta?.details) {
    diagnosticProfile = imageFile.sampleMeta.details;
  } else {
    const matchedSample = SAMPLE_LEAVES.find(
      (s) => s.fileName === imageFile.name || s.id === imageFile.sampleId
    );
    if (matchedSample?.details) {
      diagnosticProfile = matchedSample.details;
    }
  }

  // Return resolved profile with user's file and timestamp bound
  return {
    ...diagnosticProfile,
    uploadedImage: previewUrl,
    fileName: imageFile.name || 'leaf_sample.jpg',
    fileSize: formatFileSize(imageFile.size),
    analyzedAt: timeString,
  };
}

/**
 * Future backend response mapper.
 * Use this when connecting Django API endpoint: POST /api/disease/predict/
 *
 * @param {object} apiResponse - Raw backend response payload
 * @returns {object} - Normalized structure matching diseaseDemoResult
 */
export function mapDiseaseApiResponse(apiResponse) {
  if (!apiResponse) return null;

  return {
    uploadedImage: apiResponse.image_url || null,
    fileName: apiResponse.file_name || 'uploaded_leaf.jpg',
    fileSize: apiResponse.file_size || 'Not available',
    analyzedAt: apiResponse.created_at || 'Just now',

    prediction: {
      cropName: apiResponse.crop_name || apiResponse.crop_type || 'Unknown Crop',
      scientificCrop: apiResponse.scientific_crop || '',
      diseaseName: apiResponse.predicted_class || apiResponse.disease_name || 'No Disease Detected',
      pathogen: apiResponse.pathogen || '',
      confidence: typeof apiResponse.confidence === 'number' ? apiResponse.confidence : 0,
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
      diseaseName: apiResponse.predicted_class || 'Crop Condition',
      category: apiResponse.category || 'Fungal',
      scientificName: apiResponse.scientific_name || '',
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

    confidenceBreakdown: apiResponse.confidence_breakdown || [],
  };
}
