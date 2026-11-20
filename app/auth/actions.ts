"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) redirect("/login?error=Check%20your%20email%20and%20password%20(minimum%208%20characters).");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=Supabase%20is%20not%20configured.%20Add%20the%20values%20from%20your%20project%20to%20.env.local.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) redirect("/login?error=Enter%20a%20valid%20email%20and%20a%20password%20with%20at%20least%208%20characters.");
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=Supabase%20is%20not%20configured.%20Add%20the%20values%20from%20your%20project%20to%20.env.local.");
  const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback` } });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (!data.session) redirect("/login?message=Check%20your%20email%20to%20confirm%20your%20account,%20then%20sign%20in.");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
