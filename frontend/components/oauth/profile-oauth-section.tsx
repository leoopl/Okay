import { Suspense } from 'react';
import { OAuthAccountManagement } from './oauth-account-management';
import { getUserIdentities } from '@/lib/actions/supabase-oauth';

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
  let userIdentities;
  try {
    userIdentities = await getUserIdentities();
  } catch (error) {
    console.error('Error loading OAuth status:', error);
    return <OAuthSectionError />;
  }
  return <OAuthAccountManagement userIdentities={userIdentities || []} />;
}

function OAuthSectionSkeleton() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="bg-muted mb-2 h-4 w-32 rounded"></div>
        <div className="bg-muted h-3 w-48 rounded"></div>
      </div>
      <div className="rounded-lg border p-4">
        <div className="animate-pulse space-y-3">
          <div className="bg-muted h-4 w-24 rounded"></div>
          <div className="space-y-2">
            <div className="bg-muted h-3 w-full rounded"></div>
            <div className="bg-muted h-3 w-3/4 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OAuthSectionError() {
  return (
    <div className="border-destructive/30 bg-destructive/10 rounded-lg border p-4">
      <h3 className="text-destructive font-medium">Erro ao carregar contas vinculadas</h3>
      <p className="text-destructive text-sm">
        Não foi possível carregar as informações das contas vinculadas. Tente recarregar a página.
      </p>
    </div>
  );
}
