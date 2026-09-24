import api from './client';

export const getFollowUps = async (params = {}) => {
  const response = await api.get('/followups/', { params });
  return response.data;
};

export const createFollowUp = async (data) => {
  const response = await api.post('/followups/', data);
  return response.data;
};

export const completeFollowUp = async (id, data) => {
  const response = await api.post(`/followups/${id}/complete/`, data);
  return response.data;
};
