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

export default {
  getWeather,
  searchLocation,
};
