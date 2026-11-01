import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(URL && KEY);

function make(options: Parameters<typeof createClient>[2]): SupabaseClient {
  if (!isSupabaseConfigured) {
    // A placeholder client keeps the UI renderable; every call fails with a clear message.
    return createClient("https://not-configured.invalid", "not-configured", options);
  }
  return createClient(URL!, KEY!, options);
}

/** Authenticated client used by doctors (session persisted in localStorage). */
export const supabase = make({
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "vocalyzer.auth",
  },
});

/**
 * Anonymous client used on the patient page. It never carries a session, so patient submissions
 * always go through the "anon" Row Level Security policy, even if a doctor is logged in on the
 * same browser.
 */
export const supabaseAnon = make({
  auth: { persistSession: false, autoRefreshToken: false, storageKey: "vocalyzer.anon" },
});
