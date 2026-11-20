# InstaFlow

A Next.js and Supabase foundation for a secure Instagram publishing workspace. This repository now includes cookie-aware Supabase client utilities, email/password authentication, a database migration with user-isolated RLS, and a private media bucket definition. Instagram OAuth and publishing are intentionally not represented as working until Meta credentials and the server-side publishing worker are implemented.

## Requirements

- Node.js 20.9 or newer
- npm
- A Supabase project

## Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Without Supabase values, the application explains what is missing and disables auth operations rather than faking a session. Add the project URL and anon/publishable key to `.env.local` and restart the server.

## Configure Supabase

1. In the Supabase dashboard, open **Project Settings → API** and copy the Project URL and anon/publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Set the production site URL and callback as well when deployed.
3. Apply `supabase/migrations/20261120000000_initial_schema.sql` in the Supabase SQL Editor, or use the Supabase CLI (`supabase link`, then `supabase db push`). The migration creates the profile table, account metadata, schedules, published records, drafts, media, hashtag groups, notifications, publishing logs, indexes, RLS policies, a private `private.instagram_tokens` schema, and the private `instaflow-media` Storage bucket.
4. Email/password signup and login use Supabase Auth. Email confirmation is controlled by **Authentication → Providers → Email**. Confirmation redirects to `/auth/callback`.

`auth.users` is Supabase's identity source; `public.users` is the corresponding application profile table. The OAuth token table is outside the exposed `public` schema and has no access for browser roles. Use only a trusted server/worker with `SUPABASE_SERVICE_ROLE_KEY` for future token operations. Do not send this key to client code or commit it.

## Environment variables

See `.env.example`. The application currently requires only the public Supabase URL and anon/publishable key for browser-safe Supabase Auth and RLS-backed queries. `NEXT_PUBLIC_APP_URL` is used for auth confirmation links. The service role, Meta credentials, token encryption key, and scheduler secret are reserved for later server-side integrations; unset optional values do not produce fake behavior. Put real values in `.env.local` locally and in your hosting provider's encrypted environment-variable settings in production. Never commit `.env.local`.

## Meta / Instagram configuration

The current application does **not** connect to Instagram or publish/schedule posts. Meta OAuth and publishing must be implemented server-side and tested against the app's approved Meta permissions before those controls are exposed. The `.env.example` lists the expected server-only Meta variables for that later stage. Never request an Instagram password from users, and never store a raw access token in a browser-readable table.

## Deployment

Deploy the Next.js app to a Node-compatible host (for example, Vercel). Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` in the hosting environment; redeploy after setting them. Configure the same production callback URL in Supabase Auth. Keep service-role and any provider secrets server-only. Add health checks and error monitoring before production use.

## Background scheduling

The schema persists timezone-aware `scheduled_at` timestamps and indexes due jobs, but automatic publishing is **not implemented yet**. A production scheduler must call a protected server worker independently of an open browser, claim due rows atomically, write every attempt to `publishing_logs`, use idempotency/duplicate protection, and mark a post published only after Meta confirms publication. Configure `SCHEDULER_CRON_SECRET` in the server and scheduler when that worker is added. Do not treat a scheduled database row as a successful publication.

## Available scripts

- `npm run dev` — local development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript checks
- `npm run start` — serve a production build

No build or integration tests have been run in this GitHub-only environment. Before production, run `npm install`, `npm run typecheck`, and `npm run build`, then exercise signup, email confirmation, sign-in/out, and RLS policies against a non-production Supabase project.
