'use client';

import { Button } from '@/components/ui/button';
import { useState, useTransition, useEffect } from 'react';
import { initiateGoogleOAuth } from '@/lib/actions/server-oauth';
import { Loader2, AlertCircle, Shield, WifiOff } from 'lucide-react';
import GoogleIcon from '../common/GoogleIcon';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';

interface GoogleOAuthButtonProps {
  linkMode?: boolean;
  disabled?: boolean;
  className?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  redirectUrl?: string;
}

type ButtonState = 'idle' | 'loading' | 'error' | 'offline' | 'security_check';

export function GoogleOAuthButton({
  linkMode = false,
  disabled = false,
  className = '',
  onError,
  onSuccess,
  redirectUrl,
}: GoogleOAuthButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isOnline, setIsOnline] = useState(true);
  const [securityChecking, setSecurityChecking] = useState(false);
  const router = useRouter();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (buttonState === 'offline') {
        setButtonState('idle');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setButtonState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [buttonState]);

  // Reset error state after some time
  useEffect(() => {
    if (buttonState === 'error') {
      const timer = setTimeout(() => {
        setButtonState('idle');
        setErrorMessage('');
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [buttonState]);

  const performSecurityChecks = async (): Promise<boolean> => {
    setSecurityChecking(true);
    setButtonState('security_check');

    try {
      // Check for automation tools
      if (typeof window !== 'undefined') {
        // Basic bot detection
        const suspiciousProperties = [
          'webdriver',
          'phantom',
          'callPhantom',
          '__selenium_unwrapped',
          '__webdriver_evaluate',
          '__selenium_evaluate',
          '__webdriver_script_function',
          '__webdriver_script_func',
          '__webdriver_script_fn',
          '__fxdriver_evaluate',
          '__driver_unwrapped',
          '__webdriver_unwrapped',
          '__driver_evaluate',
          '__selenium_unwrapped',
          '__fxdriver_unwrapped',
        ];

        const foundSuspicious = suspiciousProperties.some(
          (prop) => (window as any)[prop] || (document as any)[prop] || (navigator as any)[prop],
        );

        if (foundSuspicious) {
          setErrorMessage('Ambiente de automação detectado. Use um navegador padrão.');
          setButtonState('error');
          return false;
        }

        // Check for devtools (basic)
        const devtools = {
          open: false,
          orientation: null as string | null,
        };

        const threshold = 160;

        setInterval(() => {
          if (
            window.outerHeight - window.innerHeight > threshold ||
            window.outerWidth - window.innerWidth > threshold
          ) {
            devtools.open = true;
            devtools.orientation =
              window.outerHeight - window.innerHeight > threshold ? 'vertical' : 'horizontal';
          } else {
            devtools.open = false;
            devtools.orientation = null;
          }
        }, 500);

        // Check for suspicious timing
        const startTime = performance.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const endTime = performance.now();

        if (endTime - startTime > 200) {
          console.warn('Slow execution detected, possible debugging');
        }
      }

      // Simulate network connectivity check
      try {
        await fetch('/api/health', {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(3000),
        });
      } catch (error) {
        setErrorMessage('Problemas de conectividade. Verifique sua conexão.');
        setButtonState('error');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Security check failed:', error);
      setErrorMessage('Falha na verificação de segurança.');
      setButtonState('error');
      return false;
    } finally {
      setSecurityChecking(false);
    }
  };

  const handleOAuthClick = async () => {
    if (disabled || isPending || buttonState === 'loading' || !isOnline) return;

    try {
      setButtonState('loading');
      setErrorMessage('');

      // Perform security checks first
      const securityPassed = await performSecurityChecks();
      if (!securityPassed) {
        return;
      }

      // Add some feedback delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 500));

      startTransition(async () => {
        try {
          // Store redirect URL in sessionStorage for recovery
          if (redirectUrl) {
            sessionStorage.setItem('oauth_redirect_url', redirectUrl);
          }

          // Store attempt timestamp for debugging
          sessionStorage.setItem('oauth_attempt_time', Date.now().toString());

          await initiateGoogleOAuth(linkMode, redirectUrl);

          // If we reach here, the redirect didn't happen - something went wrong
          onSuccess?.();
        } catch (error) {
          console.error('OAuth initiation error:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Falha ao iniciar autenticação Google';

          setErrorMessage(errorMessage);
          setButtonState('error');
          onError?.(errorMessage);

          // Clear stored data on error
          sessionStorage.removeItem('oauth_redirect_url');
          sessionStorage.removeItem('oauth_attempt_time');
        }
      });
    } catch (error) {
      console.error('OAuth button error:', error);
      setErrorMessage('Erro inesperado. Tente novamente.');
      setButtonState('error');
    }
  };

  const getButtonContent = () => {
    if (!isOnline) {
      return (
        <>
          <WifiOff className="mr-2 size-4" />
          Sem Conexão
        </>
      );
    }

    if (securityChecking || buttonState === 'security_check') {
      return (
        <>
          <Shield className="mr-2 size-4 animate-pulse" />
          Verificando Segurança...
        </>
      );
    }

    if (isPending || buttonState === 'loading') {
      return (
        <>
          <Loader2 className="mr-2 size-4 animate-spin" />
          {linkMode ? 'Vinculando...' : 'Conectando...'}
        </>
      );
    }

    if (buttonState === 'error') {
      return (
        <>
          <AlertCircle className="mr-2 size-4" />
          Tentar Novamente
        </>
      );
    }

    return (
      <>
        <GoogleIcon className="mr-2 size-4" />
        {linkMode ? 'Vincular conta Google' : 'Continuar com Google'}
      </>
    );
  };

  const isButtonDisabled =
    disabled || isPending || buttonState === 'loading' || !isOnline || securityChecking;

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant={buttonState === 'error' ? 'destructive' : 'outline'}
        onClick={handleOAuthClick}
        disabled={isButtonDisabled}
        className={`w-full transition-all duration-200 ${
          buttonState === 'error'
            ? 'border-red-300 hover:border-red-400'
            : 'hover:scale-[1.02] hover:shadow-md'
        } ${className}`}
        aria-label={linkMode ? 'Vincular conta Google' : 'Fazer login com Google'}
      >
        {getButtonContent()}
      </Button>

      {/* Connection Status Indicator */}
      {!isOnline && (
        <Alert variant="destructive" className="text-sm">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Sem conexão com a internet. Verifique sua conexão e tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {buttonState === 'error' && errorMessage && (
        <Alert variant="destructive" className="text-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Security Check Info */}
      {buttonState === 'security_check' && (
        <Alert className="border-blue-200 bg-blue-50 text-sm">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Realizando verificações de segurança antes de prosseguir...
          </AlertDescription>
        </Alert>
      )}

      {/* Privacy Notice */}
      <div className="space-y-1 text-center text-xs text-gray-500">
        <p>
          Ao continuar, você concorda com nossos{' '}
          <button onClick={() => router.push('/terms')} className="underline hover:text-gray-700">
            Termos de Uso
          </button>{' '}
          e{' '}
          <button onClick={() => router.push('/privacy')} className="underline hover:text-gray-700">
            Política de Privacidade
          </button>
        </p>
        <p className="flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          Protegido por criptografia de ponta a ponta
        </p>
      </div>
    </div>
  );
}
