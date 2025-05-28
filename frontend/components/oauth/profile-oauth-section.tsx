import { Suspense } from 'react';
import { getOAuthStatus } from '@/lib/actions/server-oauth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { OAuthAccountManagement } from './oauth-account-management';

/**
 * OAuth Account Management Section for Profile Page
 * This component should be integrated into the existing profile page
 */
export async function ProfileOAuthSection() {
  return (
    <Suspense fallback={<OAuthSectionSkeleton />}>
      <OAuthSectionContent />
    </Suspense>
  );
}

async function OAuthSectionContent() {
  try {
    const oauthStatus = await getOAuthStatus();

    if (!oauthStatus) {
      return <OAuthSectionError />;
    }

    return <OAuthAccountManagement oauthStatus={oauthStatus} />;
  } catch (error) {
    console.error('Error loading OAuth status:', error);
    return <OAuthSectionError />;
  }
}

function OAuthSectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Contas Vinculadas
        </CardTitle>
        <CardDescription>Carregando informações das contas vinculadas...</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </CardContent>
    </Card>
  );
}

function OAuthSectionError() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Contas Vinculadas
        </CardTitle>
        <CardDescription>
          Não foi possível carregar as informações das contas vinculadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">
          Ocorreu um erro ao carregar as informações. Tente recarregar a página.
        </p>
      </CardContent>
    </Card>
  );
}
