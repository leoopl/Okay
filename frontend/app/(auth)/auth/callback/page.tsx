import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface OAuthCallbackPageProps {
  searchParams: {
    error?: string;
    error_description?: string;
    code?: string;
    state?: string;
  };
}

export default async function OAuthCallbackPage({ searchParams }: OAuthCallbackPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Suspense fallback={<LoadingState />}>
          <CallbackHandler searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function CallbackHandler({ searchParams }: OAuthCallbackPageProps) {
  const { error, error_description, code, state } = searchParams;

  // Handle OAuth errors
  if (error) {
    return <ErrorState error={error} description={error_description} />;
  }

  // Validate required parameters
  if (!code || !state) {
    return <ErrorState error="invalid_request" description="Missing required parameters" />;
  }

  try {
    // Validate state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get('oauth_state')?.value;
    const linkMode = cookieStore.get('oauth_link_mode')?.value === 'true';

    if (!storedState || storedState !== state) {
      return <ErrorState error="invalid_state" description="Security validation failed" />;
    }

    // Clear OAuth cookies
    cookieStore.delete('oauth_state');
    cookieStore.delete('oauth_link_mode');

    // The actual OAuth token exchange is handled by the backend
    // The backend should have already set the auth cookies via the callback URL
    // Redirect to appropriate page based on link mode
    if (linkMode) {
      redirect('/profile?linked=google');
    } else {
      redirect('/dashboard?welcome=true');
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    return <ErrorState error="server_error" description="An unexpected error occurred" />;
  }
}

function LoadingState() {
  return (
    <div className="text-center">
      <div className="border-green-dark mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
      <h2 className="mt-4 text-xl font-semibold text-gray-900">Finalizando autenticação...</h2>
      <p className="mt-2 text-gray-600">
        Por favor, aguarde enquanto processamos sua autenticação.
      </p>
    </div>
  );
}

function ErrorState({ error, description }: { error: string; description?: string }) {
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

  const userMessage = errorMessages[error] || 'Ocorreu um erro inesperado durante o login.';
  const showDescription = description && description !== userMessage;

  return (
    <div className="text-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-red-800">Falha na Autenticação</h2>
        <p className="mt-2 text-red-600">{userMessage}</p>
        {showDescription && <p className="mt-1 text-sm text-red-500">{description}</p>}
        <div className="mt-6 space-y-2">
          <Button asChild className="w-full">
            <Link href="/signin">Tentar Novamente</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/">Voltar ao Início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Autenticação - Okay',
  description: 'Processando autenticação...',
};
