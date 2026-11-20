export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function supabaseEnvError(): string | null {
  const missing = [
    ["NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY]
  ].filter(([, value]) => !value).map(([name]) => name);
  return missing.length ? `Missing environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Copy .env.example to .env.local and add your Supabase project values.` : null;
}
