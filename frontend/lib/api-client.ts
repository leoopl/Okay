import { getAccessToken, getCsrfToken } from './utils';

/**
 * API Client for making authenticated requests
 * Handles auth tokens, CSRF tokens, and error handling
 */
const API_URL = process.env.API_URL;

// Error types for better handling
export enum ApiErrorType {
  AUTH = 'auth',
  VALIDATION = 'validation',
  SERVER = 'server',
  NETWORK = 'network',
  UNKNOWN = 'unknown',
}

// Custom API error class
export class ApiError extends Error {
  type: ApiErrorType;
  status?: number;
  details?: any;

  constructor(
    message: string,
    type: ApiErrorType = ApiErrorType.UNKNOWN,
    status?: number,
    details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  /**
   * Make an authenticated request to the API
   */
  static async request<T>(
    endpoint: string,
    options: RequestInit = {},
    includeCsrf = true,
  ): Promise<T> {
    const url = `${API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Clone and prepare request options
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest', // Basic CSRF protection
        ...options.headers,
      },
      credentials: 'include', // Include cookies for refresh token
    };

    // Add Authorization header if we have a token
    const token = getAccessToken();
    if (token) {
      requestOptions.headers = {
        ...requestOptions.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    // Add CSRF token if available
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'X-CSRF-Token': csrfToken,
      };
    }

    try {
      // Make the request
      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        // Handle different error types
        if (response.status === 401) {
          // Token expired or invalid
          throw new ApiError('Authentication failed', ApiErrorType.AUTH, response.status);
        }

        if (response.status === 403) {
          throw new ApiError('Access denied', ApiErrorType.AUTH, response.status);
        }

        if (response.status === 422) {
          // Validation error
          const data = await response.json();
          throw new ApiError(
            'Validation failed',
            ApiErrorType.VALIDATION,
            response.status,
            data.errors,
          );
        }

        if (response.status >= 500) {
          throw new ApiError('Server error', ApiErrorType.SERVER, response.status);
        }

        // Generic error handling
        let errorMsg = 'An error occurred';
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // If can't parse JSON, use status text
          errorMsg = response.statusText || errorMsg;
        }

        throw new ApiError(errorMsg, ApiErrorType.UNKNOWN, response.status);
      }

      // Handle empty responses
      return response.status === 204 ? ({} as T) : await response.json();
    } catch (error) {
      // Already handled API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Network error', ApiErrorType.NETWORK);
      }

      // Unexpected errors
      console.error('API request error:', error);
      throw new ApiError('Unexpected error occurred', ApiErrorType.UNKNOWN);
    }
  }

  /**
   * GET request
   */
  static async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, true);
  }

  /**
   * POST request
   */
  static async post<T>(endpoint: string, data: any = {}, options: RequestInit = {}): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: JSON.stringify(data),
      },
      true,
    );
  }

  /**
   * PUT request
   */
  static async put<T>(endpoint: string, data: any = {}, options: RequestInit = {}): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body: JSON.stringify(data),
      },
      true,
    );
  }

  /**
   * PATCH request
   */
  static async patch<T>(endpoint: string, data: any = {}, options: RequestInit = {}): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body: JSON.stringify(data),
      },
      true,
    );
  }

  /**
   * DELETE request
   */
  static async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' }, true);
  }
}
