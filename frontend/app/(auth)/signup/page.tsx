'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signup } from '@/lib/actions/server-auth';
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { z } from 'zod';
import { SignupFormSchema } from '@/lib/definitions';
import { GoogleOAuthButton } from '@/components/oauth/google-button';
import { PasswordInput } from '@/components/ui/password-input';
import { PasswordStrengthIndicator } from '@/components/common/auth/password-strength-indicator';

export type SignupFormData = z.infer<typeof SignupFormSchema>;

export default function SignupPage() {
  const [actionState, action, isPending] = useActionState(signup, undefined);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(SignupFormSchema),
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirm: '',
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([value, input]) => formData.append(value, input));
    await action(formData);
    if (actionState?.errors) {
      Object.entries(actionState.errors).forEach(([field, msgs]) => {
        form.setError(field as keyof SignupFormData, { message: msgs?.[0] });
      });
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps font-varela text-green-dark mb-8 text-center text-4xl font-bold tracking-tight">
            Crie sua conta!
          </h2>

          <div className="mx-auto w-full max-w-md space-y-6">
            <GoogleOAuthButton className="w-full" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background text-muted-foreground px-2">
                  Ou continue com e-mail
                </span>
              </div>
            </div>

            {actionState?.message && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{actionState.message}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={onSubmit} noValidate className="space-y-4">
                {/* {(['name','surname','email'] as const).map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={field}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormLabel>{field === 'email' ? 'E-mail *' : `${field.charAt(0).toUpperCase()+field.slice(1)} *`}</FormLabel>
                        <FormControl>
                          <Input {...f} placeholder={`Digite seu ${field}`} className="transition-all" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))} */}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Nome</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Digite seu nome"
                          autoComplete="name"
                          className="transition-all duration-200 focus:scale-[1.02]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          autoComplete="email"
                          className="transition-all duration-200 focus:scale-[1.02]"
                          {...field}
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
                          placeholder="Senha segura"
                          className="transition-all duration-200 focus:scale-[1.02]"
                        />
                      </FormControl>
                      {field.value && (
                        <PasswordStrengthIndicator password={field.value} className="mt-2" />
                      )}
                      <FormDescription>
                        Use ao menos 8 caracteres, números e símbolos.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          placeholder="Repita a senha"
                          className="transition-all duration-200 focus:scale-[1.02]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isPending}
                  className="small-caps w-full font-semibold"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </form>
            </Form>

            <p className="small-caps text-center text-sm text-gray-900">
              Ao criar uma conta, você concorda com nossos{' '}
              <Link
                href="/terms"
                className="hover:text-beige-dark leading-6 font-semibold text-black hover:underline"
              >
                Termos de Uso
              </Link>{' '}
              e{' '}
              <Link
                href="/privacy"
                className="hover:text-beige-dark leading-6 font-semibold text-black hover:underline"
              >
                Política de Privacidade
              </Link>
            </p>

            <p className="small-caps text-center text-sm text-gray-900">
              Já tem conta?{' '}
              <Link
                href="/signin"
                className="hover:text-beige-dark leading-6 font-semibold text-black hover:underline"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden md:flex md:justify-center">
          <Image
            alt="Sign In Illustration"
            width={500}
            height={500}
            src="/login.svg"
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      </div>
    </div>
  );
}
