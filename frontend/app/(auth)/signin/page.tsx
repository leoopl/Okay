'use client';

import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SetStateAction, useActionState, useState, useEffect } from 'react';
import { signin } from '@/app/actions/server-auth';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

const SigninPage: React.FC = () => {
  const [state, action, isPending] = useActionState(signin, undefined);
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const { setAccessToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Check if redirected due to expired session
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  // Handle successful authentication
  useEffect(() => {
    console.log('Auth state updated:', state);

    if (state?.success && state.token) {
      try {
        console.log('Setting token:', state.token.substring(0, 10) + '...');

        // Initialize auth context with the token
        setAccessToken(state.token);

        // Redirect to dashboard or requested page
        const redirectTo = searchParams.get('from') || '/dashboard';
        console.log('Redirecting to:', redirectTo);
        router.push(redirectTo);
      } catch (error) {
        console.error('Error processing login:', error);
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [state, setAccessToken, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps font-varela mb-8 text-center text-4xl leading-9 font-bold tracking-tight text-gray-900">
            Espero que esteja tendo um bom dia!
          </h2>

          {/* Session expired notification */}
          {sessionExpired && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-800">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <div className="ml-3">
                  <p className="text-sm">Sua sessão expirou. Por favor, faça login novamente.</p>
                </div>
              </div>
            </div>
          )}

          {/* Debug info */}
          {debugInfo && (
            <div className="mb-4 rounded-md border border-blue-300 bg-blue-50 p-4 text-blue-800">
              <div className="flex">
                <div className="ml-3">
                  <p className="font-mono text-sm">{debugInfo}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-4" action={action}>
            <div>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="E-mail"
                className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
              />
              {state?.errors?.email && (
                <p className="mt-1 text-sm text-red-500">{state.errors.email[0]}</p>
              )}
            </div>

            <div>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e: { target: { value: SetStateAction<string> } }) =>
                  setPassword(e.target.value)
                }
                autoComplete="current-password"
                required
                placeholder="Senha"
                className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
              />
              {state?.errors?.password && (
                <p className="mt-1 text-sm text-red-500">{state.errors.password[0]}</p>
              )}
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <a href="#" className="small-caps hover:text-beige-dark font-semibold text-black">
                    Esqueceu sua senha?
                  </a>
                </div>
              </div>
            </div>

            {/* Display general error message with better styling */}
            {state?.message && (
              <div className="relative rounded border border-red-400 bg-red-50 px-4 py-3 text-red-700">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="ml-3 block sm:inline">{state.message}</span>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isPending}
                className="small-caps bg-green-dark hover:bg-green-medium focus:ring-green-dark flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-black shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:opacity-70"
              >
                {isPending ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>

          <p className="small-caps mt-2 text-center text-sm text-gray-900">
            Ainda não tem conta?{' '}
            <Link
              href="/signup"
              className="hover:text-beige-dark leading-6 font-semibold text-black"
            >
              Cadastre-se aqui
            </Link>
          </p>
        </div>
        <div className="hidden md:flex md:justify-center">
          <Image
            alt="Sign In Illustration"
            width={500}
            height={500}
            src="/login.svg"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
};

export default SigninPage;
