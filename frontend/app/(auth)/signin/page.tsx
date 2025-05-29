'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormMessage,
  FormLabel,
} from '@/components/ui/form';
import { AlertCircle } from 'lucide-react';
import type { z } from 'zod';
import { SigninFormSchema } from '@/lib/definitions';
import { signin } from '@/lib/actions/server-auth';

const SigninPage: React.FC = () => {
  const searchParams = useSearchParams();
  // Derive session expiration without state or effects
  const sessionExpired = searchParams.get('expired') === 'true';

  // Initialize form with Zod schema
  const form = useForm<z.infer<typeof SigninFormSchema>>({
    resolver: zodResolver(SigninFormSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  // useActionState for server action
  const [actionState, action, isPending] = useActionState(signin, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps font-varela text-green-dark mb-8 text-center text-4xl font-bold tracking-tight">
            Espero que esteja tendo um bom dia!
          </h2>

          {sessionExpired && (
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-800">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <p className="ml-3 text-sm">Sua sessão expirou. Por favor, faça login novamente.</p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form action={action} className="space-y-6" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="E-mail"
                        required
                        className="transition-all duration-200 focus:scale-[1.02]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        placeholder="Senha"
                        required
                        className="transition-all duration-200 focus:scale-[1.02]"
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="flex justify-end">
                      <Link
                        href="#"
                        className="small-caps hover:text-beige-dark text-sm font-semibold"
                      >
                        Esqueceu sua senha?
                      </Link>
                    </div>
                  </FormItem>
                )}
              />

              {actionState?.message && (
                <div className="rounded border border-red-400 bg-red-50 p-4 text-red-700">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="ml-3">{actionState.message}</span>
                  </div>
                </div>
              )}

              <Button className="small-caps w-full font-semibold" disabled={isPending}>
                {isPending ? 'Entrando...' : 'Entrar'}
              </Button>

              <p className="small-caps text-center text-sm text-gray-900">
                Ainda não tem conta?{' '}
                <Link href="/signup" className="hover:text-beige-dark font-semibold">
                  Cadastre-se aqui
                </Link>
              </p>
            </form>
          </Form>
        </div>

        <div className="hidden md:flex md:justify-center">
          <Image
            alt="Sign In Illustration"
            src="/login.svg"
            width={500}
            height={500}
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
