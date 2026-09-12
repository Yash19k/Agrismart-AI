import api from './api';

export const authService = {
  async register(name, email, password) {
    try {
      const response = await api.post('/auth/register/', { name, email, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async login(email, password) {
    try {
      const response = await api.post('/auth/login/', { email, password });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async resetPassword(identifier, newPassword) {
    try {
      const response = await api.post('/auth/reset-password/', {
        identifier,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default authService;
