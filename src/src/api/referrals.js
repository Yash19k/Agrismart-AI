import api from './client';

export const getReferrals = async (params = {}) => {
  const response = await api.get('/referrals/', { params });
  return response.data;
};

export const createReferral = async (data) => {
  const response = await api.post('/referrals/', data);
  return response.data;
};

export const updateReferral = async (id, data) => {
  const response = await api.patch(`/referrals/${id}/`, data);
  return response.data;
};
