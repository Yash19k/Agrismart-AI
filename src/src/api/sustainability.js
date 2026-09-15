import api from './client';

/**
 * Fetch authoritative, deterministic sustainability assessment for a farm and plant.
 * @param {string|number} [farmId] Optional farm ID
 * @param {string} [plant] Optional selected plant name
 * @returns {Promise<Object>} Sustainability score, component breakdown, conditions, and recommendations
 */
export const getSustainabilityScore = async (farmId, plant) => {
  const params = {};
  if (farmId) params.farm_id = farmId;
  if (plant) params.plant = plant;
  const response = await api.get('/sustainability/', { params });
  return response.data;
};
