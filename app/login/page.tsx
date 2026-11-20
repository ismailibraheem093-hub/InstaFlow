import Link from "next/link";
import { signIn, signUp } from "@/app/auth/actions";
import { supabaseEnvError } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const missing = supabaseEnvError();
  return <main className="shell"><header className="topbar"><Link href="/" className="brand"><span className="brand-mark">i</span>InstaFlow</Link><Link className="top-actions" href="/">Back to home</Link></header>
    <section className="card auth-card"><div className="eyebrow">Your workspace</div><h1>Welcome in.</h1><p>Sign in or create an account with Supabase. InstaFlow never asks for your Instagram password.</p>
      {missing && <div className="notice">{missing} Authentication is disabled until those values are set.</div>}
      {params.error && <div className="notice error" role="alert">{params.error}</div>}
      {params.message && <div className="notice" role="status">{params.message}</div>}
      <form action={signIn}><label className="field">Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label className="field">Password<input name="password" type="password" autoComplete="current-password" required minLength={8} /></label><button className="button" type="submit" disabled={Boolean(missing)}>Sign in</button></form>
      <div style={{ height: 1, background: "rgba(255,255,255,.09)", margin: "24px 0" }} />
      <form action={signUp}><label className="field">Create account email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label><label className="field">Create password<input name="password" type="password" autoComplete="new-password" required minLength={8} /></label><button className="button secondary" type="submit" disabled={Boolean(missing)}>Create account</button></form>
      <p className="small" style={{ marginTop: 17 }}>Email confirmation behavior is controlled in your Supabase Auth settings. Configure the site URL and redirect URL before enabling production sign-ups.</p>
    </section></main>;
}
