'use server';

import { SignupFormSchema, SigninFormSchema, FormState } from '@/lib/definitions';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface SignupDTO {
  name: string;
  surname: string;
  email: string;
  password: string;
  gender?: string;
  birthdate: Date;
}

interface SigninDTO {
  email: string;
  password: string;
}

export async function signup(state: FormState, formData: FormData) {
  // Validate form fields using Zod
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

  // If validation fails, return errors
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    // Remove confirmation password before sending to API
    const { confirm, ...signupData } = validatedFields.data;

    // Make API request to register endpoint
    const res = await fetch(`${process.env.API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData as SignupDTO),
      credentials: 'include', // Important for cookie handling
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      return {
        message: errorData?.message || 'Registration failed. Please try again.',
      };
    }

    // Parse user data from response
    const data = await res.json();

    // Store user basic info in a client-accessible cookie
    // This is just for UI state - auth is handled by HttpOnly cookies
    (await cookies()).set('user', JSON.stringify(data.user), {
      httpOnly: false, // Client accessible
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15, // 15 minutes (matching access token)
      path: '/',
    });

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    return {
      message: 'An error occurred during registration. Please try again.',
    };
  }
}

export async function signin(state: FormState, formData: FormData) {
  // Validate form fields
  const validatedFields = SigninFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  // If validation fails, return errors
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const signinData = validatedFields.data;

    // Make API request to signin endpoint
    const res = await fetch(`${process.env.API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signinData as SigninDTO),
      credentials: 'include', // Important for cookie handling
    });

    if (!res.ok) {
      return {
        message: 'Invalid email or password. Please try again.',
      };
    }

    // Parse user data from response
    const data = await res.json();

    // Store user basic info in a client-accessible cookie
    (await cookies()).set('user', JSON.stringify(data.user), {
      httpOnly: false, // Client accessible
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15, // 15 minutes (matching access token)
      path: '/',
    });

    // Redirect to dashboard
    redirect('/dashboard');
  } catch (error) {
    return {
      message: 'An error occurred during login. Please try again.',
    };
  }
}

export async function logout() {
  try {
    await fetch(`${process.env.API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    // Clear the user cookie
    (await cookies()).delete('user');

    // Redirect to home page
    redirect('/');
  } catch (error) {
    // If API call fails, still clear cookies and redirect
    (await cookies()).delete('user');
    redirect('/');
  }
}

// Helper function to get current user from cookie
export async function getCurrentUser() {
  const userCookie = (await cookies()).get('user');
  if (!userCookie) return null;

  try {
    return JSON.parse(userCookie.value);
  } catch (error) {
    return null;
  }
}
