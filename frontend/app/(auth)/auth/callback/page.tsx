'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface CallbackState {
  status: 'loading' | 'success' | 'error';
  message?: string;
  errorCode?: string;
  isNewUser?: boolean;
  redirectTo?: string;
}

export default function OAuthCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<LoadingState />}>
          <CallbackHandler />
        </Suspense>
      </div>
    </div>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>({ status: 'loading' });
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  // Auto-redirect countdown for success
  useEffect(() => {
    if (state.status === 'success' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            const redirectUrl = state.redirectTo || '/dashboard';
            router.push(redirectUrl);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [state.status, countdown, router, state.redirectTo]);

  const handleOAuthCallback = async () => {
    try {
      // Check for errors first
      const error = searchParams.get('error');
      if (error) {
        const errorDescription = searchParams.get('error_description');
        setState({
          status: 'error',
          errorCode: error,
          message: errorDescription || 'Authentication failed',
        });
        return;
      }

      // Check for success parameters
      const success = searchParams.get('success');
      const sessionId = searchParams.get('session_id');
      const isNewUser = searchParams.get('is_new_user') === 'true';
      const redirectTo = searchParams.get('redirect_to') || '/dashboard';

      if (success === 'true' && sessionId) {
        // Verify session is active by checking cookie
        const sessionActive = document.cookie.includes('session-active=true');

        if (!sessionActive) {
          // Wait a bit for cookies to be set
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Check again
          const sessionActiveRetry = document.cookie.includes('session-active=true');
          if (!sessionActiveRetry) {
            throw new Error('Session cookie not found');
          }
        }

        setState({
          status: 'success',
          message: isNewUser
            ? 'Conta criada com sucesso! Bem-vindo ao Okay.'
            : 'Login realizado com sucesso!',
          isNewUser,
          redirectTo,
        });

        // Clear any stored OAuth data
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('oauth_redirect_url');
          sessionStorage.removeItem('oauth_attempt_time');
        }
      } else {
        throw new Error('Invalid callback parameters');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setState({
        status: 'error',
        errorCode: 'unexpected_error',
        message: 'Ocorreu um erro durante a autenticação. Tente novamente.',
      });
    }
  };

  if (state.status === 'loading') {
    return <LoadingState />;
  }

  if (state.status === 'success') {
    return (
      <SuccessState message={state.message!} countdown={countdown} isNewUser={state.isNewUser} />
    );
  }

  return (
    <ErrorState
      errorCode={state.errorCode!}
      message={state.message!}
      onRetry={() => router.push('/signin')}
    />
  );
}

function LoadingState() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Finalizando autenticação...</h2>
            <p className="mt-2 text-gray-600">
              Por favor, aguarde enquanto validamos sua autenticação.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SuccessState({
  message,
  countdown,
  isNewUser,
}: {
  message: string;
  countdown: number;
  isNewUser?: boolean;
}) {
  return (
    <Card className="border-green-200">
      <CardContent className="pt-6">
        <div className="space-y-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
          <div>
            <h2 className="text-xl font-semibold text-green-900">
              {isNewUser ? 'Bem-vindo ao Okay!' : 'Login realizado!'}
            </h2>
            <p className="mt-2 text-green-700">{message}</p>
          </div>

          {isNewUser && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                Como novo usuário, recomendamos completar seu perfil para uma experiência
                personalizada.
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-500">
            Redirecionando automaticamente em {countdown} segundos...
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  errorCode,
  message,
  securityWarnings,
  onRetry,
}: {
  errorCode: string;
  message: string;
  securityWarnings?: string[];
  onRetry: () => void;
}) {
  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800">
          <AlertCircle className="h-5 w-5" />
          Falha na Autenticação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-red-700">{message}</p>

        {securityWarnings && securityWarnings.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Problemas de segurança detectados:</p>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {securityWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onRetry} className="flex-1">
            Tentar Novamente
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">Voltar ao Início</Link>
          </Button>
        </div>

        <div className="text-center text-xs text-gray-500">Código do erro: {errorCode}</div>
      </CardContent>
    </Card>
  );
}
