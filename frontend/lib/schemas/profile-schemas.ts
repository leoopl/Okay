import { z } from 'zod';

// Export types
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ProfileFormData = z.infer<typeof ProfileFormSchema>;

/**
 * Update Profile schema
 */
export const UpdateProfileSchema = z.object({
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
    .optional()
    .nullable(),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, 'Data inválida')
    .optional()
    .nullable(),
  gender: z
    .enum(['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'] as const)
    .optional()
    .nullable(),
});

/**
 * Profile form schema for client-side form validation
 */
export const ProfileFormSchema = z.object({
  name: z
    .string()
    .min(2, 'O nome deve ter pelo menos 2 caracteres')
    .max(50, 'O nome deve ter no máximo 50 caracteres')
    .trim(),
  surname: z.string().trim().optional(),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  birthdate: z.string().optional(),
  gender: z.string().optional(),
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
