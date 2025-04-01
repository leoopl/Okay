'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { signup } from '@/app/actions/server-auth';
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
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

const genders = ['Masculino', 'Feminino', 'Outro', 'Prefiro não dizer'];

const SignupPage: React.FC = () => {
  const [state, action, isPending] = useActionState(signup, undefined);
  const { setAccessToken } = useAuth();
  const router = useRouter();

  // Handle successful signup
  useEffect(() => {
    if (state?.success && state.token) {
      // Initialize auth context with the token
      setAccessToken(state.token);

      // Redirect to dashboard
      router.push('/dashboard');
    }
  }, [state, setAccessToken, router]);
  // async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  //   event.preventDefault();

  //   // server side
  //   const formData = new FormData(event.currentTarget);

  //   // client side
  //   const data = {
  //     name: formData.get('name') as string,
  //     surname: formData.get('surname') as string,
  //     email: formData.get('email') as string,
  //     password: formData.get('password') as string,
  //     confirmPassword: formData.get('confirm') as string,
  //     birthdate: formData.get('birthdate') as string,
  //     gender: formData.get('gender') as string,
  //   };

  //   console.log(data);
  // }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2 md:items-center">
        <div className="px-4">
          <h2 className="small-caps font-varela mb-8 text-center text-4xl leading-9 font-bold tracking-tight text-gray-900">
            Faça a sua conta!
          </h2>
          <div className="mx-auto w-full max-w-md">
            <form action={action} className="space-y-4">
              <div>
                <Input
                  type="text"
                  name="name"
                  id="name"
                  autoComplete="given-name"
                  required
                  placeholder="Nome"
                  className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                />
                {state?.errors?.name && <p>{state.errors.name}</p>}
              </div>

              <div>
                <Input
                  type="text"
                  name="surname"
                  id="surname"
                  autoComplete="family-name"
                  required
                  placeholder="Sobrenome"
                  className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                />
                {state?.errors?.surname && <p>{state.errors.surname}</p>}
              </div>

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
                {state?.errors?.email && <p>{state.errors.email}</p>}
              </div>

              <div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="password"
                  required
                  placeholder="Senha"
                  className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                />
                {state?.errors?.password && (
                  <div>
                    <p>Password must:</p>
                    <ul>
                      {state.errors.password.map((error) => (
                        <li key={error}>- {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="confirm"
                  required
                  placeholder="Repita a senha"
                  className="focus:border-green-dark focus:ring-green-dark block w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                />
                {state?.errors?.confirm && <p>{state.errors.confirm}</p>}
              </div>

              <div>
                <DatePicker name="birthdate" />
                {state?.errors?.birthdate && <p>{state.errors.birthdate}</p>}
              </div>

              <div>
                <Select name="gender">
                  <SelectTrigger className="hover:bg-green-light focus:border-green-dark focus:ring-green-dark flex w-full rounded-md border-gray-500 bg-transparent px-3 py-2 text-black shadow-md hover:text-gray-900/50 sm:text-sm">
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
                {state?.errors?.gender && <p>{state.errors.gender}</p>}
              </div>

              <div>
                <button
                  disabled={isPending}
                  type="submit"
                  className="small-caps bg-green-dark hover:bg-green-medium focus:ring-green-dark flex w-full justify-center rounded-md px-4 py-2 text-sm font-semibold text-black shadow-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                >
                  Cadastre-se
                </button>
              </div>
            </form>

            <p className="small-caps mt-2 text-center text-sm text-gray-900">
              Já tem conta?{' '}
              <Link
                href="/signin"
                className="hover:text-beige-dark leading-6 font-semibold text-black"
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
              'hover:bg-green-light w-full justify-start rounded-md border-gray-500 px-3 py-2 text-left font-normal text-gray-900 shadow-md hover:text-gray-900/50',
              !birthdate && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {birthdate ? birthdate.toLocaleDateString('pt-br') : <span>Data de Nascimento</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            mode="single"
            selected={birthdate}
            onSelect={setBirthdate}
            autoFocus
            defaultMonth={birthdate}
            showOutsideDays={false}
            captionLayout="dropdown"
            disabled={[{ after: new Date() }]}
            className="rounded-md bg-white/90 shadow-md"
            buttonNextClassName="cursor-pointer hover:bg-green-light hover:text-black"
            buttonPreviousClassName="cursor-pointer hover:bg-green-light hover:text-black"
          />
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={birthdate?.toISOString()} />
    </>
  );
}

// function SubmitButton() {
//   const { pending } = useFormStatus();

//   return (

//   );
// }

export default SignupPage;
