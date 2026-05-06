import { z } from 'zod';

export const BR_UF_CODES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;
export type BrUfCode = (typeof BR_UF_CODES)[number];

export const ValidationRequestSchema = z.object({
  council_type: z.enum(['CRM', 'CRP'], { error: 'Tipo de conselho inválido' }),
  council_state: z.enum(BR_UF_CODES, { error: 'UF inválida' }),
  council_number: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z./-]{4,20}$/, 'Número de registro inválido'),
  full_name: z
    .string()
    .trim()
    .min(3, 'Nome completo precisa ter pelo menos 3 caracteres')
    .max(200, 'Nome completo é muito longo'),
  specialty: z
    .string()
    .trim()
    .max(200, 'Especialidade é muito longa')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  bio: z
    .string()
    .trim()
    .max(2000, 'Bio é muito longa (máx. 2000 caracteres)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  document_path: z.string().trim().optional().or(z.literal('').transform(() => undefined)),
});
export type ValidationRequestInput = z.infer<typeof ValidationRequestSchema>;

export const ConnectionInviteSchema = z.object({
  patient_email: z.string().email('Email inválido').toLowerCase().trim(),
  invite_message: z
    .string()
    .trim()
    .max(500, 'Mensagem é muito longa (máx. 500 caracteres)')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});
export type ConnectionInviteInput = z.infer<typeof ConnectionInviteSchema>;

export const SharedResourceTypeSchema = z.enum([
  'inventory_responses',
  'dose_logs',
  'todo_items',
  'therapeutic_goals',
  'agenda_items',
]);
export type SharedResourceType = z.infer<typeof SharedResourceTypeSchema>;

export const SHARED_RESOURCE_LABELS: Record<SharedResourceType, string> = {
  inventory_responses: 'Resultados de questionários (PHQ-9, GAD-7, Beck)',
  dose_logs: 'Histórico de medicação',
  todo_items: 'Lista de tarefas',
  therapeutic_goals: 'Objetivos terapêuticos',
  agenda_items: 'Agenda',
};

export const GrantResourceSchema = z.object({
  connection_id: z.string().uuid('ID de conexão inválido'),
  resource_type: SharedResourceTypeSchema,
});
export type GrantResourceInput = z.infer<typeof GrantResourceSchema>;

export const MAX_DOCTORS_PER_PATIENT = 2;
