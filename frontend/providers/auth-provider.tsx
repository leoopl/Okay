'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ClientAuth } from '../app/actions/client-auth';
import { UserProfile } from '@/lib/definitions';
import { jwtDecode } from 'jwt-decode';

// Session timeout (15 minutes in milliseconds)
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT || '900000', 10);
// Token refresh interval (14 minutes in milliseconds to be safe)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  // Refs for timers
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('Initializing auth state...');

        // Try to get token from memory first
        let token = ClientAuth.getToken();
        console.log('Token from memory:', token ? 'exists' : 'not found');

        if (token) {
          // Initialize auth state with token
          const userData = ClientAuth.setAuth(token);

          if (userData) {
            console.log('User authenticated:', userData.email);
            setUser(userData);
            setIsAuthenticated(true);

            // Setup token refresh
            setupTokenRefresh();
          } else {
            console.log('Failed to parse user data from token');
          }
        } else {
          // If no token in memory, try to refresh
          try {
            console.log('Attempting token refresh...');
            await ClientAuth.refreshToken();
            token = ClientAuth.getToken();

            if (token) {
              console.log('Token refreshed successfully');
              const userData = ClientAuth.setAuth(token);

              if (userData) {
                setUser(userData);
                setIsAuthenticated(true);
                setupTokenRefresh();
              }
            }
          } catch (error) {
            // Silent fail on refresh error during initialization
            console.log('No active session found');
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        ClientAuth.clearAuth();
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
  }, []);

  // Set up session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    // Reset inactivity timer function
    const resetInactivityTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

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
  }, [isAuthenticated]);

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
          await ClientAuth.refreshToken();
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, logout
        logout();
      }
    }, TOKEN_REFRESH_INTERVAL);
  }, [isAuthenticated]);

  // Set access token and user data
  const setAccessToken = useCallback(
    (token: string) => {
      try {
        console.log('Setting access token...');

        // Basic token validation
        if (!token || typeof token !== 'string' || token.length < 10) {
          throw new Error('Invalid token format');
        }

        // Decode the token to verify it's valid
        let decoded;
        try {
          decoded = jwtDecode<any>(token);
          console.log('Token decoded successfully:', decoded.sub ? 'valid' : 'invalid');
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);
          throw new Error('Invalid token format');
        }

        if (!decoded || !decoded.sub) {
          throw new Error('Invalid token payload');
        }

        // Set token in memory
        const userData = ClientAuth.setAuth(token);

        if (userData) {
          console.log('User authenticated:', userData.email);
          setUser(userData);
          setIsAuthenticated(true);
          setupTokenRefresh();
        } else {
          throw new Error('Failed to extract user data from token');
        }
      } catch (error) {
        console.error('Invalid token format:', error);
        ClientAuth.clearAuth();
        throw error; // Re-throw so caller can handle it
      }
    },
    [setupTokenRefresh],
  );

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
      ClientAuth.clearAuth();

      // Redirect to home page
      if (pathname !== '/') {
        router.push('/');
      }
    }
  }, [router, pathname]);

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
