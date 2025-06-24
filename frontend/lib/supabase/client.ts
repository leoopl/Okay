// @/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

/**
 * Creates a Supabase client for use in Client Components.
 * This client runs in the browser and uses the anon key.
 *
 * SECURITY NOTE: This client should only be used for public data access
 * and authentication flows. Never expose sensitive operations here.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Singleton instance for client-side Supabase access
 */
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getClientInstance() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}

/**
 * Helper to check if user is authenticated on client side
 * Note: This is for UI purposes only. Always verify on server.
 */
export async function getClientUser() {
  const supabase = getClientInstance();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Helper to get the current session on client side
 * Note: This is for UI purposes only. Always verify on server.
 */
export async function getClientSession() {
  const supabase = getClientInstance();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}
