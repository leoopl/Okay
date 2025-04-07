'use client';

import { useEffect } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { getCookie } from 'cookies-next';

/**
 * SessionInit component
 *
 * This component handles the initial authentication status when the app loads.
 * It checks for access tokens in cookies and initializes the auth state.
 */
export default function SessionInit() {
  const { setAccessToken, isLoading } = useAuth();

  useEffect(() => {
    // Check for access token cookie on initial load
    const accessToken = getCookie('access_token')?.toString();

    if (accessToken) {
      // Initialize the authentication with the token
      setAccessToken(accessToken);

      // Remove the token from cookies after reading it
      // This is more secure as we'll store it in memory only
      document.cookie = 'access_token=; Max-Age=0; path=/; domain=' + window.location.hostname;
    }
  }, [setAccessToken]);

  // Don't render anything - this is just for initialization
  return null;
}
