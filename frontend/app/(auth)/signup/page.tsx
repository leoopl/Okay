'use client';

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/20/solid';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FormEvent } from 'react';

const genders = ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'];

const SignupPage: React.FC = () => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // server side
    const formData = new FormData(event.currentTarget);

    // client side
    const data = {
      firstName: formData.get('first-name') as string,
      lastName: formData.get('surname') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirm-password') as string,
      birthday: formData.get('birthday') as string,
      gender: formData.get('gender') as string,
    };

    console.log(data);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps mb-8 text-center font-varela text-4xl font-bold leading-9 tracking-tight text-gray-900">
            Faça a sua conta!
          </h2>
          <div className="mx-auto w-full max-w-md">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <input
                  type="text"
                  name="first-name"
                  id="first-name"
                  autoComplete="given-name"
                  required
                  placeholder="Nome"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <input
                  type="text"
                  name="surname"
                  id="surname"
                  autoComplete="family-name"
                  required
                  placeholder="Sobrenome"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <input
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
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Senha"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="Repita a senha"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <input
                  id="birthday"
                  name="birthday"
                  type="date"
                  required
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-500 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <Listbox name="gender" value={selectedGender} onChange={setSelectedGender}>
                  <div className="relative mt-1">
                    <ListboxButton
                      className={`relative w-full cursor-default rounded-md border border-gray-500 bg-transparent py-2 pl-3 pr-10 text-left ${selectedGender ? 'text-gray-900' : 'text-gray-500'} shadow-md focus:border-greenDark focus:outline-none focus:ring-1 focus:ring-greenDark sm:text-sm`}
                    >
                      <span className="block truncate">{selectedGender || 'Gênero'}</span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronDownIcon className="size-5 text-gray-500" aria-hidden="true" />
                      </span>
                    </ListboxButton>
                    <ListboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white/90 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
                      {genders.map((gender) => (
                        <ListboxOption
                          key={gender}
                          className="group flex cursor-default select-none py-2 pl-3 pr-4 text-gray-900 data-[focus]:bg-greenDark data-[focus]:text-white"
                          value={gender}
                        >
                          <CheckIcon
                            className="invisible mr-2 size-5 flex-none text-greenDark group-data-[selected]:visible group-data-[focus]:text-white"
                            aria-hidden="true"
                          />
                          <span className="flex-1 truncate font-normal group-data-[selected]:font-medium">
                            {gender}
                          </span>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>
              </div>

              <div>
                <button
                  type="submit"
                  className="small-caps flex w-full justify-center rounded-md bg-greenDark px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-greenMedium focus:outline-none focus:ring-2 focus:ring-greenDark focus:ring-offset-2"
                >
                  Cadastre-se
                </button>
              </div>
            </form>

            <p className="small-caps mt-2 text-center text-sm text-gray-900">
              Já tem conta?{' '}
              <Link
                href="/signin"
                className="font-semibold leading-6 text-black hover:text-beigeDark"
              >
                Entrar
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden md:flex md:justify-center">
          <Image
            alt="Sign Up Illustration"
            width={500}
            height={500}
            className="object-contain"
            priority
            src="/signup.svg"
          />
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
