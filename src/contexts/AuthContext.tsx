'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { refreshAccessToken, setAccessToken } from '@/lib/api';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, code?: string, challenge?: string) => Promise<{ requiresTwoFactor?: boolean; challenge?: string }>;
  register: (data: RegisterData) => Promise<AuthResponse>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        // Only return user if a valid token is also saved
        return savedToken && savedUser ? JSON.parse(savedUser) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('token');
      } catch {
        return null;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (savedToken) {
      setAccessToken(savedToken);
      setToken(savedToken);
    }

    // Restore from the long-lived HttpOnly refresh session even when the
    // short-lived access token is absent or expired.
    const restore = async () => {
      if (!savedToken) {
        const refreshedToken = await refreshAccessToken();
        setToken(refreshedToken);
      }
      return api.get('/auth/me');
    };
    restore()
      .then((res) => {
        const payload = res.data?.data;
        if (payload) {
          const currentToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
          if (currentToken) setToken(currentToken);
          setUser(payload);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('user', JSON.stringify(payload));
            } catch {}
          }
        }
      })
      .catch((err) => {
        // Clear only when the long-lived refresh session is genuinely unavailable
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAccessToken(null);
          setToken(null);
          setUser(null);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            } catch {}
          }
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = async (email: string, password: string, code?: string, challenge?: string) => {
    const res = code && challenge
      ? await api.post('/auth/login/2fa', { code, challenge })
      : await api.post<{ success: boolean; data: AuthResponse & { requiresTwoFactor?: boolean; challenge?: string } }>('/auth/login', { email, password });
    if (res.data?.data?.requiresTwoFactor) return res.data.data;

    const payload = res.data?.data;
    const userData = payload?.user || null;
    const jwtToken = payload?.accessToken || payload?.token || null;

    setAccessToken(jwtToken);
    setUser(userData);
    setToken(jwtToken);

    if (typeof window !== 'undefined') {
      try {
        if (jwtToken) localStorage.setItem('token', jwtToken);
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
      } catch {}
    }

    return {};
  };

  const register = async (data: RegisterData) => {
    const res = await api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data);
    const payload = res.data?.data;
    const userData = payload?.user || null;
    const jwtToken = payload?.accessToken || payload?.token || null;

    setAccessToken(jwtToken);
    setUser(userData);
    setToken(jwtToken);

    if (typeof window !== 'undefined') {
      try {
        if (jwtToken) localStorage.setItem('token', jwtToken);
        if (userData) localStorage.setItem('user', JSON.stringify(userData));
      } catch {}
    }

    return res.data.data;
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => null);
    setAccessToken(null);
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
    }
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
