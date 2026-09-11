import api from './api';

export const farmerService = {
  async getProfile() {
    try {
      const response = await api.get('/farmer/profile/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await api.put('/farmer/profile/', profileData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default farmerService;
