import { z } from 'zod';

// Export types
export type SignInInput = z.infer<typeof SignInSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/**
 * Forgot Password schema with email validation
 */
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
});

/**
 * Sign In schema with email and password validation
 */
export const SignInSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

/**
 * Sign Up schema with additional fields
 */
export const SignUpSchema = z
  .object({
    email: z.string().email('Email inválido').toLowerCase().trim(),
    password: z
      .string()
      .min(8, { message: 'Senha deve ter pelo menos 8 caracteres' })
      .regex(/[a-zA-Z]/, { message: 'Deve conter pelo menos uma letra' })
      .regex(/[0-9]/, { message: 'Deve conter pelo menos um número' })
      .regex(/[^a-zA-Z0-9]/, { message: 'Deve conter pelo menos um caractere especial' })
      .trim(),
    confirmPassword: z.string(),
    name: z
      .string()
      .min(2, 'O nome deve ter pelo menos 2 caracteres')
      .max(50, 'O nome deve ter no máximo 50 caracteres')
      .trim(),
    surname: z
      .string()
      .min(2, 'O sobrenome deve ter pelo menos 2 caracteres')
      .max(50, 'O sobrenome deve ter no máximo 50 caracteres')
      .trim()
      .optional(),
    birthdate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida')
      .optional(),
    gender: z
      .enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'] as const)
      .optional(),
    consentToDataProcessing: z.boolean(),
    consentToMarketing: z.boolean(),
    consentToResearch: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });
