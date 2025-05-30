'use server';

import { cookies } from 'next/headers';
import {
  SignupFormSchema,
  SigninFormSchema,
  AuthActionResponse,
  UserProfile,
} from '@/lib/definitions';
import { redirect } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

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
 * Set authentication cookies after successful login/signup
 */
async function setAuthCookies(result: any): Promise<void> {
  console.log('Setting auth cookies');

  const cookieStore = await cookies();

  // Set access token
  cookieStore.set({
    name: 'access_token',
    value: result.accessToken,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: result.expiresIn || 900,
  });

  // Set CSRF token if provided
  if (result.csrfToken) {
    cookieStore.set({
      name: 'csrf_token',
      value: result.csrfToken,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });
  }
  // Set a flag to indicate fresh login for profile completion
  cookieStore.set({
    name: 'fresh_login',
    value: 'true',
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60, // 1 minute - just enough for the client to detect it
  });
}

/**
 * Production-ready server action for user signin
 */
export async function signin(
  _: AuthActionResponse | undefined,
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
    console.log('Making login request to API');

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

    await setAuthCookies(result);
  } catch (error: any) {
    console.error('Server-side login error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  console.log('Redirecting to profile');
  redirect('/profile');
}

/**
 * Production-ready server action for user signup
 */
export async function signup(
  _: AuthActionResponse | undefined,
  formData: FormData,
): Promise<AuthActionResponse> {
  // Validate form data
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
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

    // Auto-login after signup
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

    await setAuthCookies(loginResult);
  } catch (error: any) {
    console.error('Server-side signup error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }

  // Redirect to profile where profile completion dialog will show
  redirect('/profile');
}

/**
 * Complete user profile after initial signup
 */
export async function completeProfile(
  prevState: AuthActionResponse | undefined,
  formData: FormData,
): Promise<AuthActionResponse> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, message: 'You must be logged in to complete your profile' };
    }

    // Validate profile completion data
    const profileData = {
      name: formData.get('name') as string,
      surname: formData.get('surname') as string,
      gender: formData.get('gender') as string,
      birthdate: formData.get('birthdate') as string,
    };

    // Basic validation
    if (!profileData.name || profileData.name.length < 2) {
      return {
        success: false,
        errors: { name: ['Nome deve ter pelo menos 2 caracteres'] },
      };
    }

    const apiUrl = process.env.API_URL;
    const userId = session.id;
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, message: 'Your session has expired. Please log in again.' };
      }
    }

    const currentToken = cookieStore.get('access_token')?.value;

    const response = await fetch(`${apiUrl}/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Authorization: `Bearer ${currentToken}`,
      },
      credentials: 'include',
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          message: 'Your session has expired. Please log in again.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || 'Error completing profile',
      };
    }

    return {
      success: true,
      message: 'Profile completed successfully',
    };
  } catch (error) {
    console.error('Error completing profile:', error);
    return {
      success: false,
      message: 'An error occurred while completing your profile. Please try again later.',
    };
  }
}

/**
 * Server action to handle logout
 */
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';

    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    });
  } catch (error) {
    console.error('Logout error:', error);
  }

  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('csrf_token');

  redirect('/');
}

/**
 * Validate token and return user data (server-side only)
 * @returns User profile if authenticated, null otherwise
 */
export async function getServerSession(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  // No token, no session
  if (!accessToken) {
    return null;
  }

  try {
    // Decode token to get basic info and check expiration
    const decoded: any = jwtDecode(accessToken);

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);

    if (decoded.exp && decoded.exp < now) {
      // Token is expired - try to refresh
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return null;
      }

      // If refresh succeeded, try again with the new token
      return getServerSession();
    }

    // Get full user profile data from API
    const apiUrl = process.env.API_URL;
    const userId = decoded.sub;

    // Fetch the user profile data
    const response = await fetch(`${apiUrl}/users/${userId}`, {
      headers: {
        Cookie: cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; '),
        Authorization: `Bearer ${accessToken}`,
      },
      next: { tags: ['user-profile'] },
    });

    if (!response.ok) {
      // If API call fails, create a basic profile from the token
      return {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || '',
        surname: decoded.surname || '',
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
      };
    }

    // Return the full user profile
    const userData = await response.json();
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      surname: userData.surname,
      gender: userData.gender,
      birthdate: userData.birthdate,
      roles: userData.roles || decoded.roles || [],
      permissions: decoded.permissions || [],
      consentToDataProcessing: userData.consentToDataProcessing,
      consentToResearch: userData.consentToResearch,
      consentToMarketing: userData.consentToMarketing,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      profilePictureUrl: userData.profilePictureUrl,
      profilePictureUpdatedAt: userData.profilePictureUpdatedAt,
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return null;
  }
}

/**
 * Refresh the access token using the refresh token (server-side only)
 * @returns boolean indicating if refresh was successful
 */
export async function refreshServerToken(): Promise<boolean> {
  try {
    const cookieStore = await cookies();

    // Check if we already have an access token
    const currentToken = cookieStore.get('access_token');

    if (currentToken) {
      // Decode token to check expiration
      const decoded: any = jwtDecode(currentToken.value);
      const now = Math.floor(Date.now() / 1000);

      // If token is not expired and has more than 5 minutes left, don't refresh
      if (decoded.exp && decoded.exp > now + 300) {
        return true;
      }
    }

    // Make server-to-server request to refresh token
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieStore
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join('; '),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();

    if (!data.accessToken) {
      console.error('No access token in refresh response');
      return false;
    }

    await setAuthCookies(data);
    return true;
  } catch (error) {
    console.error('Server token refresh error:', error);
    return false;
  }
}
