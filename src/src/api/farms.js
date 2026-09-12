import client from './client';

export async function getFarms() {
  const res = await client.get('/farms/');
  return res.data;
}

export async function getPrimaryFarm() {
  const res = await client.get('/farms/primary/');
  return res.data;
}

export async function createFarm(farmData) {
  const res = await client.post('/farms/', farmData);
  return res.data;
}

export async function updateFarm(id, farmData) {
  const res = await client.patch(`/farms/${id}/`, farmData);
  return res.data;
}

export async function deleteFarm(id) {
  await client.delete(`/farms/${id}/`);
}

/**
 * Search a city/village using Open-Meteo Geocoding (proxied via Django).
 * React must NOT call geocoding directly.
 */
export async function searchLocation(query) {
  const res = await client.get('/weather/location/search/', { params: { q: query } });
  return res.data.results || [];
}
