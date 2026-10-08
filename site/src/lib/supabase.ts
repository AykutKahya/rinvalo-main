"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser client for accounts and the prediction league. The URL and publishable key come from
 * the deployment's environment (Vercel), not from the repository. Without them the account
 * features stay hidden and the site works as before.
 */
let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
  return client;
}
