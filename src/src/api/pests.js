import api from './client';

export const getPestObservations = async (params = {}) => {
  const response = await api.get('/pests/observations/', { params });
  return response.data;
};

export const createPestObservation = async (formData) => {
  const response = await api.post('/pests/observations/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getPestSummary = async (farmId = null) => {
  const url = farmId ? `/pests/summary/${farmId}/` : '/pests/summary/';
  const response = await api.get(url);
  return response.data;
};

export const deletePestObservation = async (id) => {
  const response = await api.delete(`/pests/observations/${id}/`);
  return response.data;
};
