import api from './client';

export const getExpertReviews = async (params = {}) => {
  const response = await api.get('/expert/reviews/', { params });
  return response.data;
};

export const getUnreviewedQueue = async () => {
  const response = await api.get('/expert/queue/');
  return response.data;
};

export const submitExpertReview = async (reviewData) => {
  const response = await api.post('/expert/reviews/', reviewData);
  return response.data;
};

export const updateExpertReview = async (id, reviewData) => {
  const response = await api.put(`/expert/reviews/${id}/`, reviewData);
  return response.data;
};
