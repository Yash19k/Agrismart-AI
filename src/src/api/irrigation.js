import client from './client';

/**
 * POST /api/irrigation/predict/
 * Sends crop features to the Django ML model and returns irrigation recommendation.
 */
export async function predictIrrigation(features, weatherContext = null, farmId = null) {
  const payload = { ...features };
  if (weatherContext) payload.weather_context = weatherContext;
  if (farmId) payload.farm_id = farmId;
  const response = await client.post('/irrigation/predict/', payload);
  return response.data;
}

/**
 * GET /api/irrigation/meta/
 * Returns supported crops, soil types, growth stages, and class definitions.
 */
export async function getIrrigationMeta() {
  const response = await client.get('/irrigation/meta/');
  return response.data;
}

/**
 * GET /api/irrigation/health/
 * Returns pipeline readiness status.
 */
export async function getIrrigationHealth() {
  const response = await client.get('/irrigation/health/');
  return response.data;
}

/**
 * GET /api/irrigation/live-weather/
 * Fetches live weather data from WeatherAPI for auto-filling environmental readings.
 */
export async function getIrrigationLiveWeather(params = {}) {
  const response = await client.get('/irrigation/live-weather/', { params });
  return response.data;
}

/**
 * GET /api/irrigation/insights/
 * Returns ML model benchmarks, dataset audit metrics, and feature importance rankings.
 */
export async function getIrrigationInsights() {
  const response = await client.get('/irrigation/insights/');
  return response.data;
}

/**
 * GET /api/irrigation/history/
 * Returns user's past smart irrigation recommendations.
 */
export async function getIrrigationHistory() {
  const response = await client.get('/irrigation/history/');
  return response.data;
}
