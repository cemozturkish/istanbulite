-- =====================================================================
-- breaking_news_updates — timeline of headline/body updates posted to a
-- breaking_news item after its initial post (e.g. "gelişme" entries on a
-- developing story). Each insert also becomes the item's new displayed
-- title/body (done client-side in admin.html), and bumps
-- breaking_news.updated_at so an actively-developing story doesn't
-- silently expire out of the 24h feed just because it's old.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- `updated_at` tracks the last time this story's headline changed (via an
-- update, not the original post). Both admin.html and anahane.html filter
-- their 24h "active news" window on this column instead of created_at, so
-- a story stays visible as long as it keeps getting updates.
alter table public.breaking_news
  add column if not exists updated_at timestamptz;

update public.breaking_news set updated_at = created_at where updated_at is null;

alter table public.breaking_news
  alter column updated_at set default now(),
  alter column updated_at set not null;

create table if not exists public.breaking_news_updates (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.breaking_news(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create index if not exists breaking_news_updates_news_id_idx
  on public.breaking_news_updates (news_id, created_at);

alter table public.breaking_news_updates enable row level security;

drop policy if exists "breaking_news_updates read for authenticated" on public.breaking_news_updates;
create policy "breaking_news_updates read for authenticated"
  on public.breaking_news_updates for select
  to authenticated
  using (true);

drop policy if exists "breaking_news_updates insert admin" on public.breaking_news_updates;
create policy "breaking_news_updates insert admin"
  on public.breaking_news_updates for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_updates update admin" on public.breaking_news_updates;
create policy "breaking_news_updates update admin"
  on public.breaking_news_updates for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_updates delete admin" on public.breaking_news_updates;
create policy "breaking_news_updates delete admin"
  on public.breaking_news_updates for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
