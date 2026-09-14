import client from './client';

/**
 * Predict optimal crop based on soil and climate parameters.
 *
 * @param {Object} params - { N, P, K, temperature, humidity, ph, rainfall, farm_id }
 */
export async function predictCrop(params) {
  const res = await client.post('/crops/predict/', params);
  return res.data;
}

/**
 * Get regional soil and climate presets.
 */
export async function getCropPresets() {
  const res = await client.get('/crops/presets/');
  return res.data;
}

/**
 * Get historical crop prediction records.
 */
export async function getCropHistory(farmId = null) {
  const params = farmId ? { farm_id: farmId } : {};
  const res = await client.get('/crops/history/', { params });
  return res.data;
}

/**
 * Get full agronomic catalog of 22 supported crops.
 */
export async function getCropCatalog() {
  const res = await client.get('/crops/catalog/');
  return res.data;
}
