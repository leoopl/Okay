'use server';

import { cookies } from 'next/headers';
import { SignupFormSchema, SigninFormSchema, AuthActionResponse } from '@/lib/definitions';

// API URL (server-side)
const API_URL = process.env.API_URL || 'http://localhost:3001/api';

// Enhanced error handling for API responses
async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    // Try to parse error response as JSON
    try {
      const errorData = await response.json();
      if (errorData.message) {
        return { success: false, message: errorData.message };
      }

      // Handle validation errors
      if (errorData.errors) {
        return { success: false, errors: errorData.errors };
      }
    } catch (e) {
      // If error response isn't valid JSON, use status text
      return {
        success: false,
        message: `Authentication failed (${response.status}: ${response.statusText})`,
      };
    }

    // Fallback error message
    return {
      success: false,
      message: 'Authentication failed. Please try again.',
    };
  }

  // Parse success response
  const data = await response.json();
  console.log('API response:', data);
  return { success: true, ...data };
}

/**
 * Production-ready server action for user signin
 */
export async function signin(
  prevState: AuthActionResponse | undefined,
  formData: FormData,
): Promise<AuthActionResponse> {
  // Validate form data
  const validatedFields = SigninFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  // Return validation errors if any
  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const credentials = validatedFields.data;
    console.log('Login attempt for:', credentials.email);

    // Make secure server-to-server request with proper error handling
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    });

    console.log('Login response status:', response.status);
    const result = await handleApiResponse(response);
    console.log('Processed result:', {
      ...result,
      accessToken: result.accessToken ? '[REDACTED]' : undefined,
    });

    if (!result.success && (result.message || result.errors)) {
      return result;
    }

    // Handle invalid or unexpected response format
    if (!result.accessToken) {
      return {
        success: false,
        message: 'Unexpected server response: No access token returned.',
      };
    }

    // Return success with the token
    return {
      success: true,
      token: result.accessToken,
    };
  } catch (error: any) {
    console.error('Server-side login error:', error);
    return {
      success: false,
      message: `Login error: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Production-ready server action for user signup
 */
export async function signup(
  prevState: AuthActionResponse | undefined,
  formData: FormData,
): Promise<AuthActionResponse> {
  // Validate form data
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    surname: formData.get('surname'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
    birthdate: formData.get('birthdate')
      ? new Date(formData.get('birthdate') as string)
      : undefined,
    gender: formData.get('gender'),
  });

  // Return validation errors if any
  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Remove confirmation password before sending to API
    const { confirm, ...signupData } = validatedFields.data;

    // Create user account (server-to-server request)
    const createResponse = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
      cache: 'no-store',
    });

    const createResult = await handleApiResponse(createResponse);

    if (!createResult.success && (createResult.message || createResult.errors)) {
      return createResult;
    }

    // Login with the new credentials
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupData.email,
        password: signupData.password,
      }),
      cache: 'no-store',
    });

    const loginResult = await handleApiResponse(loginResponse);

    if (!loginResult.success && (loginResult.message || loginResult.errors)) {
      return {
        success: false,
        message: loginResult.message || 'Account created but login failed. Please try signing in.',
      };
    }

    // Return success with the token
    return {
      success: true,
      token: loginResult.accessToken,
    };
  } catch (error: any) {
    console.error('Server-side signup error:', error);
    return {
      success: false,
      message: `Signup error: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Server action to handle logout
 */
export async function logout(): Promise<{ success: boolean }> {
  try {
    // Clear the cookies
    (
      await // Clear the cookies
      cookies()
    ).delete('access_token');
    (await cookies()).delete('refresh_token');

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}
