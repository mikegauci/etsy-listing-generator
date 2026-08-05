import { createClient, SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getServerKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    undefined
  );
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getServerKey();

  if (!url || !key) {
    throw new Error(
      "Missing Supabase URL or API key (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)"
    );
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // Next.js caches fetch() GETs by default — that returns stale empty shop data.
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, cache: "no-store" }),
    },
  });

  return adminClient;
}

export function hasSupabaseConfig(): boolean {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && getServerKey());
}
