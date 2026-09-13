import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

function persistSession(accessToken, userData) {
  sessionStorage.setItem('agrishield_token', accessToken);
  sessionStorage.setItem('agrishield_user', JSON.stringify(userData));
  localStorage.setItem('agrishield_token', accessToken);
  localStorage.setItem('agrishield_user', JSON.stringify(userData));
}

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
      persistSession(token, user);
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
      if (!response.access || !response.user) {
        throw new Error('The login response did not contain a valid session.');
      }
      const accessToken = response.access;
      const userData = response.user;
      // Persist before navigation so the first protected request has the JWT.
      persistSession(accessToken, userData);
      setToken(accessToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      throw error;
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
