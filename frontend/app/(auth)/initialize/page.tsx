// app/(auth)/initialize/page.tsx
'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCookie, deleteCookie } from 'cookies-next';

export default function TokenInitializePage() {
  const { setAccessToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Get token from cookie instead of URL parameter
    const token = getCookie('access_token');

    if (token) {
      // Initialize auth with token
      setAccessToken(token.toString());

      // Delete the cookie immediately after use for security
      deleteCookie('access_token');

      // Redirect to dashboard
      router.replace('/dashboard');
    } else {
      // If no token, redirect to login
      router.replace('/signin');
    }
  }, [setAccessToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-lg">Initializing your session...</p>
      </div>
    </div>
  );
}
