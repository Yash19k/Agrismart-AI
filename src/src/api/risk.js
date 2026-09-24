import api from './client';

export const calculateRisk = async (payload) => {
  const response = await api.post('/risk/calculate/', payload);
  return response.data;
};

export const getFarmRisk = async (farmId) => {
  const response = await api.get(`/risk/farm/${farmId}/`);
  return response.data;
};

export const getRiskHistory = async () => {
  const response = await api.get('/risk/history/');
  return response.data;
};
