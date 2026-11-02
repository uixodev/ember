import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The connection to Supabase. It only exists when the site was built with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * (see README). Without them the app is exactly what it was: everything stays on this device.
 * The anon key is meant to be public: what each person can read is decided by the row level security in supabase/schema.sql.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const cloudConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;
export function getClient(): SupabaseClient | null {
  if (!cloudConfigured) return null;
  client ??= createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return client;
}
