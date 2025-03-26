'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@auth0/auth0-spa-js';

// Define types for our Auth context
type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

// Create context with default values
const Auth0Context = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,
  login: async () => {},
  logout: async () => {},
  getAccessToken: async () => null,
});

// Custom hook to use Auth0 context
export const useAuth = () => useContext(Auth0Context);

export const Auth0Provider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const router = useRouter();

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/auth/me');

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);

          // Also fetch an access token for API calls
          const tokenResponse = await fetch('/api/auth/token');
          if (tokenResponse.ok) {
            const { accessToken } = await tokenResponse.json();
            setAccessToken(accessToken);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Authentication error'));
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async () => {
    try {
      // Store the current path for redirect after login
      const returnTo = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/auth/login?returnTo=${returnTo}`;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
    }
  };

  // Logout function
  const logout = async () => {
    try {
      window.location.href = '/api/auth/logout';
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
    }
  };

  // Function to get an access token for API calls
  const getAccessToken = async (): Promise<string | null> => {
    if (accessToken) return accessToken;

    try {
      const response = await fetch('/api/auth/token');
      if (response.ok) {
        const { accessToken } = await response.json();
        setAccessToken(accessToken);
        return accessToken;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get access token'));
      return null;
    }
  };

  return (
    <Auth0Context.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        error,
        login,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </Auth0Context.Provider>
  );
};
