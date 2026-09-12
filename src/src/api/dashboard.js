import client from './client';

/**
 * Fetch the complete dashboard payload for the current user's primary farm.
 * React MUST NOT call Open-Meteo directly — all data comes from this endpoint.
 *
 * @param {number|null} farmId - Optional specific farm ID
 * @returns {Promise<object>} Dashboard response shape from /api/dashboard/
 */
export async function getDashboard(farmId = null) {
  const params = farmId ? { farm_id: farmId } : {};
  const response = await client.get('/dashboard/', { params });
  return response.data;
}
