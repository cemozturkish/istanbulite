-- =====================================================================
-- breaking_news_sources — external source links attached to a breaking
-- news item. Admin posts; readable by all authenticated users. New
-- sources can be added even after the parent news item is created.
-- Sources cascade-delete with their parent.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.breaking_news_sources (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.breaking_news(id) on delete cascade,
  name text not null,
  headline text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists breaking_news_sources_news_id_idx
  on public.breaking_news_sources (news_id, created_at);

alter table public.breaking_news_sources enable row level security;

drop policy if exists "breaking_news_sources read for authenticated" on public.breaking_news_sources;
create policy "breaking_news_sources read for authenticated"
  on public.breaking_news_sources for select
  to authenticated
  using (true);

drop policy if exists "breaking_news_sources insert admin" on public.breaking_news_sources;
create policy "breaking_news_sources insert admin"
  on public.breaking_news_sources for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_sources update admin" on public.breaking_news_sources;
create policy "breaking_news_sources update admin"
  on public.breaking_news_sources for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_sources delete admin" on public.breaking_news_sources;
create policy "breaking_news_sources delete admin"
  on public.breaking_news_sources for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
