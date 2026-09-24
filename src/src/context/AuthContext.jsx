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
  mainCrop: 'Tomato',
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
  const [initializing, setInitializing] = useState(() => !!token);

  // Sync token to Axios header and verify against /api/auth/me/ on startup
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      if (!token) {
        if (isMounted) setInitializing(false);
        return;
      }

      try {
        setAuthToken(token);
        const me = await authService.getCurrentUser();
        if (isMounted) {
          const mergedUser = {
            ...(user || {}),
            ...me,
            id: me.id || user?.id,
            name: me.name || user?.name || 'User',
            email: me.email || user?.email,
            role: me.role || user?.role || 'farmer',
            is_demo: !!me.is_demo,
            farm: user?.farm || DEFAULT_FARM,
          };
          setUser(mergedUser);
          sessionStorage.setItem('agrishield_user', JSON.stringify(mergedUser));
          localStorage.setItem('agrishield_user', JSON.stringify(mergedUser));
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Session verification failed, clearing expired credentials.', err);
          logout();
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

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
        is_demo: false,
        farm: DEFAULT_FARM,
      };

      if (!userData.role) {
        userData.role = 'farmer';
      }

      setAuthToken(accessToken);
      sessionStorage.setItem('agrishield_token', accessToken);
      localStorage.setItem('agrishield_token', accessToken);
      sessionStorage.setItem('agrishield_user', JSON.stringify(userData));
      localStorage.setItem('agrishield_user', JSON.stringify(userData));

      setToken(accessToken);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      console.error('API login failed:', error);
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

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
    sessionStorage.removeItem('agrishield_token');
    localStorage.removeItem('agrishield_token');
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
        initializing,
        login,
        register,
        logout,
        userRole: user?.role || 'farmer',
        isDemoUser: !!user?.is_demo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
