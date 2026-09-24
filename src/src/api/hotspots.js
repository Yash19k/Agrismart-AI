import api from './client';

export const getHotspotsMap = async (days = 30, radius = 25.0) => {
  const response = await api.get('/hotspots/map/', {
    params: { days, radius },
  });
  return response.data;
};

export const getRegionalSummary = async () => {
  const response = await api.get('/hotspots/regional-summary/');
  return response.data;
};
