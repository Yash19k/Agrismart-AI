import client from './client';

/**
 * Upload a crop leaf image for disease detection.
 * The ML model is not yet ready — Django will return model_status='pending'.
 */
export async function predictDisease(imageFile, cropType = 'Unknown', farmId = null) {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('crop_type', cropType);
  if (farmId) form.append('farm_id', String(farmId));

  const res = await client.post('/disease/predict/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getDiseaseHistory(farmId = null) {
  const params = farmId ? { farm_id: farmId } : {};
  const res = await client.get('/disease/history/', { params });
  return res.data;
}
