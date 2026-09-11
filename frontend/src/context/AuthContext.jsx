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
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('agrishield_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('agrishield_token') || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem('agrishield_token', token);
      localStorage.setItem('agrishield_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('agrishield_token');
      localStorage.removeItem('agrishield_user');
    }
  }, [token, user]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      setToken(response.access || 'mock-jwt-token-agrishield');
      setUser(response.user || {
        id: 'usr_' + Date.now(),
        name: email.split('@')[0] || 'Farmer Friend',
        email: email,
        isOnboarded: true,
        farm: DEFAULT_FARM,
      });
      return { success: true };
    } catch (error) {
      console.warn('API login failed, falling back to local session', error);
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

  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await authService.register(name, email, password);
      setToken(response.access || 'mock-jwt-token-agrishield');
      setUser({
        id: response.id || 'usr_' + Date.now(),
        name: name,
        email: email,
        isOnboarded: true,
        farm: DEFAULT_FARM,
      });
      return { success: true };
    } catch (error) {
      console.warn('API register failed, falling back to local session', error);
      const mockToken = 'mock-jwt-token-' + Date.now();
      const mockUser = {
        id: 'usr_' + Date.now(),
        name: name,
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

  const logout = () => {
    setToken(null);
    setUser(null);
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
