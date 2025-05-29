import { z } from 'zod';

export const TestimonialFormSchema = z.object({
  message: z.string().min(10, 'O depoimento deve ter pelo menos 10 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  location: z.string().optional(),
  newsletter: z.boolean().optional(),
});

// Signup form schema with validation rules
export const SignupFormSchema = z
  .object({
    name: z.string().min(3, { message: 'Nome precisa ter ao menos 3 caracteres' }).trim(),
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    password: z
      .string()
      .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
      .regex(/[a-zA-Z]/, { message: 'Deve conter pelo menos uma letra' })
      .regex(/[0-9]/, { message: 'Deve conter pelo menos um número' })
      .regex(/[^a-zA-Z0-9]/, { message: 'Deve conter pelo menos um caractere especial' })
      .trim(),
    confirm: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirm, {
    message: 'As senhas não coincidem',
    path: ['confirm'],
  });

// Signin form schema with validation rules
export const SigninFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string().min(1, { message: 'Password is required.' }).trim(),
});

// Validation schema for profile updates (moved from server-profile.ts)
export const ProfileFormSchema = z.object({
  name: z.string().min(3, { message: 'Nome precisa ter ao menos 3 caracteres' }).trim(),
  surname: z
    .string()
    .min(2, { message: 'Sobrenome deve ter pelo menos 2 caracteres' })
    .max(50)
    .optional(),
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  gender: z.string().optional(),
  birthdate: z.string().optional(),
});

// Validation schema for password change (moved from server-profile.ts)
export const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Senha atual é obrigatória' }),
    newPassword: z
      .string()
      .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
      .regex(/[a-z]/, { message: 'Deve conter pelo menos uma letra minúscula' })
      .regex(/[A-Z]/, { message: 'Deve conter pelo menos uma letra maiúscula' })
      .regex(/[0-9]/, { message: 'Deve conter pelo menos um número' })
      .regex(/[^a-zA-Z0-9]/, { message: 'Deve conter pelo menos um caractere especial' }),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'As senhas não coincidem',
        path: ['confirmPassword'],
      });
    }
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

// Types for client authentication
export type UserProfile = {
  id: string;
  email: string;
  name: string;
  surname?: string;
  gender?: string;
  birthdate?: string;
  roles: string[];
  permissions?: string[];
  consentToDataProcessing?: boolean;
  consentToResearch?: boolean;
  consentToMarketing?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tokenFingerprint?: string;
  profilePictureUrl?: string;
  profilePictureUpdatedAt?: string;
};

export type TokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

// Response type for server actions
export type AuthActionResponse = {
  success?: boolean;
  errors?: Record<string, string[]>;
  message?: string;
  token?: string; // Access token to pass to client
};

// Add Blog Post Types
export type Metadata = {
  title: string;
  author?: string;
  publishedAt: string;
  summary: string;
  image?: string;
  tags?: string[];
  readingTime?: number;
};

export type BlogPost = {
  metadata: Metadata;
  slug: string;
  content: React.ReactNode; // or JSX.Element
  rawContent: string;
};
