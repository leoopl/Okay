'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GoogleOAuthButton } from './google-button';
import { unlinkGoogleAccount, getUserIdentities } from '@/lib/actions/supabase-oauth';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface Identity {
  id: string;
  provider: string;
  created_at?: string;
  updated_at?: string;
}

interface OAuthAccountManagementProps {
  userIdentities?: Identity[];
}

export function OAuthAccountManagement({
  userIdentities: initialIdentities,
}: OAuthAccountManagementProps) {
  const [identities, setIdentities] = useState<Identity[]>(initialIdentities || []);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Refresh identities on mount if not provided
  useEffect(() => {
    if (!initialIdentities) {
      getUserIdentities().then((result) => {
        if (result) {
          setIdentities(result);
        }
      });
    }
  }, [initialIdentities]);

  // Check if user has password (assuming they do if they have email/password identity)
  const hasPassword = identities.some((identity) => identity.provider === 'email');
  const googleIdentity = identities.find((identity) => identity.provider === 'google');
  const hasGoogleLinked = !!googleIdentity;

  // Check if user can unlink Google (must have at least password or another provider)
  const canUnlinkGoogle = hasPassword || identities.length > 1;

  const handleUnlinkGoogle = () => {
    if (!canUnlinkGoogle) {
      toast.error('Você deve ter uma senha ou outro método de login antes de desvincular o Google');
      return;
    }

    startTransition(async () => {
      try {
        const result = await unlinkGoogleAccount();
        if (result.success) {
          toast.success(result.message);
          // Refresh identities
          const updatedIdentities = await getUserIdentities();
          if (updatedIdentities) {
            setIdentities(updatedIdentities);
          }
          router.refresh();
        } else {
          toast.error(result.message || 'Erro ao desvincular conta Google');
        }
      } catch (_error) {
        toast.error('Erro ao desvincular conta Google');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas Vinculadas</CardTitle>
        <CardDescription>
          Gerencie as contas vinculadas à sua conta do Okay. Vincular contas facilita o login e
          melhora a segurança da sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Status Summary */}
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-medium">Status da Conta</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Senha configurada:</span>
              <Badge variant={hasPassword ? 'default' : 'secondary'}>
                {hasPassword ? 'Sim' : 'Não'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Contas vinculadas:</span>
              <Badge variant="outline">{identities.length}</Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Google Account Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Conta Google</h4>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-muted-foreground text-sm">
                  {hasGoogleLinked ? 'Conta vinculada' : 'Não vinculada'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasGoogleLinked ? (
                <>
                  <Badge variant="default">Vinculada</Badge>
                  <UnlinkButton
                    canUnlink={canUnlinkGoogle}
                    isPending={isPending}
                    onClick={handleUnlinkGoogle}
                  />
                </>
              ) : (
                <GoogleOAuthButton linkMode className="w-auto" />
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="rounded-lg bg-secondary/20 p-4 text-secondary">
          <h5 className="mb-1 font-medium">Dica de Segurança</h5>
          <p className="text-sm">
            Recomendamos ter pelo menos dois métodos de login configurados: uma senha forte e uma
            conta vinculada para maior segurança e facilidade de acesso.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function UnlinkButton({
  canUnlink,
  isPending,
  onClick,
}: {
  canUnlink: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={!canUnlink || isPending}
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
    >
      {isPending ? 'Desvinculando...' : 'Desvincular'}
    </Button>
  );
}
