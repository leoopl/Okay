import { z } from 'zod';

// Signup form schema with validation rules
export const SignupFormSchema = z
  .object({
    name: z.string().min(3, { message: 'Name must be at least 2 characters long.' }).trim(),
    surname: z.string().min(3, { message: 'Surname must be at least 3 characters long.' }).trim(),
    email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
    password: z
      .string()
      .min(8, { message: 'Be at least 8 characters long' })
      .regex(/[a-zA-Z]/, { message: 'Contain at least one letter.' })
      .regex(/[0-9]/, { message: 'Contain at least one number.' })
      .regex(/[^a-zA-Z0-9]/, {
        message: 'Contain at least one special character.',
      })
      .trim(),
    confirm: z.string().trim(),
    gender: z.string().trim().optional(),
    birthdate: z
      .date({
        required_error: 'Please select a date of birth',
        invalid_type_error: "That's not a valid date!",
      })
      .max(new Date(), { message: 'Too young!' }),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don't match",
    path: ['confirm'],
  });

// Signin form schema with validation rules
export const SigninFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string().min(1, { message: 'Password is required.' }).trim(),
});

// Form state type for handling errors and messages
export type FormState =
  | {
      errors?: {
        name?: string[];
        surname?: string[];
        email?: string[];
        password?: string[];
        confirm?: string[];
        birthdate?: string[];
        gender?: string[];
      };
      message?: string;
    }
  | undefined;
