'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { signup } from '@/app/actions/auth';
import { useFormState } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const genders = ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'];

const SignupPage: React.FC = () => {
  // const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [state, action] = useFormState(signup, undefined);
  // const { pending } = useFormStatus();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // server side
    const formData = new FormData(event.currentTarget);

    // client side
    const data = {
      name: formData.get('name') as string,
      surname: formData.get('surname') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirm-password') as string,
      birthdate: formData.get('birthdate') as string,
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
            <form action={action} className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <Input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="given-name"
                  required
                  placeholder="Nome"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
                {state?.errors?.name && <p>{state.errors.name}</p>}
                {/* <input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="given-name"
                  required
                  placeholder="Nome"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                /> */}
              </div>

              <div>
                <Input
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
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="password"
                  required
                  placeholder="Senha"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <Input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="confirm-password"
                  required
                  placeholder="Repita a senha"
                  className="block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md focus:border-greenDark focus:ring-greenDark sm:text-sm"
                />
              </div>

              <div>
                <DatePicker name="birthdate" />
              </div>

              <div>
                <Select name="gender">
                  <SelectTrigger className="flex w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-black shadow-md hover:bg-greenLight hover:text-gray-900/50 focus:border-greenDark focus:ring-greenDark sm:text-sm">
                    <SelectValue placeholder="Gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    {genders.map((gender) => (
                      <SelectItem key={gender} value={gender} className="bg-white/90 shadow-md">
                        {gender}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

function DatePicker({ name }: { name: string }) {
  const [birthdate, setBirthdate] = useState<Date | undefined>(undefined);
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn(
              'w-full justify-start rounded-md border-gray-500 px-3 py-2 text-left font-normal text-gray-900 shadow-md hover:bg-greenLight hover:text-gray-900/50',
              !birthdate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {birthdate ? birthdate.toLocaleDateString('pt-br') : <span>Pick a birthdate</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown-buttons"
            selected={birthdate}
            onSelect={setBirthdate}
            fromYear={1960}
            toDate={new Date()}
            className="rounded-md bg-white/90 shadow-md"
          />
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={birthdate?.toISOString()} />
    </>
  );
}

export default SignupPage;
