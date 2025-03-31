import { ClientAuth } from '@/app/actions/client-auth';

const API_URL = process.env.API_URL;

/**
 * API client that handles authentication and token refresh
 */
export class ApiClient {
  /**
   * Make an authenticated request to the API
   */
  static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    const token = ClientAuth.getToken();
    if (token) {
      requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    try {
      // Make the request
      const response = await fetch(url, requestOptions);

      // Handle successful responses
      if (response.ok) {
        // Return empty object for 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        // Parse JSON for other responses
        return (await response.json()) as T;
      }

      // Handle 401 Unauthorized - Try to refresh token
      if (response.status === 401) {
        try {
          // Use the centralized refresh method (prevents race conditions)
          const newToken = await ClientAuth.getRefreshedToken();

          // Retry the original request with the new token
          const retryOptions = {
            ...requestOptions,
            headers: {
              ...requestOptions.headers,
              Authorization: `Bearer ${newToken}`,
            },
          };

          const retryResponse = await fetch(url, retryOptions);

          if (retryResponse.ok) {
            if (retryResponse.status === 204) {
              return {} as T;
            }
            return (await retryResponse.json()) as T;
          }

          // If retry failed, throw error
          throw new Error(`API request failed: ${retryResponse.status}`);
        } catch (refreshError) {
          // If token refresh fails, clear auth and redirect to login
          ClientAuth.clearAuth();
          window.location.href = '/signin?expired=true';
          throw new Error('Session expired. Please log in again.');
        }
      }

      // Handle other errors with better error extraction
      const errorData = await response
        .json()
        .catch(() => ({ message: `HTTP error ${response.status}` }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    } catch (error) {
      console.error('API request error:', error);

      // Network errors need special handling
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('Network connection error. Please check your internet connection.');
      }

      throw error;
    }
  }

  /**
   * GET request
   */
  static async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  static async post<T>(endpoint: string, data: any = {}, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  static async put<T>(endpoint: string, data: any = {}, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  static async patch<T>(endpoint: string, data: any = {}, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  static async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
