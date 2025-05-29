'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GoogleOAuthButton } from './google-button';
import { unlinkGoogleAccount, type OAuthStatusResponse } from '@/lib/actions/server-oauth';
import { AlertCircle, CheckCircle, Unlink, Shield } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import GoogleIcon from '../common/GoogleIcon';

interface OAuthAccountManagementProps {
  oauthStatus: OAuthStatusResponse;
}

export function OAuthAccountManagement({ oauthStatus }: OAuthAccountManagementProps) {
  const [state, action, isPending] = useActionState(unlinkGoogleAccount, undefined);

  if (!oauthStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Contas Vinculadas
          </CardTitle>
          <CardDescription>
            Não foi possível carregar o status das contas vinculadas.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { hasPassword, linkedAccounts, primaryProvider, canUnlinkOAuth } = oauthStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Contas Vinculadas
        </CardTitle>
        <CardDescription>Gerencie as contas de terceiros vinculadas à sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Account Status Alert */}
        {!hasPassword && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Sua conta usa apenas autenticação via Google. Configure uma senha para maior
              segurança.
            </AlertDescription>
          </Alert>
        )}

        {/* Primary Provider Info */}
        {primaryProvider && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Provedor principal:</span>
            <Badge variant="secondary" className="capitalize">
              {primaryProvider}
            </Badge>
          </div>
        )}

        {/* Google Account Section */}
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8">
                <GoogleIcon className="h-full w-full" />
              </div>
              <div>
                <h4 className="font-medium">Google</h4>
                <p className="text-sm text-gray-600">
                  {linkedAccounts.google ? 'Conta vinculada' : 'Conta não vinculada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {linkedAccounts.google ? (
                <>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Vinculada
                  </Badge>
                  <UnlinkButton canUnlink={canUnlinkOAuth} isPending={isPending} action={action} />
                </>
              ) : (
                <GoogleOAuthButton linkMode={true} className="h-9 px-3 text-sm" />
              )}
            </div>
          </div>
        </div>

        {/* Auth0 Account Section (for future use) */}
        <div className="rounded-lg border p-4 opacity-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-200">
                <span className="text-xs font-medium">A0</span>
              </div>
              <div>
                <h4 className="font-medium">Auth0</h4>
                <p className="text-sm text-gray-600">Em breve</p>
              </div>
            </div>
            <Badge variant="outline" className="opacity-50">
              Em breve
            </Badge>
          </div>
        </div>

        {/* Action Result Messages */}
        {state?.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{state.message}</AlertDescription>
          </Alert>
        )}

        {state?.error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Security Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <h5 className="text-sm font-medium text-blue-900">Dica de Segurança</h5>
          <p className="mt-1 text-sm text-blue-800">
            Vincular múltiplas contas oferece mais opções de acesso e maior segurança. Sempre
            mantenha pelo menos uma forma de acesso à sua conta.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function UnlinkButton({
  canUnlink,
  isPending,
  action,
}: {
  canUnlink: boolean;
  isPending: boolean;
  action: any;
}) {
  if (!canUnlink) {
    return (
      <Button variant="outline" size="sm" disabled className="text-gray-400">
        <Unlink className="mr-1 h-3 w-3" />
        Não disponível
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={isPending}>
          <Unlink className="mr-1 h-3 w-3" />
          {isPending ? 'Desvinculando...' : 'Desvincular'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desvincular Conta Google</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza de que deseja desvincular sua conta Google? Você ainda poderá fazer login
            com sua senha, mas perderá a opção de login rápido via Google.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const formData = new FormData();
              action(formData);
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Desvincular
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
