import { useAuth } from '@/providers/auth0-provider';

// Base API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Client-side API client for making authenticated requests
 * Uses the Auth0 access token from context
 */
export const useApiClient = () => {
  const { getAccessToken } = useAuth();

  /**
   * Make an authenticated API request
   */
  const fetchApi = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
    const { requireAuth = true, ...fetchOptions } = options;
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Default headers
    const headers = new Headers(fetchOptions.headers);

    // Set content type if not provided and we have a body
    if (fetchOptions.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header if authentication is required
    if (requireAuth) {
      const token = await getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        throw new Error('Authentication required but no token available');
      }
    }

    // Make the request
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      // Try to get error details from response
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = { message: response.statusText };
      }

      // Create a custom error with status and details
      const error = new Error(errorDetails.message || 'API request failed') as Error & {
        status?: number;
        details?: any;
      };
      error.status = response.status;
      error.details = errorDetails;

      throw error;
    }

    // Parse JSON response
    return response.json() as Promise<T>;
  };

  /**
   * Convenience methods for common HTTP methods
   */
  return {
    get: <T>(endpoint: string, options?: RequestOptions) =>
      fetchApi<T>(endpoint, { ...options, method: 'GET' }),

    post: <T>(endpoint: string, data: any, options?: RequestOptions) =>
      fetchApi<T>(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
      }),

    put: <T>(endpoint: string, data: any, options?: RequestOptions) =>
      fetchApi<T>(endpoint, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    patch: <T>(endpoint: string, data: any, options?: RequestOptions) =>
      fetchApi<T>(endpoint, {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: <T>(endpoint: string, options?: RequestOptions) =>
      fetchApi<T>(endpoint, { ...options, method: 'DELETE' }),
  };
};

/**
 * Server-side API client for making authenticated requests
 * Accepts an access token to authenticate requests
 */
export class ServerApiClient {
  private accessToken?: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken;
  }

  /**
   * Make an authenticated API request
   */
  private async fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Default headers
    const headers = new Headers(options.headers);

    // Set content type if not provided and we have a body
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header if we have a token
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-2xx responses
    if (!response.ok) {
      // Try to get error details from response
      let errorDetails;
      try {
        errorDetails = await response.json();
      } catch (e) {
        errorDetails = { message: response.statusText };
      }

      // Create a custom error with status and details
      const error = new Error(errorDetails.message || 'API request failed') as Error & {
        status?: number;
        details?: any;
      };
      error.status = response.status;
      error.details = errorDetails;

      throw error;
    }

    // Parse JSON response
    return response.json() as Promise<T>;
  }

  /**
   * Convenience methods for common HTTP methods
   */
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetchApi<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data: any, options?: RequestInit): Promise<T> {
    return this.fetchApi<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: any, options?: RequestInit): Promise<T> {
    return this.fetchApi<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch<T>(endpoint: string, data: any, options?: RequestInit): Promise<T> {
    return this.fetchApi<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.fetchApi<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
