import api from './api';

export const farmService = {
  async getFarms() {
    try {
      const response = await api.get('/farms/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async addFarm(farmData) {
    try {
      const response = await api.post('/farms/', farmData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getWeather(lat, lon) {
    try {
      const response = await api.get(`/weather/?lat=${lat}&lon=${lon}`);
      return response.data;
    } catch (error) {
      // Fallback mock weather for Indian farming regions
      return {
        location: 'Anand, Gujarat',
        temp: '31°C',
        condition: 'Partly Sunny',
        humidity: '62%',
        rainChance: '15%',
        windSpeed: '12 km/h',
        spraySuitability: 'Good',
        sprayAdvice: 'Favorable condition for pesticide/fertilizer spray between 8 AM - 11 AM.',
      };
    }
  },
};

export default farmService;
