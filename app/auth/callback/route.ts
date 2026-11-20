import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const errorMessage = request.nextUrl.searchParams.get("error_description") ?? request.nextUrl.searchParams.get("error");
  if (errorMessage) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url));
  if (!hasSupabaseEnv()) return NextResponse.redirect(new URL("/login?error=Supabase%20is%20not%20configured.", request.url));
  if (!code) return NextResponse.redirect(new URL("/login?error=Confirmation%20code%20is%20missing%20or%20expired.", request.url));

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    }
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  return response;
}
