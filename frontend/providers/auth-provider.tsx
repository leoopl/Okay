'use client';

import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';
import { Loader2 } from 'lucide-react';
import { setupSessionTimeout } from '@/lib/encryption-utils';
import { UserProfile } from '@/lib/definitions';
import { refreshAccessToken } from '@/lib/api-client';
import { getAccessToken, getCsrfToken } from '@/lib/utils';

type AuthContextType = {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
};

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout in milliseconds (15 minutes)
const SESSION_TIMEOUT = 15 * 60 * 1000;

// Token refresh interval (14 minutes - refresh token before it expires)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

// Provider component
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Clear auth state
  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      setTokenRefreshInterval(null);
    }
  }, [tokenRefreshInterval]);

  // Set up automatic token refresh
  const setupTokenRefresh = useCallback(() => {
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
    }

    const intervalId = setInterval(async () => {
      try {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          clearAuthState();
          router.push('/signin?expired=true');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuthState();
        router.push('/signin?expired=true');
      }
    }, TOKEN_REFRESH_INTERVAL);

    setTokenRefreshInterval(intervalId);
  }, [clearAuthState, router]);

  // Initialize auth from access token in cookies
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors

      // Check for access token in cookies
      const accessToken = getAccessToken();

      if (!accessToken) {
        console.log('No access token found, trying to refresh');
        // No access token found, try to refresh
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          console.log('Token refresh failed');
          // If refresh failed, clear auth state
          clearAuthState();
          return;
        }
        console.log('Token refreshed successfully');
        // If refresh succeeded, try again with the new token
        initializeAuth();
        return;
      }

      // Decode token to get user information
      try {
        const decodedToken: any = jwtDecode(accessToken);

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (decodedToken.exp && decodedToken.exp < now) {
          console.log('Token expired, attempting refresh');
          // Try to refresh token
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            console.log('Token refresh failed');
            clearAuthState();
            return;
          }
          console.log('Token refreshed successfully');
          // If refresh successful, try to initialize again
          initializeAuth();
          return;
        }

        // Create user profile from token data
        const userProfile: UserProfile = {
          id: decodedToken.sub,
          email: decodedToken.email,
          name: decodedToken.name || '',
          surname: decodedToken.surname || '',
          roles: decodedToken.roles || [],
          permissions: decodedToken.permissions || [],
        };

        console.log('Authentication successful', userProfile);
        setUser(userProfile);
        setIsAuthenticated(true);
        setupTokenRefresh();
      } catch (err) {
        console.error('Error decoding token:', err);
        clearAuthState();
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      setError('Authentication error. Please try again.');
      clearAuthState();
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState, setupTokenRefresh]);

  // Set up session timeout for security
  useEffect(() => {
    let cleanupTimeout: (() => void) | null = null;

    if (isAuthenticated) {
      cleanupTimeout = setupSessionTimeout(() => {
        // Log out on inactivity
        logout();
        router.push('/signin?expired=true');
      }, SESSION_TIMEOUT);
    }

    return () => {
      if (cleanupTimeout) cleanupTimeout();
      if (tokenRefreshInterval) clearInterval(tokenRefreshInterval);
    };
  }, [isAuthenticated, router, tokenRefreshInterval]);

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();

    // Clean up on unmount
    return () => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
    };
  }, [initializeAuth]);

  // Logout function - uses server action
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Make a server-side logout request to blacklist tokens
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      if (!response.ok) {
        console.error('Logout error:', response.statusText);
      }

      // Clear auth state
      clearAuthState();

      // Clear cookies (this should be handled by the server)
      document.cookie = 'access_token=; Max-Age=0; path=/; samesite=lax';
      document.cookie = 'refresh_token=; Max-Age=0; path=/; samesite=lax';
      document.cookie = 'csrf_token=; Max-Age=0; path=/; samesite=lax';

      // Redirect is handled by the server action
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check if user has a specific role
  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user || !user.roles) return false;
      return user.roles.includes(role);
    },
    [user],
  );

  // Function to check if user has a specific permission
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user || !user.permissions) return false;
      return user.permissions.includes(permission);
    },
    [user],
  );

  // Create context value
  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      error,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, isAuthenticated, isLoading, error, hasRole, hasPermission],
  );

  // Show loading spinner during initial auth check
  if (isLoading && !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
