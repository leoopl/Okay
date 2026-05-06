import 'server-only';
// CRITICAL: 'server-only' throws at BUILD TIME if any client component imports this file.
// This is the right directive — NOT 'use server', which would expose every export as a
// remotely-callable server action (the exact opposite of what's wanted for a service-role
// client).
//
// Allowed callers (enforced by ESLint no-restricted-imports rule for app/**):
//   - lib/actions/supabase-admin-testimonials.ts
//   - lib/actions/supabase-provider-validation.ts
//
// SUPABASE_SERVICE_ROLE_KEY is the project's server-side admin key. Treat as a secret:
// never log, never bundle into client code, never expose via API.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Module-scoped cache — persists across requests in the same Next.js worker (intended).
// In dev with HMR it gets re-created per reload, also fine. DO NOT change to per-request
// caching: admin client construction is non-trivial and has no per-request state.
let cached: SupabaseClient<Database> | null = null;

export function createAdminClient(): SupabaseClient<Database> {
  if (cached) return cached;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  cached = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return cached;
}
