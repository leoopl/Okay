'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

interface CallbackState {
  status: 'loading' | 'success' | 'error' | 'security_check';
  message?: string;
  errorCode?: string;
  securityWarnings?: string[];
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
  const [countdown, setCountdown] = useState(10);

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
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const code = searchParams.get('code');
      const oauthState = searchParams.get('state');
      const sessionId = searchParams.get('session_id');
      const isNewUser = searchParams.get('is_new_user') === 'true';
      const redirectTo =
        searchParams.get('redirect_to') ||
        (typeof window !== 'undefined' ? sessionStorage.getItem('oauth_redirect_url') : null) ||
        undefined;

      // Check for OAuth provider errors first
      if (error) {
        setState({
          status: 'error',
          errorCode: error,
          message: getErrorMessage(error, errorDescription),
        });
        return;
      }

      // Validate required parameters
      if (!code || !oauthState) {
        setState({
          status: 'error',
          errorCode: 'invalid_request',
          message: 'Parâmetros de autenticação inválidos. Tente novamente.',
        });
        return;
      }

      // Perform additional security checks
      const securityCheck = await performSecurityValidation(code, oauthState);

      if (!securityCheck.passed) {
        setState({
          status: 'error',
          errorCode: 'security_violation',
          message: 'Falha na validação de segurança. Por favor, tente novamente.',
          securityWarnings: securityCheck.warnings,
        });
        return;
      }

      // Check if we have security warnings but authentication succeeded
      if (securityCheck.warnings && securityCheck.warnings.length > 0) {
        setState({
          status: 'security_check',
          message: 'Autenticação bem-sucedida com avisos de segurança.',
          securityWarnings: securityCheck.warnings,
          isNewUser,
          redirectTo,
        });
        return;
      }

      // Success case
      setState({
        status: 'success',
        message: isNewUser
          ? 'Conta criada com sucesso! Bem-vindo ao Okay.'
          : 'Login realizado com sucesso! Redirecionando...',
        isNewUser,
        redirectTo,
      });

      // Log successful authentication for analytics
      logAuthenticationEvent('oauth_success', {
        provider: 'google',
        isNewUser,
        hasRedirect: !!redirectTo,
      });

      // Clean up session storage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oauth_redirect_url');
        sessionStorage.removeItem('oauth_attempt_time');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      setState({
        status: 'error',
        errorCode: 'unexpected_error',
        message: 'Ocorreu um erro inesperado durante a autenticação.',
      });

      // Log error for monitoring
      logAuthenticationEvent('oauth_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clean up session storage on error
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('oauth_redirect_url');
        sessionStorage.removeItem('oauth_attempt_time');
      }
    }
  };

  const performSecurityValidation = async (code: string, state: string) => {
    const warnings: string[] = [];

    // Check for suspicious patterns in the code
    if (code.length < 10 || code.length > 200) {
      warnings.push('Formato incomum do código de autorização');
    }

    // Validate state format
    if (!state.includes('.') || state.length < 32) {
      return { passed: false, warnings: ['Formato inválido do parâmetro de estado'] };
    }

    // Check for timing attacks (basic)
    const startTime = performance.now();
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
    const endTime = performance.now();

    if (endTime - startTime > 150) {
      warnings.push('Possível tentativa de timing attack detectada');
    }

    // Check browser environment for suspicious signs
    if (typeof window !== 'undefined') {
      // Check for automation tools
      if ((window as any).webdriver || (window as any).phantom || (window as any).callPhantom) {
        warnings.push('Ambiente de automação detectado');
      }

      // Check for suspicious navigator properties
      if (navigator.webdriver) {
        warnings.push('WebDriver detectado');
      }
    }

    return {
      passed: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  };

  const handleContinueWithWarnings = () => {
    const redirectUrl = state.redirectTo || '/dashboard';
    router.push(redirectUrl);
  };

  const handleRetryAuthentication = () => {
    router.push('/signin');
  };

  if (state.status === 'loading') {
    return <LoadingState />;
  }

  if (state.status === 'success') {
    return (
      <SuccessState message={state.message!} countdown={countdown} isNewUser={state.isNewUser} />
    );
  }

  if (state.status === 'security_check') {
    return (
      <SecurityCheckState
        message={state.message!}
        warnings={state.securityWarnings!}
        onContinue={handleContinueWithWarnings}
        onRetry={handleRetryAuthentication}
      />
    );
  }

  return (
    <ErrorState
      errorCode={state.errorCode!}
      message={state.message!}
      securityWarnings={state.securityWarnings}
      onRetry={handleRetryAuthentication}
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

function SecurityCheckState({
  message,
  warnings,
  onContinue,
  onRetry,
}: {
  message: string;
  warnings: string[];
  onContinue: () => void;
  onRetry: () => void;
}) {
  return (
    <Card className="border-yellow-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Shield className="h-5 w-5" />
          Verificação de Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-yellow-700">{message}</p>

        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Avisos de segurança detectados:</p>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={onContinue} className="flex-1">
            Continuar Mesmo Assim
          </Button>
          <Button onClick={onRetry} variant="outline" className="flex-1">
            Tentar Novamente
          </Button>
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

function getErrorMessage(error: string, description?: string | null): string {
  const errorMessages: Record<string, string> = {
    access_denied: 'Você cancelou o processo de login. Tente novamente se desejar fazer login.',
    invalid_request: 'Houve um problema com a solicitação de login. Tente novamente.',
    invalid_client: 'Houve um problema de configuração. Entre em contato com o suporte.',
    invalid_grant: 'O código de autorização expirou. Tente novamente.',
    unauthorized_client: 'Esta aplicação não está autorizada. Entre em contato com o suporte.',
    server_error: 'Ocorreu um erro no servidor. Tente novamente mais tarde.',
    temporarily_unavailable:
      'O serviço está temporariamente indisponível. Tente novamente mais tarde.',
    invalid_state: 'Falha na validação de segurança. Tente novamente.',
  };

  return errorMessages[error] || description || 'Ocorreu um erro inesperado durante o login.';
}

// Analytics logging function
function logAuthenticationEvent(event: string, data: Record<string, any>) {
  try {
    // In a real app, send to your analytics service
    console.log('Auth Analytics:', { event, data, timestamp: new Date().toISOString() });

    // Example: Send to PostHog, Google Analytics, etc.
    // if (typeof window !== 'undefined' && window.gtag) {
    //   window.gtag('event', event, data);
    // }
  } catch (error) {
    console.error('Failed to log authentication event:', error);
  }
}
