'use client';

import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SetStateAction, useActionState, useState, useEffect } from 'react';
import { signin } from '@/app/actions/server-auth';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SigninPage: React.FC = () => {
  const [state, action, isPending] = useActionState(signin, undefined);
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    // Check if redirected due to expired session
    if (searchParams.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps font-varela text-green-dark mb-8 text-center text-4xl leading-9 font-bold tracking-tight">
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
                className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
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

            {state?.message && (
              <div className="relative rounded border border-red-400 bg-red-50 px-4 py-3 text-red-700">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="ml-3 block sm:inline">{state.message}</span>
                </div>
              </div>
            )}

            <div>
              <Button disabled={isPending} type="submit" className="small-caps w-full px-4 py-2">
                {isPending ? 'Entrando...' : 'Entrar'}
              </Button>
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
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </div>
    </div>
  );
};

export default SigninPage;
