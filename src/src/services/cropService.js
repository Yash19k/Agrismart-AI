import { predictCrop, getCropPresets, getCropHistory, getCropCatalog } from '../api/crops';

/**
 * Executes crop suitability analysis with parameter validation.
 */
export async function analyzeCropSuitability(params) {
  const payload = {
    N: parseFloat(params.N) || 0,
    P: parseFloat(params.P) || 0,
    K: parseFloat(params.K) || 0,
    temperature: parseFloat(params.temperature) || 25.0,
    humidity: parseFloat(params.humidity) || 70.0,
    ph: parseFloat(params.ph) || 6.5,
    rainfall: parseFloat(params.rainfall) || 100.0,
    farm_id: params.farm_id || null,
  };

  try {
    const data = await predictCrop(payload);
    return data;
  } catch (err) {
    console.error('Crop recommendation API error:', err);
    throw new Error(
      err?.response?.data?.message ||
      err?.response?.data?.detail ||
      'Failed to compute crop recommendation. Please check parameter ranges.'
    );
  }
}

export async function fetchPresets() {
  try {
    return await getCropPresets();
  } catch (err) {
    console.warn('Could not fetch online presets, using fallback:', err);
    return [];
  }
}

export async function fetchHistory(farmId = null) {
  try {
    return await getCropHistory(farmId);
  } catch (err) {
    console.warn('Could not fetch history:', err);
    return [];
  }
}

export async function fetchCatalog() {
  try {
    return await getCropCatalog();
  } catch (err) {
    console.warn('Could not fetch catalog:', err);
    return {};
  }
}
