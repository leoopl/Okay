'use client';

import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
// import { useRouter } from 'next/router';
// import { FormEvent } from 'react';

const SigninPage: React.FC = () => {
  const [password, setPassword] = useState('');
  // const router = useRouter();

  // async function handleLogin( event: FormEvent<HTMLFormElement>) {
  //   event.preventDefault();

  //   const formData = new FormData(event.currentTarget);
  //   const email = formData.get('email') as string;
  //   const password = formData.get('password') as string;

  //   const response = await fetch('/api/auth/login', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({ email, password }),
  //   })

  //   if (response.ok) {
  //     router.push('/dashboard');
  //   }
  // }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps mb-8 text-center font-varela text-4xl font-bold leading-9 tracking-tight text-gray-900">
            Espero que esteja tendo um bom dia!
          </h2>
          <form className="space-y-4" action="#" method="POST">
            <div>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="E-mail"
                className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
              />
            </div>

            <div>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                placeholder="Senha"
                className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
              />
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <a href="#" className="small-caps font-semibold text-black hover:text-beigeDark">
                    Esqueceu sua senha?
                  </a>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="small-caps flex w-full justify-center rounded-md bg-greenDark px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-greenMedium focus:outline-none focus:ring-2 focus:ring-greenDark focus:ring-offset-2"
              >
                Entrar
              </button>
            </div>
          </form>

          <p className="small-caps mt-2 text-center text-sm text-gray-900">
            Ainda não tem conta?{' '}
            <Link
              href="/signup"
              className="font-semibold leading-6 text-black hover:text-beigeDark"
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
