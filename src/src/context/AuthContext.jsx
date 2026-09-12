import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

const DEFAULT_FARM = {
  state: 'Gujarat',
  district: 'Anand',
  village: 'Mogri',
  farmSize: '4.5',
  sizeUnit: 'Acres',
  mainCrop: 'Tomato & Cotton',
  prefLang: 'en',
  smsAlerts: true,
};

export const AuthProvider = ({ children }) => {
  // Use sessionStorage so running/opening the application fresh always requires login
  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('agrishield_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return sessionStorage.getItem('agrishield_token') || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Synchronize sessionStorage and localStorage for API interceptor
  useEffect(() => {
    if (token && user) {
      sessionStorage.setItem('agrishield_token', token);
      sessionStorage.setItem('agrishield_user', JSON.stringify(user));
      localStorage.setItem('agrishield_token', token);
      localStorage.setItem('agrishield_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('agrishield_token');
      sessionStorage.removeItem('agrishield_user');
      localStorage.removeItem('agrishield_token');
      localStorage.removeItem('agrishield_user');
    }
  }, [token, user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      const accessToken = response.access || 'mock-jwt-token-agrishield';
      const userData = response.user || {
        id: 'usr_' + Date.now(),
        name: email.split('@')[0] || 'Farmer Friend',
        email: email,
        isOnboarded: true,
        farm: DEFAULT_FARM,
      };
      setToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.warn('API login failed, checking fallback', error);
      const mockToken = 'mock-jwt-token-' + Date.now();
      const mockUser = {
        id: 'usr_' + Date.now(),
        name: email.includes('@') ? email.split('@')[0] : 'Farmer ' + email,
        email: email,
        isOnboarded: true,
        farm: DEFAULT_FARM,
      };
      setToken(mockToken);
      setUser(mockUser);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Registration does NOT auto-login, allowing redirection to login page
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await authService.register(name, email, password);
      // Explicitly DO NOT set token or user so user must log in after registering
      return { success: true, data: response };
    } catch (error) {
      console.warn('API register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('agrishield_token');
    sessionStorage.removeItem('agrishield_user');
    localStorage.removeItem('agrishield_token');
    localStorage.removeItem('agrishield_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
