-- InstaFlow initial schema for Supabase/Postgres.
-- Apply in the Supabase SQL Editor or with `supabase db push`.
-- Identity is managed by auth.users; public.users contains application profile data.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  timezone text not null default 'UTC',
  notification_preferences jsonb not null default '{"publishing":true,"failures":true,"upcoming":true}'::jsonb,
  theme text not null default 'dark' check (theme in ('dark','light','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null default 'instagram' check (provider = 'instagram'),
  provider_user_id text not null,
  username text,
  profile_picture_url text,
  account_type text,
  status text not null default 'connected' check (status in ('connected','reauthorization_required','disconnected')),
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider, provider_user_id)
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  caption text not null default '' check (char_length(caption) <= 2200),
  media_ids uuid[] not null default '{}',
  post_type text not null check (post_type in ('image','carousel','reel')),
  scheduled_at timestamptz not null,
  timezone text not null default 'UTC',
  status text not null default 'scheduled' check (status in ('scheduled','processing','published','failed','cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  idempotency_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.published_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scheduled_post_id uuid unique references public.scheduled_posts(id) on delete set null,
  connected_account_id uuid references public.connected_accounts(id) on delete set null,
  instagram_media_id text not null,
  permalink text,
  caption text not null default '',
  media_ids uuid[] not null default '{}',
  post_type text not null check (post_type in ('image','carousel','reel')),
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (connected_account_id, instagram_media_id)
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Untitled draft',
  caption text not null default '' check (char_length(caption) <= 2200),
  media_ids uuid[] not null default '{}',
  post_type text not null default 'image' check (post_type in ('image','carousel','reel')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.media_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  media_type text not null check (media_type in ('image','video')),
  size_bytes bigint not null check (size_bytes > 0),
  width integer,
  height integer,
  duration_seconds numeric,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.hashtag_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  hashtags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('published','publish_failed','upload_failed','authorization','upcoming')),
  title text not null,
  body text not null default '',
  read_at timestamptz,
  related_post_id uuid references public.scheduled_posts(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.publishing_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  scheduled_post_id uuid references public.scheduled_posts(id) on delete set null,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('started','processing','published','failed')),
  message text,
  provider_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Keep OAuth tokens in a non-API-exposed schema. Only trusted server code/service_role may access it.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
create table if not exists private.instagram_tokens (
  connected_account_id uuid primary key references public.connected_accounts(id) on delete cascade,
  access_token_ciphertext text not null,
  token_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table private.instagram_tokens enable row level security;
revoke all on private.instagram_tokens from public, anon, authenticated;
grant select, insert, update, delete on private.instagram_tokens to service_role;

create index if not exists scheduled_posts_due_idx on public.scheduled_posts (scheduled_at) where status = 'scheduled';
create index if not exists scheduled_posts_owner_status_idx on public.scheduled_posts (user_id, status, scheduled_at desc);
create index if not exists published_posts_owner_date_idx on public.published_posts (user_id, published_at desc);
create index if not exists drafts_owner_updated_idx on public.drafts (user_id, updated_at desc);
create index if not exists media_library_owner_created_idx on public.media_library (user_id, created_at desc);
create index if not exists hashtag_collections_owner_idx on public.hashtag_collections (user_id, name);
create index if not exists notifications_owner_created_idx on public.notifications (user_id, created_at desc);
create index if not exists publishing_logs_owner_post_idx on public.publishing_logs (user_id, scheduled_post_id, created_at desc);
create index if not exists connected_accounts_owner_idx on public.connected_accounts (user_id, status);

-- RLS is enabled for every user-data table. Policies compare records to the signed-in auth.uid().
alter table public.users enable row level security;
alter table public.connected_accounts enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.published_posts enable row level security;
alter table public.drafts enable row level security;
alter table public.media_library enable row level security;
alter table public.hashtag_collections enable row level security;
alter table public.notifications enable row level security;
alter table public.publishing_logs enable row level security;

drop policy if exists "users read own profile" on public.users;
create policy "users read own profile" on public.users for select to authenticated using (id = (select auth.uid()));
drop policy if exists "users update own profile" on public.users;
create policy "users update own profile" on public.users for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "account owner can view metadata" on public.connected_accounts;
create policy "account owner can view metadata" on public.connected_accounts for select to authenticated using (user_id = (select auth.uid()));

-- User actions are allowed on schedules/drafts/media/hashtag groups, while publishing records and
-- attempt logs are server-written only so a client cannot claim an Instagram post was successful.
drop policy if exists "owner manages scheduled posts" on public.scheduled_posts;
create policy "owner manages scheduled posts" on public.scheduled_posts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner reads published posts" on public.published_posts;
create policy "owner reads published posts" on public.published_posts for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "owner manages drafts" on public.drafts;
create policy "owner manages drafts" on public.drafts for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner manages media" on public.media_library;
create policy "owner manages media" on public.media_library for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner manages hashtag collections" on public.hashtag_collections;
create policy "owner manages hashtag collections" on public.hashtag_collections for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner reads notifications" on public.notifications;
create policy "owner reads notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "owner marks own notifications read" on public.notifications;
create policy "owner marks own notifications read" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "owner reads publishing logs" on public.publishing_logs;
create policy "owner reads publishing logs" on public.publishing_logs for select to authenticated using (user_id = (select auth.uid()));

-- Timestamp maintenance.
do $$ declare t text; begin
  foreach t in array array['users','connected_accounts','scheduled_posts','drafts','hashtag_collections'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', t);
  end loop;
end $$;

-- Private per-user media bucket. Objects are stored under <auth.uid()>/<unique-file-name>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('instaflow-media', 'instaflow-media', false, 104857600, array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/quicktime'])
on conflict (id) do nothing;
drop policy if exists "user owns instaflow media objects" on storage.objects;
create policy "user owns instaflow media objects" on storage.objects for all to authenticated
using (bucket_id = 'instaflow-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'instaflow-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
