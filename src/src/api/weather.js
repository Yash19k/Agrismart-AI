import client from './client';

/**
 * Fetch weather data for a farm or specific coordinates through Django gateway.
 * React MUST NOT call Open-Meteo directly.
 *
 * @param {number|null} farmId
 */
export async function getWeather(farmId = null) {
  const params = farmId ? { farm_id: farmId } : {};
  const res = await client.get('/weather/', { params });
  return res.data;
}

/**
 * Search locations via Open-Meteo geocoding proxied through Django.
 *
 * @param {string} query
 * @param {number} count
 */
export async function searchLocation(query, count = 5) {
  if (!query || query.trim().length < 2) return [];
  const res = await client.get('/weather/location/search/', {
    params: { q: query.trim(), count },
  });
  return res.data?.results || [];
}

/**
 * Check Weather Intelligence health & active provider.
 */
export async function getWeatherHealth() {
  const res = await client.get('/weather/health/');
  return res.data;
}

/**
 * Get unified normalized weather context.
 */
export async function getWeatherContext({ lat, lon, farmId } = {}) {
  const params = {};
  if (lat != null) params.lat = lat;
  if (lon != null) params.lon = lon;
  if (farmId != null) params.farm_id = farmId;
  const res = await client.get('/weather/context/', { params });
  return res.data;
}

/**
 * Run full weather intelligence analysis.
 */
export async function analyzeWeather(payload) {
  const res = await client.post('/weather/analyze/', payload);
  return res.data;
}

/**
 * Get crop-specific environmental weather context.
 */
export async function getCropWeatherContext(lat, lon) {
  const res = await client.get('/weather/crop-context/', { params: { lat, lon } });
  return res.data;
}

/**
 * Get irrigation-specific weather context for Module B.
 */
export async function getIrrigationWeatherContext(lat, lon) {
  const res = await client.get('/weather/irrigation-context/', { params: { lat, lon } });
  return res.data;
}

export default {
  getWeather,
  searchLocation,
  getWeatherHealth,
  getWeatherContext,
  analyzeWeather,
  getCropWeatherContext,
  getIrrigationWeatherContext,
};
