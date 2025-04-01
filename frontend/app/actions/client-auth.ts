'use client';

import { UserProfile } from '@/lib/definitions';
import { jwtDecode } from 'jwt-decode';

// API URL (client-side)
const API_URL = process.env.API_URL;

/**
 * This key is used to store the token in sessionStorage
 * as a backup in case of page refresh
 */
const TOKEN_STORAGE_KEY = 'okay_access_token';

// Client-side auth utilities
export const ClientAuth = {
  // Private memory token storage
  memoryToken: null as string | null,

  /**
   * Set auth data after signin/signup - more secure approach
   */
  setAuth(accessToken: string): UserProfile | null {
    try {
      // In memory storage for access token (not persisted)
      // This protects against XSS while maintaining functionality
      this.memoryToken = accessToken;

      // Store token in sessionStorage as backup
      // (still better than localStorage for security reasons)
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      } catch (e) {
        console.warn('Failed to store token in sessionStorage');
      }

      // Decode JWT to get user data
      const decodedToken = jwtDecode<any>(accessToken);

      // Create user profile from token data
      const user: UserProfile = {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name || '',
        surname: decodedToken.surname || '',
        roles: decodedToken.roles || [],
        permissions: decodedToken.permissions || [],
      };

      // Store only non-sensitive user data
      sessionStorage.setItem('user', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Error setting auth data:', error);
      this.clearAuth();
      return null;
    }
  },

  /**
   * Get stored user profile
   */
  getUser(): UserProfile | null {
    try {
      const userJson = sessionStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  /**
   * Get current access token from memory or sessionStorage
   */
  getToken(): string | null {
    // Try memory first
    if (this.memoryToken) {
      return this.memoryToken;
    }

    // Try sessionStorage as backup
    try {
      const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        // Restore token to memory
        this.memoryToken = token;
        return token;
      }
    } catch (e) {
      console.warn('Failed to retrieve token from sessionStorage');
    }

    return null;
  },

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.roles?.includes(role) || false;
  },

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions?.includes(permission) || false;
  },

  /**
   * Clear all auth data (for logout)
   */
  clearAuth(): void {
    this.memoryToken = null;
    try {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem('user');
    } catch (e) {
      console.warn('Failed to clear token from sessionStorage');
    }
  },

  /**
   * Refresh access token using the HTTP-only refresh token cookie
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Important to include cookies
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();

      // Update stored token
      this.setAuth(data.accessToken);

      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      this.clearAuth();
      throw error;
    }
  },

  /**
   * Logout on client side
   */
  async logout(): Promise<void> {
    try {
      const token = this.getToken();

      // Call logout endpoint
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local auth data
      this.clearAuth();
    }
  },

  // Single refresh promise to prevent multiple simultaneous refresh attempts
  refreshPromise: null as Promise<string> | null,

  /**
   * Handle token refresh with debouncing
   */
  async getRefreshedToken(): Promise<string> {
    // If a refresh is already in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create a new refresh promise
    this.refreshPromise = (async () => {
      try {
        const token = await this.refreshToken();
        return token;
      } finally {
        // Clear the promise when done (success or error)
        setTimeout(() => {
          this.refreshPromise = null;
        }, 100);
      }
    })();

    return this.refreshPromise;
  },

  /**
   * Make an authenticated API request
   */
  async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Clone and prepare request options
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh token
    };

    // Add Authorization header if we have a token
    const token = this.getToken();
    if (token) {
      requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      // Make the request
      let response = await fetch(url, requestOptions);

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        try {
          // Use the centralized refresh method (prevents race conditions)
          const newToken = await this.getRefreshedToken();

          // Retry the original request with the new token
          const retryOptions = {
            ...requestOptions,
            headers: {
              ...requestOptions.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };

          response = await fetch(url, retryOptions);

          // If still unauthorized after refresh, redirect to login
          if (response.status === 401) {
            this.clearAuth();
            window.location.href = '/signin?expired=true';
            throw new Error('Session expired. Please log in again.');
          }
        } catch (refreshError) {
          // If refresh fails, clear auth and redirect to login
          this.clearAuth();
          window.location.href = '/signin?expired=true';
          throw new Error('Session expired. Please log in again.');
        }
      }

      // Handle successful responses
      if (response.ok) {
        // Return empty object for 204 No Content
        if (response.status === 204) {
          return {};
        }

        // Parse JSON for other responses
        return await response.json();
      }

      // Handle other error responses
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    } catch (error) {
      console.error('API request failed:', error);

      // Network errors need special handling
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection error. Please check your internet connection.');
      }

      throw error;
    }
  },
};
