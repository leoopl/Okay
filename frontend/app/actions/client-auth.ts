'use client';

import { UserProfile } from '@/lib/definitions';
import { jwtDecode } from 'jwt-decode';

// API URL (client-side)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Client-side auth utilities
export const ClientAuth = {
  /**
   * Set auth data in local storage after signin/signup
   */
  setAuth(accessToken: string): UserProfile | null {
    try {
      // Store token in localStorage
      localStorage.setItem('accessToken', accessToken);

      // Decode JWT to get user data
      const decodedToken = jwtDecode<any>(accessToken);

      // Create user profile from token data
      const user: UserProfile = {
        id: decodedToken.sub,
        email: decodedToken.email,
        name: decodedToken.name || '',
        surname: decodedToken.surname,
        roles: decodedToken.roles || [],
        permissions: decodedToken.permissions || [],
      };

      // Store user data
      localStorage.setItem('user', JSON.stringify(user));

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
      const userJson = localStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  /**
   * Get current access token
   */
  getToken(): string | null {
    return localStorage.getItem('accessToken');
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
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
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

  /**
   * Make an authenticated API request
   */
  async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh token
    };

    try {
      let response = await fetch(url, requestOptions);

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        try {
          // Try to refresh the token
          await this.refreshToken();

          // Retry the request with new token
          const newToken = this.getToken();
          response = await fetch(url, {
            ...requestOptions,
            headers: {
              ...requestOptions.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        } catch (error) {
          // If refresh fails, clear auth and throw
          this.clearAuth();
          throw new Error('Session expired. Please login again.');
        }
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      // Return successful response (or empty object for 204 No Content)
      return response.status === 204 ? {} : response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  },
};
