'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import authApi from '@/api/auth.api';
import usersApi from '@/api/users.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = authApi.getToken();
      const storedUser = authApi.getUser();

      if (storedToken) {
        setToken(storedToken);
        setUser(storedUser);

        try {
          // Verify token validity with backend /api/users/me
          const response = await usersApi.getMe();
          if (response?.data) {
            setUser(response.data);
            authApi.saveAuth(storedToken, response.data);
          }
        } catch {
          // If token verification fails with 401 or invalid, clear state
          authApi.clearAuth();
          setToken(null);
          setUser(null);
        }
      }

      setLoading(false);
    };

    initializeAuth();

    // Listen to custom 401 events dispatched from client.js
    const handleUnauthorizedEvent = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorizedEvent);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorizedEvent);
    };
  }, []);

  // Login handler
  const login = useCallback(async ({ email, password }) => {
    const res = await authApi.login({ email, password });
    if (res?.success && res.token) {
      setToken(res.token);
      setUser(res.data);
      authApi.saveAuth(res.token, res.data);
    }
    return res;
  }, []);

  // Register handler
  const register = useCallback(async ({ name, email, password }) => {
    return authApi.register({ name, email, password });
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    authApi.clearAuth();
    setToken(null);
    setUser(null);
    router.push('/auth/login');
  }, [router]);

  // Refresh user data from server
  const refreshUser = useCallback(async () => {
    try {
      const res = await usersApi.getMe();
      if (res?.data) {
        setUser(res.data);
        const currentToken = authApi.getToken();
        if (currentToken) authApi.saveAuth(currentToken, res.data);
      }
    } catch {
      // ignore user profile refresh errors
    }
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
