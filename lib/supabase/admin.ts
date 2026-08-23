import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client using the service_role key — bypasses RLS entirely.
 * Only ever use this for the credit-checking/deduction path (lib/credits.ts).
 * Never use it for general data access; the session-scoped client in
 * lib/supabase/server.ts is correct for everything else.
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set on the server");
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}