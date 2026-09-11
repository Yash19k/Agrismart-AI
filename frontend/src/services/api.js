import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agrishield_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors in farmer-friendly manner
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = 'We could not connect right now. Please check your internet connection and try again.';
    
    if (error.response) {
      if (error.response.status === 401) {
        friendlyMessage = 'Your session has expired. Please log in again.';
        localStorage.removeItem('agrishield_token');
        localStorage.removeItem('agrishield_user');
      } else if (error.response.status === 400 || error.response.status === 422) {
        friendlyMessage = error.response.data?.detail || error.response.data?.message || 'Please check the information entered and try again.';
      } else if (error.response.status >= 500) {
        friendlyMessage = 'Our farm advisory servers are temporarily busy. Please try again in a few moments.';
      }
    }
    
    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default api;
