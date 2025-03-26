'use server';

import { SignupFormSchema, SigninFormSchema, FormState } from '@/lib/definitions';
import { auth0 } from '@/lib/auth0';
import { redirect } from 'next/navigation';

/**
 * Server action for handling user signup
 * Validates input and redirects to Auth0 signup/login
 */
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

    // Store signup data in session for use after Auth0 authentication
    // We'll convert this to use Auth0's connection options to pre-fill the signup form
    const loginUrl = new URL('/api/auth/login', process.env.AUTH0_BASE_URL!);
    loginUrl.searchParams.set('signup', 'true');
    loginUrl.searchParams.set('email', signupData.email);

    // Redirect to Auth0 login/signup
    redirect(loginUrl.toString());
  } catch (error) {
    console.error('Signup error:', error);
    return {
      message: 'An error occurred during registration. Please try again.',
    };
  }
}

/**
 * Server action for handling user signin
 * Validates input and redirects to Auth0 login
 */
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

    // Redirect to Auth0 login with email prefilled
    const loginUrl = new URL('/api/auth/login', process.env.AUTH0_BASE_URL!);
    loginUrl.searchParams.set('email', signinData.email);

    // Redirect to Auth0 login
    redirect(loginUrl.toString());
  } catch (error) {
    console.error('Signin error:', error);
    return {
      message: 'An error occurred during login. Please try again.',
    };
  }
}

/**
 * Server action for logging out the user
 */
export async function logout() {
  // Redirect to Auth0 logout endpoint
  redirect('/api/auth/logout');
}

/**
 * Helper function to get current user from Auth0 session
 */
export async function getCurrentUser() {
  const session = await auth0.getSession();
  return session?.user || null;
}
