-- =====================================================================
-- breaking_news_series — named groupings for breaking_news items, e.g.
-- tagging several distinct posts about the same ongoing story ("Seçim
-- 2026", "Deprem Sonrası") under one shared, renameable label. This is
-- separate from breaking_news_updates, which is the timeline *within* a
-- single story — a series links multiple separate breaking_news rows
-- together instead.
--
-- Admin creates/renames/deletes series; a story picks at most one
-- series (or none). Deleting a series just clears the tag off its
-- stories rather than deleting them.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.breaking_news_series (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.breaking_news_series enable row level security;

drop policy if exists "breaking_news_series read for authenticated" on public.breaking_news_series;
create policy "breaking_news_series read for authenticated"
  on public.breaking_news_series for select
  to authenticated
  using (true);

drop policy if exists "breaking_news_series insert admin" on public.breaking_news_series;
create policy "breaking_news_series insert admin"
  on public.breaking_news_series for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_series update admin" on public.breaking_news_series;
create policy "breaking_news_series update admin"
  on public.breaking_news_series for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_series delete admin" on public.breaking_news_series;
create policy "breaking_news_series delete admin"
  on public.breaking_news_series for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

alter table public.breaking_news
  add column if not exists series_id uuid references public.breaking_news_series(id) on delete set null;

create index if not exists breaking_news_series_id_idx
  on public.breaking_news (series_id);
