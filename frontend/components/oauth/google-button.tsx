'use client';

import { Button } from '@/components/ui/button';
import { useState, useTransition } from 'react';
import { initiateGoogleOAuth } from '@/lib/actions/server-oauth';
import { Loader2 } from 'lucide-react';
import GoogleIcon from '../common/GoogleIcon';

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
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <GoogleIcon className="mr-2 size-4" />
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
