import { createBrowserClient } from "@supabase/ssr";

// Placeholder values are used only so a local build without env vars
// does not crash. Real credentials must come from .env.local and are
// never committed. Pages check for missing env and show a notice.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(url, anonKey);
}

export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
