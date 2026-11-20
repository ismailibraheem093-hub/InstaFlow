import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnvError } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  return <main className="shell">
    <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">i</span>InstaFlow</Link><nav className="top-actions"><Link href="/dashboard">Workspace</Link><Link className="button link-button" href="/login">Sign in</Link></nav></header>
    <section className="hero"><div className="eyebrow">A calmer way to publish</div><h1>Make room for<br /><span style={{ color: "#d8bc82" }}>the good work.</span></h1><p className="lead">A secure home for your Instagram publishing workflow. Connect your account, organize your media, and plan content with confidence—without handing over your password.</p><div style={{ display: "flex", gap: 12, marginTop: 25, flexWrap: "wrap" }}><Link className="button link-button" href={user ? "/dashboard" : "/login"}>{user ? "Open workspace" : "Create your workspace"}</Link><Link className="button secondary link-button" href="/dashboard">View dashboard</Link></div></section>
    {supabaseEnvError() ? <section className="card setup-card"><div><h2>Connect your Supabase project</h2><p>{supabaseEnvError()} Your credentials are not bundled in the code and should only be supplied through your deployment environment.</p></div><span className="pill">Setup needed</span></section> : <section className="card setup-card"><div><h2>Supabase configuration detected</h2><p>{user ? "You are signed in. Your workspace is ready to load authenticated records." : "Configuration is present. Sign in or create an account to begin."}</p></div><span className="pill">{user ? "Signed in" : "Ready for auth"}</span></section>}
    <div className="grid"><article className="card stat"><div className="eyebrow">01</div><div className="section-head"><h2>Private by design</h2></div><div className="small">Authentication and row-level security keep each workspace isolated.</div></article><article className="card stat"><div className="eyebrow">02</div><div className="section-head"><h2>One source of truth</h2></div><div className="small">Publishing statistics are read from your database, never seeded demo data.</div></article><article className="card stat"><div className="eyebrow">03</div><div className="section-head"><h2>Built to connect</h2></div><div className="small">Credential-free scaffold, ready for secure Meta integration and background jobs.</div></article></div>
    <footer className="footer">InstaFlow · Thoughtful tools for your publishing rhythm</footer>
  </main>;
}
