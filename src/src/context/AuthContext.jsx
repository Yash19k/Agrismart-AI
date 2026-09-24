import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import { setAuthToken } from '../services/api';

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
  const [token, setToken] = useState(() => {
    try {
      const savedToken = sessionStorage.getItem('agrishield_token') || localStorage.getItem('agrishield_token');
      if (savedToken && savedToken.startsWith('mock-')) {
        sessionStorage.removeItem('agrishield_token');
        localStorage.removeItem('agrishield_token');
        return null;
      }
      return savedToken || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('agrishield_user') || localStorage.getItem('agrishield_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync token to Axios header
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authService.login(email.trim(), password);
      const accessToken = response.access;
      if (!accessToken || accessToken.startsWith('mock-')) {
        throw new Error('Authentication failed: Valid access token was not received from server.');
      }

      const userData = response.user || {
        id: 'usr_' + Date.now(),
        name: email.split('@')[0] || 'Farmer Friend',
        email: email.trim(),
        role: 'farmer',
        isOnboarded: true,
        farm: DEFAULT_FARM,
      };

      // Ensure role is always present
      if (!userData.role) {
        userData.role = 'farmer';
      }

      // SYNCHRONOUSLY store token in Axios defaults and storage BEFORE navigation
      setAuthToken(accessToken);
      sessionStorage.setItem('agrishield_user', JSON.stringify(userData));
      localStorage.setItem('agrishield_user', JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('API login failed:', error);
      setAuthToken(null);
      sessionStorage.removeItem('agrishield_user');
      localStorage.removeItem('agrishield_user');
      setToken(null);
      setUser(null);
      // Explicitly throw so LoginPage displays the real error to the user
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Registration does NOT auto-login, allowing redirection to login page
  const register = async (name, email, password) => {
    setLoading(true);
    try {
      const response = await authService.register(name.trim(), email.trim(), password);
      return { success: true, data: response };
    } catch (error) {
      console.error('API register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAuthToken(null);
    sessionStorage.removeItem('agrishield_user');
    localStorage.removeItem('agrishield_user');
    setToken(null);
    setUser(null);
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
        /** Helper: returns the user's role string ('farmer', 'expert', 'officer') */
        userRole: user?.role || 'farmer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
