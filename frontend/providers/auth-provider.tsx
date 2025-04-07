'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ClientAuth } from '../app/actions/client-auth';
import { UserProfile } from '@/lib/definitions';
import { getCookie, deleteCookie } from 'cookies-next';
import { ApiClient, ApiError } from '@/lib/api-client';

// Session timeout (15 minutes in milliseconds)
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT as string, 10);
// Token refresh interval (5 minutes in milliseconds)
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000;

// Define auth context types
export type AuthContextType = {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiresAt: number | null;
  setAccessToken: (token: string) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  fetchWithAuth: (endpoint: string, options?: RequestInit) => Promise<any>;
  refreshUserProfile: () => Promise<void>;
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Refs for timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle authentication failures consistently
   */
  const handleAuthFailure = async () => {
    // Clear all auth state
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    ClientAuth.clearAuth();
    setUser(null);
    setIsAuthenticated(false);
    setSessionExpiresAt(null);
  };

  // Set access token and user data - must be declared before initAuth
  const setAccessToken = useCallback((token: string) => {
    const userData = ClientAuth.setAuth(token);

    if (userData) {
      setUser(userData);
      setIsAuthenticated(true);
      updateSessionExpiry();
      setupTokenRefresh();
    }
  }, []); // setupTokenRefresh and updateSessionExpiry will be defined below

  // Update session expiry time based on current time + timeout
  const updateSessionExpiry = useCallback(() => {
    setSessionExpiresAt(Date.now() + SESSION_TIMEOUT);
  }, []);

  // Setup token refresh at regular intervals
  const setupTokenRefresh = useCallback(() => {
    // Clear any existing interval
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }

    // Set up automatic token refresh
    tokenRefreshIntervalRef.current = setInterval(async () => {
      try {
        if (isAuthenticated) {
          const token = ClientAuth.getToken();

          // Only refresh if token exists and is expiring soon
          if (token && ClientAuth.isTokenExpiring(token)) {
            await refreshToken();
          }
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, logout
        logout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, [isAuthenticated]); // logout and refreshToken will be defined below

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        let token = getCookie('access_token')?.toString() || null;

        // If token found in cookie, remove it after reading
        if (token) {
          deleteCookie('access_token');

          // Initialize auth state with token
          setAccessToken(token);
        } else {
          // If no token in cookie, try token from ClientAuth (memory)
          token = ClientAuth.getToken();

          if (token) {
            // Initialize auth state with token
            const userData = ClientAuth.setAuth(token);

            if (userData) {
              setUser(userData);
              setIsAuthenticated(true);

              // Calculate session expiry time
              updateSessionExpiry();

              // Setup token refresh
              setupTokenRefresh();
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        await handleAuthFailure();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Cleanup function
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, [setAccessToken, updateSessionExpiry, setupTokenRefresh]);

  // Set up session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset inactivity timer function
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Update the session expiry time
      updateSessionExpiry();

      inactivityTimerRef.current = setTimeout(() => {
        // Automatic logout after inactivity
        logout();
      }, SESSION_TIMEOUT);
    };

    // Set initial timer
    resetInactivityTimer();

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Clean up
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [isAuthenticated, updateSessionExpiry]);

  // Refresh token - now exposed in the context
  const refreshToken = useCallback(async () => {
    try {
      // Use existing ClientAuth method for refreshing
      const newToken = await ClientAuth.getRefreshedToken();

      // Update user data if needed
      const userData = ClientAuth.setAuth(newToken);
      if (userData) {
        setUser(userData);
      }

      // Reset session expiry
      updateSessionExpiry();

      // No return value to match Promise<void> type
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // If token refresh fails, logout
      await logout();
      throw error;
    }
  }, [updateSessionExpiry]);

  // Client-side logout with proper error handling
  const logout = useCallback(async () => {
    try {
      // Clear timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }

      // Call server logout endpoint
      await ClientAuth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      setSessionExpiresAt(null);
      ClientAuth.clearAuth();

      // Redirect to home page
      if (pathname !== '/') {
        router.push('/');
      }
    }
  }, [router, pathname]);

  // Refresh user profile from server
  const refreshUserProfile = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const userProfile = await ApiClient.get<{ user: UserProfile }>('/auth/profile');
      if (userProfile.user) {
        setUser(userProfile.user);
        sessionStorage.setItem('user', JSON.stringify(userProfile.user));
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);

      // If unauthorized, trigger auth failure
      if (error instanceof ApiError && error.status === 401) {
        await handleAuthFailure();
        router.push('/signin?expired=true');
      }
    }
  }, [isAuthenticated, router]);

  // Check if user has role
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user || !user.roles) return false;
      return user.roles.includes(role);
    },
    [user],
  );

  // Check if user has permission
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user || !user.permissions) return false;
      return user.permissions.includes(permission);
    },
    [user],
  );

  // Make authenticated API request
  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    return ClientAuth.fetchWithAuth(endpoint, options);
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    sessionExpiresAt,
    setAccessToken,
    logout,
    refreshToken,
    hasRole,
    hasPermission,
    fetchWithAuth,
    refreshUserProfile,
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
