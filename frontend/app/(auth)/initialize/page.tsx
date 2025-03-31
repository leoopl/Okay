'use client';

import { useAuth } from '@/providers/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function TokenInitializePage() {
  const { setAccessToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Initialize auth with the token from URL
      setAccessToken(token);

      // Redirect to dashboard
      router.replace('/dashboard');
    } else {
      // If no token, redirect to login
      router.replace('/signin');
    }
  }, [searchParams, setAccessToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-lg">Initializing your session...</p>
      </div>
    </div>
  );
}
