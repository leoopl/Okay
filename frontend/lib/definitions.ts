import { z } from 'zod';

export const TestimonialFormSchema = z.object({
  message: z.string().min(10, 'O depoimento deve ter pelo menos 10 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
  location: z.string().optional(),
  newsletter: z.boolean().optional(),
});

// ============= Types =============

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: { code: string; message: string } };

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

export type ConnectionAccessError =
  | 'NOT_AUTHENTICATED'
  | 'NOT_PROVIDER'
  | 'NO_ACTIVE_CONNECTION'
  | 'NO_GRANT';

export class ConnectionAccessException extends Error {
  constructor(public code: ConnectionAccessError, message?: string) {
    super(message ?? code);
    this.name = 'ConnectionAccessException';
  }
}
