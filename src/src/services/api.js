import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const cleanBaseUrl = rawBaseUrl.replace(/\/+$/, '');
const API_BASE_URL = cleanBaseUrl.endsWith('/api') ? cleanBaseUrl : `${cleanBaseUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

/**
 * Helper to update Axios authorization header and sync storage synchronously.
 */
export const setAuthToken = (token) => {
  if (token && typeof token === 'string' && !token.startsWith('mock-')) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    sessionStorage.setItem('agrishield_token', token);
    localStorage.setItem('agrishield_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    sessionStorage.removeItem('agrishield_token');
    localStorage.removeItem('agrishield_token');
  }
};

// Initialize with any saved real token (and purge any old mock tokens)
const initialToken = sessionStorage.getItem('agrishield_token') || localStorage.getItem('agrishield_token');
if (initialToken && !initialToken.startsWith('mock-')) {
  api.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
} else if (initialToken && initialToken.startsWith('mock-')) {
  sessionStorage.removeItem('agrishield_token');
  sessionStorage.removeItem('agrishield_user');
  localStorage.removeItem('agrishield_token');
  localStorage.removeItem('agrishield_user');
}

// Request interceptor to ensure current token is always attached
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('agrishield_token') || localStorage.getItem('agrishield_token');
    if (token && !token.startsWith('mock-')) {
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
        delete api.defaults.headers.common['Authorization'];
        sessionStorage.removeItem('agrishield_token');
        sessionStorage.removeItem('agrishield_user');
        localStorage.removeItem('agrishield_token');
        localStorage.removeItem('agrishield_user');
        
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup' && path !== '/') {
          window.location.href = '/login';
        }
      } else if (error.response.status === 400 || error.response.status === 422) {
        const d = error.response.data;
        if (d?.detail) {
          friendlyMessage = d.detail;
        } else if (d?.message) {
          friendlyMessage = d.message;
        } else if (Array.isArray(d?.non_field_errors) && d.non_field_errors.length > 0) {
          friendlyMessage = d.non_field_errors[0];
        } else if (typeof d === 'object' && d !== null) {
          const firstKey = Object.keys(d)[0];
          const val = d[firstKey];
          if (Array.isArray(val) && val.length > 0) {
            friendlyMessage = val[0];
          } else if (typeof val === 'string') {
            friendlyMessage = val;
          } else {
            friendlyMessage = 'Please check the information entered and try again.';
          }
        } else {
          friendlyMessage = 'Please check the information entered and try again.';
        }
      } else if (error.response.status >= 500) {
        friendlyMessage = 'Our farm advisory servers are temporarily busy. Please try again in a few moments.';
      }
    }
    
    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

export default api;

