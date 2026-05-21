-- =====================================================================
-- breaking_news — short-lived banner items shown on Anahane.
-- Admin posts; auto-hidden after 24h (filtered client-side by
-- created_at > now() - interval '24 hours'). If neighborhood is set,
-- that district pulses on the map until the viewer clicks it.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.breaking_news (
  id uuid primary key default gen_random_uuid(),
  neighborhood text references public.neighborhoods(id) on delete set null,
  title text not null,
  body text,
  url text,
  created_at timestamptz not null default now()
);

create index if not exists breaking_news_created_at_idx
  on public.breaking_news (created_at desc);

alter table public.breaking_news enable row level security;

drop policy if exists "breaking_news read for authenticated" on public.breaking_news;
create policy "breaking_news read for authenticated"
  on public.breaking_news for select
  to authenticated
  using (true);

-- Admin-only writes via JWT email claim (no auth.users access needed).
drop policy if exists "breaking_news insert admin" on public.breaking_news;
create policy "breaking_news insert admin"
  on public.breaking_news for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news update admin" on public.breaking_news;
create policy "breaking_news update admin"
  on public.breaking_news for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news delete admin" on public.breaking_news;
create policy "breaking_news delete admin"
  on public.breaking_news for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
