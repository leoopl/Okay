'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignupFormSchema, SigninFormSchema, AuthActionResponse } from '@/lib/definitions';

// API URL (server-side)
const API_URL = process.env.API_URL;

/**
 * Server action for user signin
 * Handles credentials securely on the server side
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

    // Make secure server-to-server request
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || 'Authentication failed',
      };
    }

    // Get token response
    const tokenData = await response.json();

    // Set refresh token in HTTP-only cookie (secure)
    (await cookies()).set({
      name: 'refresh_token',
      value: tokenData.refreshToken || '', // Backend might use different property name
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    redirect('/dashboard');
  } catch (error: any) {
    console.error('Server-side login error:', error);
    return {
      success: false,
      message: 'An error occurred during authentication. Please try again.',
    };
  }
}

/**
 * Server action for user signup
 * Securely creates user and sets authentication
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

    if (!createResponse.ok) {
      const error = await createResponse.json();
      return {
        success: false,
        message: error.message || 'Failed to create account',
      };
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

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      return {
        success: false,
        message: error.message || 'Account created but failed to login',
      };
    }

    // Get token response
    const tokenData = await loginResponse.json();

    // Set refresh token in HTTP-only cookie (secure)
    (await cookies()).set({
      name: 'refresh_token',
      value: tokenData.refreshToken || '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    redirect('/dashboard');
  } catch (error: any) {
    console.error('Server-side signup error:', error);
    return {
      success: false,
      message: 'An error occurred during registration. Please try again.',
    };
  }
}
