'use server';

import { SignupFormSchema, FormState } from '@/lib/definitions';
// import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

interface SignupDTO {
  name: string;
  surname: string;
  email: string;
  password: string;
  confirm: string;
  gender: string;
  birthdate: Date;
}

export async function signup(state: FormState, formData: FormData) {
  // Validate form fields
  const validatedFields = SignupFormSchema.safeParse({
    name: formData.get('name'),
    surname: formData.get('surname'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
    birthdate: new Date(formData.get('birthday') as string),
    gender: formData.get('gender'),
  });

  console.log(validatedFields.data);

  // If any form fields are invalid, return early
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const res = await fetch(`${process.env.API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validatedFields.data as SignupDTO),
    credentials: 'include', // Include cookies
  });

  if (!res.ok) {
    throw new Error('Login failed');
  }

  // The backend sets cookies. We just parse the returned user data.
  // The backend might only return a message, so you might need a separate call to /user/profile.
  // For this example, assume it returns minimal user info.
  const data = await res.json();

  console.log(data);

  redirect('/');

  // Call the provider or db to create a user...
}
