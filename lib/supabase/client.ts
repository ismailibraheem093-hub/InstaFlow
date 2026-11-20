import { createBrowserClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/** Returns null until public Supabase configuration has been supplied. */
export function createClient() {
  if (!hasSupabaseEnv()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
