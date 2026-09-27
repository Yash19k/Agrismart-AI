import client from './client';

export async function getFarms() {
  const res = await client.get('/farms/');
  return res.data;
}

export async function getFarm(id) {
  const res = await client.get(`/farms/${id}/`);
  return res.data;
}

export async function getPrimaryFarm() {
  const res = await client.get('/farms/primary/');
  return res.data;
}

export async function getFarmWeather(farmId) {
  const url = farmId ? `/farms/${farmId}/weather/` : '/farms/weather/';
  const res = await client.get(url);
  return res.data;
}

export async function getFarmThermal(farmId) {
  const url = farmId ? `/farms/${farmId}/thermal/` : '/farms/thermal/';
  const res = await client.get(url);
  return res.data;
}

export async function fetchFarmThermal(farmId) {
  const url = farmId ? `/farms/${farmId}/thermal/fetch/` : '/farms/thermal/fetch/';
  const res = await client.post(url);
  return res.data;
}

export async function getFarmET(farmId) {
  const url = farmId ? `/farms/${farmId}/et/` : '/farms/et/';
  const res = await client.get(url);
  return res.data;
}

export async function fetchFarmET(farmId) {
  const url = farmId ? `/farms/${farmId}/et/fetch/` : '/farms/et/fetch/';
  const res = await client.post(url);
  return res.data;
}

export async function getFarmESI(farmId) {
  const url = farmId ? `/farms/${farmId}/esi/` : '/farms/esi/';
  const res = await client.get(url);
  return res.data;
}

export async function fetchFarmESI(farmId) {
  const url = farmId ? `/farms/${farmId}/esi/fetch/` : '/farms/esi/fetch/';
  const res = await client.post(url);
  return res.data;
}

export async function getFarmEnvironmentHistory(farmId) {
  const url = farmId ? `/farms/${farmId}/environment/history/` : '/farms/environment/history/';
  const res = await client.get(url);
  return res.data;
}

export async function getFarmEnvironmentLatest(farmId) {
  const url = farmId ? `/farms/${farmId}/environment/latest/` : '/farms/environment/latest/';
  const res = await client.get(url);
  return res.data;
}

export async function getFarmEnvironmentRisk(farmId, refresh = false) {
  const url = farmId ? `/farms/${farmId}/environment/risk/` : '/farms/environment/risk/';
  const res = await client.get(url, { params: refresh ? { refresh: 'true' } : {} });
  return res.data;
}

export async function getFarmEnvironmentRiskHistory(farmId) {
  const url = farmId ? `/farms/${farmId}/environment/risk/history/` : '/farms/environment/risk/history/';
  const res = await client.get(url);
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
