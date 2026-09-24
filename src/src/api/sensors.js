import api from './client';

export const getSensorReadings = async (farmId) => {
  const params = farmId ? { farm_id: farmId } : {};
  const response = await api.get('/sensors/readings/', { params });
  return response.data;
};

export const getLatestSensorReading = async (farmId) => {
  const response = await api.get('/sensors/latest/', { params: { farm_id: farmId } });
  return response.data;
};

export const createSensorReading = async (data) => {
  const response = await api.post('/sensors/readings/', data);
  return response.data;
};
