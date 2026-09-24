import api from './client';

export const getFeedbackRecords = async (params = {}) => {
  const response = await api.get('/feedback/records/', { params });
  return response.data;
};

export const getFeedbackStats = async () => {
  const response = await api.get('/feedback/stats/');
  return response.data;
};

export const triggerAutoPartition = async () => {
  const response = await api.post('/feedback/partition/');
  return response.data;
};

export const updateFeedbackSplit = async (id, dataset_split) => {
  const response = await api.patch(`/feedback/records/${id}/`, { dataset_split });
  return response.data;
};

export const getExportCsvUrl = () => 'http://localhost:8000/api/feedback/export/csv/';
export const getExportJsonUrl = () => 'http://localhost:8000/api/feedback/export/json/';
