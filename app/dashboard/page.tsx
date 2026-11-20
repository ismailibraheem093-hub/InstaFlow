import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="card stat"><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="small">{detail}</div></article>;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  if (!supabase) return <main className="shell"><Header /><section className="hero"><div className="eyebrow">Workspace setup</div><h1>Your publishing home.</h1><p className="lead">The dashboard reads only your authenticated Supabase records. Connect the project and apply the migration to activate your workspace.</p></section><div className="notice">Supabase isn’t configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart the dev server.</div></main>;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="shell"><Header /><section className="hero"><div className="eyebrow">Private workspace</div><h1>Sign in to your account.</h1><p className="lead">Your workspace data is protected by Supabase authentication and row-level security.</p><Link className="button link-button" href="/login">Sign in</Link></section></main>;

  const [scheduled, published, failed] = await Promise.all([
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
    supabase.from("published_posts").select("id", { count: "exact", head: true }),
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "failed")
  ]);
  const statsAvailable = !scheduled.error && !published.error && !failed.error;
  const connection = await supabase.from("connected_accounts").select("username, profile_picture_url, status").maybeSingle();
  const account = connection.data;
  const dbError = !statsAvailable ? "Statistics aren’t available yet. Apply supabase/migrations/20261120000000_initial_schema.sql to your Supabase project." : null;

  return <main className="shell">
    <Header signedIn />
    <section className="hero" style={{ paddingBottom: 35 }}>
      <div className="eyebrow">Your workspace</div>
      <h1>Good to see you{user.email ? `, ${user.email.split("@")[0]}` : ""}.</h1>
      <p className="lead">A clear view of your publishing workflow. Stats below are retrieved from your database—not sample values.</p>
    </section>
    {dbError && <div className="notice">{dbError}</div>}
    <div className="grid">
      <Stat label="Published via InstaFlow" value={statsAvailable ? String(published.count ?? 0) : "—"} detail="Confirmed posts in your history" />
      <Stat label="Scheduled" value={statsAvailable ? String(scheduled.count ?? 0) : "—"} detail="Posts currently queued" />
      <Stat label="Needs attention" value={statsAvailable ? String(failed.count ?? 0) : "—"} detail="Failed scheduled posts" />
    </div>
    <div className="section-head"><h2>Instagram account</h2><span className="pill">{account?.status === "connected" ? "Connected" : "Not connected"}</span></div>
    <section className="card setup-card"><div><h2>{account?.username ? `@${account.username}` : "Connect your professional account"}</h2><p>{account?.username ? "Account metadata is loaded from your secure connected-account record." : "Instagram OAuth becomes available once Meta app credentials and callback configuration are set up."}</p></div><span className="small">{connection.error ? "Database migration required" : account?.profile_picture_url ? "Profile image available" : "Meta credentials not configured"}</span></section>
    <div className="section-head"><h2>Getting started</h2></div>
    <section className="card empty">Your content workflow is ready for the next implementation stage. Run the SQL migration to create your private tables and storage bucket. No post, schedule, or Instagram activity is fabricated here.</section>
    <form action={signOut} style={{ marginTop: 22 }}><button className="button secondary" type="submit">Sign out</button></form>
    <footer className="footer">InstaFlow · Secure workspace · Data protected with Supabase RLS</footer>
  </main>;
}

function Header({ signedIn = false }: { signedIn?: boolean }) {
  return <header className="topbar"><Link href="/" className="brand"><span className="brand-mark">i</span>InstaFlow</Link><nav className="top-actions">{signedIn ? <Link href="/">Workspace</Link> : <><Link href="/login">Sign in</Link><Link className="button link-button" href="/login">Get started</Link></>}</nav></header>;
}
