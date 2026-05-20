-- =====================================================================
-- library_articles — Kütüphane source feeds.
-- One row per article curated under a source (The Economist, New York
-- Times, Financial Times). Listed in the Kütüphane left column by
-- source tab; admin owns all writes via the Editorial Desk.
--
-- Ordering: `position` (lower = higher up) then created_at desc as a
-- tiebreaker. Admin reorders by editing `position` from the panel.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.library_articles (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('economist', 'nytimes', 'ft')),
  title text not null,
  summary text,
  body text,
  url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_articles_source_position_idx
  on public.library_articles (source, position);

-- Bump updated_at on every update.
create or replace function public.library_articles_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists library_articles_set_updated_at on public.library_articles;
create trigger library_articles_set_updated_at
  before update on public.library_articles
  for each row execute function public.library_articles_set_updated_at();

alter table public.library_articles enable row level security;

-- Authenticated users may read all rows.
drop policy if exists "library_articles read for authenticated" on public.library_articles;
create policy "library_articles read for authenticated"
  on public.library_articles for select
  to authenticated
  using (true);

-- Admin-only writes.
drop policy if exists "library_articles insert admin" on public.library_articles;
create policy "library_articles insert admin"
  on public.library_articles for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "library_articles update admin" on public.library_articles;
create policy "library_articles update admin"
  on public.library_articles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "library_articles delete admin" on public.library_articles;
create policy "library_articles delete admin"
  on public.library_articles for delete
  to authenticated
  using (public.is_admin());
