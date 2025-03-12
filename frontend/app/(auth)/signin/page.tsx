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
          <h2 className="small-caps font-varela mb-8 text-center text-4xl leading-9 font-bold tracking-tight text-gray-900">
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
                className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
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
                className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
              />
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <a href="#" className="small-caps hover:text-beige-dark font-semibold text-black">
                    Esqueceu sua senha?
                  </a>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="small-caps bg-green-dark hover:bg-green-medium focus:ring-green-dark flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-black shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
              >
                Entrar
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
