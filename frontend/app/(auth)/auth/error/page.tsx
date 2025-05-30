'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const returnTo = searchParams.get('return_to') || '/signin';

  useEffect(() => {
    // Auto-redirect countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(returnTo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, returnTo]);

  const errorMessages = {
    access_denied: {
      title: 'Login Cancelled',
      description: 'You cancelled the login process. You can try again if you want to sign in.',
      action: 'Try Again',
    },
    invalid_request: {
      title: 'Invalid Request',
      description: 'There was a problem with the login request. Please try again.',
      action: 'Try Again',
    },
    server_error: {
      title: 'Server Error',
      description: 'Our servers are having issues. Please try again in a few minutes.',
      action: 'Retry',
    },
    temporarily_unavailable: {
      title: 'Service Unavailable',
      description: 'The authentication service is temporarily unavailable. Please try again later.',
      action: 'Retry',
    },
  };

  const errorInfo = errorMessages[error as keyof typeof errorMessages] || {
    title: 'Authentication Error',
    description: errorDescription || 'An unexpected error occurred during authentication.',
    action: 'Try Again',
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-900">{errorInfo.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorInfo.description}</AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button onClick={() => router.push(returnTo)} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {errorInfo.action}
            </Button>

            <Button variant="outline" onClick={() => router.push('/')} className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          </div>

          <div className="text-center text-sm text-gray-500">
            Redirecting automatically in {countdown} seconds...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
