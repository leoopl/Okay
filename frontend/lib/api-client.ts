import { ClientAuth } from '@/app/actions/client-auth';

const API_URL = process.env.API_URL;

/**
 * Custom API error with status code and response data
 */
export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

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
        'X-Requested-With': 'XMLHttpRequest', // CSRF protection
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

    let response: Response;

    try {
      // Make the request
      response = await fetch(url, requestOptions);

      // Handle 401 Unauthorized (token expired)
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
            // Return empty object for 204 No Content
            if (retryResponse.status === 204) {
              return {} as T;
            }

            // Parse JSON for other responses
            return (await retryResponse.json()) as T;
          }

          // Handle error in retry
          let errorData;
          try {
            errorData = await retryResponse.json();
          } catch (e) {
            errorData = { message: retryResponse.statusText };
          }

          throw new ApiError(
            errorData.message || `Request failed after token refresh: ${retryResponse.status}`,
            retryResponse.status,
            errorData,
          );
        } catch (refreshError) {
          // If token refresh fails, clear auth and redirect to login
          ClientAuth.clearAuth();

          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            window.location.href = `/signin?expired=true&from=${encodeURIComponent(currentPath)}`;
          }

          throw new ApiError('Session expired. Please log in again.', 401);
        }
      }

      // Handle successful responses
      if (response.ok) {
        // Return empty object for 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        // Parse JSON for other responses
        return (await response.json()) as T;
      }

      // Handle other error responses
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText };
      }

      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData,
      );
    } catch (error) {
      // Network errors need special handling
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new ApiError('Network connection error. Please check your internet connection.', 0);
      }

      // Re-throw ApiErrors
      if (error instanceof ApiError) {
        throw error;
      }

      // Other unknown errors
      console.error('API request error:', error);
      throw new ApiError(
        `Unknown error: ${error instanceof Error ? error.message : String(error)}`,
        0,
      );
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
