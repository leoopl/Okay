'use client';

import { UserProfile } from '@/lib/definitions';
import { jwtDecode } from 'jwt-decode';

const API_URL = process.env.API_URL;

const JWT_AUDIENCE = process.env.JWT_AUDIENCE;
const JWT_ISSUER = process.env.JWT_ISSUER;

interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  surname?: string;
  roles?: string[];
  permissions?: string[];
  exp: number;
  iat: number;
  jti: string;
  iss?: string;
  aud?: string;
}

// Client-side auth utilities
export const ClientAuth = {
  // Private memory token storage
  memoryToken: null as string | null,

  /**
   * Set auth data after signin/signup - more secure approach
   */
  setAuth(accessToken: string): UserProfile | null {
    try {
      if (!accessToken) {
        throw new Error('No access token provided');
      }

      // Validate token structure and claims
      const decodedToken = this.validateToken(accessToken);
      if (!decodedToken) {
        throw new Error('Invalid token format');
      }

      // In memory storage for access token (not persisted)
      // This protects against XSS while maintaining functionality
      this.memoryToken = accessToken;

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
   * Validate token format and basic claims
   * Note: This is not a security verification (that happens on the server)
   */
  validateToken(token: string): JwtPayload | null {
    try {
      const decoded = jwtDecode<JwtPayload>(token);

      // Basic validation
      const now = Math.floor(Date.now() / 1000);

      // Check required fields
      if (!decoded.sub || !decoded.email || !decoded.exp) {
        console.error('Token missing required claims');
        return null;
      }

      // Check expiration
      if (decoded.exp <= now) {
        console.error('Token is expired');
        return null;
      }

      // Check issuer if present
      if (decoded.iss && decoded.iss !== JWT_ISSUER) {
        console.error('Token has invalid issuer');
        return null;
      }

      // Check audience if present
      if (
        decoded.aud &&
        (Array.isArray(decoded.aud)
          ? !decoded.aud.includes(JWT_AUDIENCE)
          : decoded.aud !== JWT_AUDIENCE)
      ) {
        console.error('Token has invalid audience');
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  },

  /**
   * Check if token is expired or will expire soon
   */
  isTokenExpiring(token: string, bufferSeconds: number = 60): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Math.floor(Date.now() / 1000);

      // Token is expiring if it will expire within the buffer period
      return decoded.exp <= now + bufferSeconds;
    } catch (error) {
      // Invalid token is considered expired
      return true;
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
   * Get current access token from memory
   */
  getToken(): string | null {
    return this.memoryToken;
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
    sessionStorage.removeItem('user');
  },

  /**
   * Refresh access token using the HTTP-only refresh token cookie
   */
  async refreshToken(): Promise<string> {
    try {
      // Track when the refresh started (for metrics)
      const refreshStartTime = Date.now();

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        },
        credentials: 'include', // Important to include cookies
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Refresh token is invalid or expired');
        }
        throw new Error(`Failed to refresh token: ${response.status}`);
      }

      const data = await response.json();

      // Validate response
      if (!data.accessToken) {
        throw new Error('Invalid response from token refresh endpoint');
      }

      // Update stored token
      this.setAuth(data.accessToken);

      // Metrics logging if needed
      console.debug(`Token refreshed successfully in ${Date.now() - refreshStartTime}ms`);

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
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        },
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
   * Make an authenticated API request with automatic token refresh
   * Note: prefer using ApiClient class instead for more structured API calls
   */
  async fetchWithAuth(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Clone and prepare request options
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection
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

      // Proactive token refresh if token is expiring soon
      if (this.isTokenExpiring(token)) {
        try {
          const newToken = await this.getRefreshedToken();
          requestOptions.headers = {
            ...requestOptions.headers,
            Authorization: `Bearer ${newToken}`,
          };
        } catch (error) {
          // If refresh fails, continue with old token and let error handling take over
          console.warn('Proactive token refresh failed, continuing with existing token');
        }
      }
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
