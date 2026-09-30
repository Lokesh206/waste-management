import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage to prevent momentary glitch logouts
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('swms_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('swms_token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function verifyUserSession() {
      if (token) {
        try {
          const res = await authAPI.getProfile();
          if (res.data?.success) {
            setUser(res.data.user);
            localStorage.setItem('swms_user', JSON.stringify(res.data.user));
          } else if (res.status === 401) {
            logout();
          }
        } catch (err) {
          // Only force logout on genuine 401 Unauthorized responses
          if (err.response?.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    }
    verifyUserSession();
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    if (res.data?.success) {
      localStorage.setItem('swms_token', res.data.token);
      localStorage.setItem('swms_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data?.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authAPI.register(userData);
    if (res.data?.success) {
      localStorage.setItem('swms_token', res.data.token);
      localStorage.setItem('swms_user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error(res.data?.message || 'Registration failed');
  };

  const logout = () => {
    localStorage.removeItem('swms_token');
    localStorage.removeItem('swms_user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    role: user?.role,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
