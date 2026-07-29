import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL_ENV = "VITE_SUPABASE_URL";
const SUPABASE_PUBLISHABLE_KEY_ENV = "VITE_SUPABASE_PUBLISHABLE_KEY";

export function getSupabaseConfig(env = import.meta.env) {
  const url = env[SUPABASE_URL_ENV];
  if (!url) {
    throw new Error(`Missing required environment variable: ${SUPABASE_URL_ENV}`);
  }

  const publishableKey = env[SUPABASE_PUBLISHABLE_KEY_ENV];
  if (!publishableKey) {
    throw new Error(`Missing required environment variable: ${SUPABASE_PUBLISHABLE_KEY_ENV}`);
  }

  return { url, publishableKey };
}

export function createSupabaseClient(env = import.meta.env, createClientImpl = createClient) {
  const { url, publishableKey } = getSupabaseConfig(env);
  return createClientImpl(url, publishableKey);
}

export const supabase = createSupabaseClient();
