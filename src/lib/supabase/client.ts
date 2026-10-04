import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://yaxqevvvoluaqanspqqf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_3XTqXPSLsMF6xJ-x2VBCZg_mM9FvVgw";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createBrowserClient(url, key);
}
