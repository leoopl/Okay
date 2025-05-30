'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession, refreshServerToken } from './server-auth';

const API_URL = process.env.API_URL;

export type OAuthStatusResponse = {
  hasPassword: boolean;
  linkedAccounts: {
    google: boolean;
    auth0: boolean;
  };
  primaryProvider: string | null;
  canUnlinkOAuth: boolean;
};

export type OAuthActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Get OAuth account status for current user
 */
export async function getOAuthStatus(): Promise<OAuthStatusResponse | null> {
  try {
    const session = await getServerSession();
    if (!session) {
      return null;
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return null;
      }
    }

    const currentToken = cookieStore.get('access_token')?.value;

    const response = await fetch(`${API_URL}/auth/oauth/status`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to fetch OAuth status:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching OAuth status:', error);
    return null;
  }
}

/**
 * Unlink Google account from current user
 */
export async function unlinkGoogleAccount(
  prevState: OAuthActionResponse | undefined,
  formData: FormData,
): Promise<OAuthActionResponse> {
  try {
    const session = await getServerSession();
    if (!session) {
      return { success: false, error: 'Você precisa estar logado para desvincular sua conta' };
    }

    const cookieStore = await cookies();
    const csrfToken = cookieStore.get('csrf_token')?.value || '';
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      const refreshed = await refreshServerToken();
      if (!refreshed) {
        return { success: false, error: 'Sua sessão expirou. Por favor, faça login novamente.' };
      }
    }

    const currentToken = cookieStore.get('access_token')?.value;

    const response = await fetch(`${API_URL}/auth/google/unlink`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
        Authorization: `Bearer ${currentToken}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: 'Sua sessão expirou. Por favor, faça login novamente.',
        };
      }

      const errorData = await response.json();
      return {
        success: false,
        error: errorData.message || 'Erro ao desvincular conta Google',
      };
    }

    return {
      success: true,
      message: 'Conta Google desvinculada com sucesso',
    };
  } catch (error) {
    console.error('Error unlinking Google account:', error);
    return {
      success: false,
      error: 'Ocorreu um erro ao desvincular sua conta Google. Tente novamente mais tarde.',
    };
  }
}

/**
 * Generate state parameter and redirect to Google OAuth
 * Updated to handle redirectUrl properly
 */
export async function initiateGoogleOAuth(
  linkMode: boolean = false,
  redirectUrl?: string,
): Promise<never> {
  try {
    // Generate state parameter for CSRF protection
    const state = generateSecureState();

    // Store state in cookie for later validation
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'oauth_state',
      value: state,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    });

    // Store link mode in cookie
    if (linkMode) {
      cookieStore.set({
        name: 'oauth_link_mode',
        value: 'true',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60, // 10 minutes
      });
    }

    // Store redirect URL in cookie if provided
    if (redirectUrl) {
      cookieStore.set({
        name: 'oauth_redirect_url',
        value: redirectUrl,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 10 * 60, // 10 minutes
      });
    }

    // Construct Google OAuth URL
    const baseUrl = linkMode ? `${API_URL}/auth/google/link` : `${API_URL}/auth/google`;
    const oauthUrl = new URL(baseUrl);
    oauthUrl.searchParams.set('state', state);

    if (redirectUrl) {
      oauthUrl.searchParams.set('redirect_url', redirectUrl);
    }

    // Redirect to Google OAuth
    redirect(oauthUrl.toString());
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    throw new Error('Failed to initiate Google OAuth');
  }
}

/**
 * Generate cryptographically secure state parameter
 */
function generateSecureState(): string {
  // Use crypto.randomUUID() for secure random state
  return crypto.randomUUID().replace(/-/g, '');
}
