'use server';

import { cookies } from 'next/headers';
import { SignupFormSchema, SigninFormSchema, AuthActionResponse } from '@/lib/definitions';
import { redirect } from 'next/navigation';

const API_URL = process.env.API_URL;

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

  return response.json();
}

/**
 * Production-ready server action for user signin
 */
export async function signin(prevState: AuthActionResponse | undefined, formData: FormData) {
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

    // Make secure server-to-server request with proper error handling
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    });

    const result = await handleApiResponse(response);

    if (!result.success && (result.message || result.errors)) {
      return result;
    }

    // Handle invalid or unexpected response format
    if (!result.accessToken) {
      return {
        success: false,
        message: 'Unexpected server response. Please try again later.',
      };
    }

    // Set the access token in a secure cookie for client retrieval
    // This is a more secure approach than localStorage
    (await cookies()).set({
      name: 'access_token',
      value: result.accessToken,
      httpOnly: false, // Must be false to be accessible by clientAuth
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: result.expiresIn || 900, // Default 15 min in seconds
    });

    // Store CSRF token for use in future requests
    if (result.csrfToken) {
      (await cookies()).set({
        name: 'csrf_token',
        value: result.csrfToken,
        httpOnly: false, // Must be accessible from JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }

    // Refresh token is automatically handled by the API via HttpOnly cookie
  } catch (error: any) {
    console.error('Server-side login error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
  redirect('/dashboard');
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

    // Set the access token in a secure cookie for client retrieval
    (await cookies()).set({
      name: 'access_token',
      value: loginResult.accessToken,
      httpOnly: false, // Must be false to be accessible by clientAuth
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: loginResult.expiresIn || 900, // Default 15 min in seconds
    });

    // Store CSRF token
    if (loginResult.csrfToken) {
      (await cookies()).set({
        name: 'csrf_token',
        value: loginResult.csrfToken,
        httpOnly: false, // Must be accessible from JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60, // 24 hours
      });
    }
  } catch (error: any) {
    console.error('Server-side signup error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  redirect('/dashboard');
}

/**
 * Server action to handle logout
 */
export async function logout(): Promise<{ success: boolean; redirectUrl?: string }> {
  try {
    // Call the API to invalidate the token server-side
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        // Include CSRF token from cookie
        'X-CSRF-Token': (await cookies()).get('csrf_token')?.value || '',
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  // Clear the cookies
  (await cookies()).delete('access_token');
  (await cookies()).delete('csrf_token');
  // refresh_token is cleared by the API via HttpOnly cookie

  redirect('/');
}
