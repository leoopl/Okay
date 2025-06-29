'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle } from 'lucide-react';
import type { z } from 'zod';
import { signInFormAction, forgotPassword } from '@/lib/actions/supabase-auth';
import { SignInSchema, ForgotPasswordSchema } from '@/lib/schemas/auth-schemas';

const SigninPage: React.FC = () => {
  const searchParams = useSearchParams();
  // Derive session expiration without state or effects
  const sessionExpired = searchParams.get('expired') === 'true';
  const redirectTo = '/profile';
  // const redirectTo = searchParams.get('redirect') || '/profile';

  // Initialize form with Zod schema
  const form = useForm<z.infer<typeof SignInSchema>>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  // useActionState for server action
  const [actionState, action, isPending] = useActionState(signInFormAction, undefined);

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
              {/* Hidden field for redirect */}
              <input type="hidden" name="redirect" value={redirectTo} />

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
                      <ForgotPasswordDialog />
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
            alt="Ilustração de Login"
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

// Forgot Password Dialog Component
const ForgotPasswordDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with Zod schema
  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: '' },
    mode: 'onTouched',
  });

  const handleSubmit = async (data: z.infer<typeof ForgotPasswordSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await forgotPassword(data);

      if (result.success) {
        setSuccess(true);
        form.reset();
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset form and states when dialog closes
      form.reset();
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="small-caps hover:text-beige-dark cursor-pointer text-sm font-semibold"
        >
          Esqueceu sua senha?
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="small-caps text-green-dark">Recuperar Senha</DialogTitle>
          <DialogDescription>
            Digite seu e-mail para receber um link de recuperação de senha.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-md border border-green-300 bg-green-50 p-4 text-green-800">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <p className="ml-3 text-sm">
                  E-mail enviado com sucesso! Verifique sua caixa de entrada e siga as instruções
                  para redefinir sua senha.
                </p>
              </div>
            </div>
            <Button
              onClick={() => handleOpenChange(false)}
              className="small-caps w-full font-semibold"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                        placeholder="Digite seu e-mail"
                        required
                        className="transition-all duration-200 focus:scale-[1.02]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <div className="rounded border border-red-400 bg-red-50 p-4 text-red-700">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <span className="ml-3">{error}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="small-caps flex-1 font-semibold"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="small-caps flex-1 font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar E-mail'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SigninPage;
