'use server';

import { SignupFormSchema, FormState } from '@/app/lib/definitions';
import { redirect } from 'next/navigation';

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

  redirect('/');

  // Call the provider or db to create a user...
}
