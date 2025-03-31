'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClientAuth } from '../app/actions/client-auth';
import { UserProfile } from '@/lib/definitions';

// Define auth context types
export type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setAccessToken: (token: string) => void;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout (15 minutes)
const SESSION_TIMEOUT = 15 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = ClientAuth.getUser();
        const token = ClientAuth.getToken();

        if (storedUser && token) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        ClientAuth.clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Set up session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    // Track user activity
    let inactivityTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Log out after inactivity
        logout();
      }, SESSION_TIMEOUT);
    };

    // Set initial timer
    resetTimer();

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Clean up
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isAuthenticated]);

  // Set access token and user data (called after server-side signin/signup)
  const setAccessToken = useCallback((token: string) => {
    const userData = ClientAuth.setAuth(token);

    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
    }
  }, []);

  // Client-side logout
  const logout = useCallback(async () => {
    try {
      await ClientAuth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      ClientAuth.clearAuth();
      router.push('/');
    }
  }, [router]);

  // Check if user has role
  const hasRole = useCallback((role: string): boolean => {
    return ClientAuth.hasRole(role);
  }, []);

  // Check if user has permission
  const hasPermission = useCallback((permission: string): boolean => {
    return ClientAuth.hasPermission(permission);
  }, []);

  // Make authenticated API request
  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    return ClientAuth.fetchWithAuth(endpoint, options);
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    setAccessToken,
    logout,
    hasRole,
    hasPermission,
    fetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

// Default export for layout
export default AuthProvider;
