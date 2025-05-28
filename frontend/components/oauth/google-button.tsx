'use client';

import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { initiateGoogleOAuth } from '@/lib/actions/server-oauth';
import { Loader2 } from 'lucide-react';

interface GoogleOAuthButtonProps {
  linkMode?: boolean;
  disabled?: boolean;
  className?: string;
  onError?: (error: string) => void;
}

export function GoogleOAuthButton({
  linkMode = false,
  disabled = false,
  className = '',
  onError,
}: GoogleOAuthButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthClick = () => {
    if (disabled || isPending || isLoading) return;

    setIsLoading(true);
    startTransition(async () => {
      try {
        await initiateGoogleOAuth(linkMode);
      } catch (error) {
        setIsLoading(false);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to start Google authentication';
        onError?.(errorMessage);
        console.error('OAuth initiation error:', error);
      }
    });
  };

  const isButtonDisabled = disabled || isPending || isLoading;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleOAuthClick}
      disabled={isButtonDisabled}
      className={`w-full ${className}`}
    >
      {isButtonDisabled ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 h-4 w-4" />
      )}
      {linkMode
        ? isButtonDisabled
          ? 'Vinculando...'
          : 'Vincular conta Google'
        : isButtonDisabled
          ? 'Entrando...'
          : 'Continuar com Google'}
    </Button>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
