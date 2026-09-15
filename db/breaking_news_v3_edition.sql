-- =====================================================================
-- breaking_news v3 — the HOOK + the EDITION.
--
-- Two additions, both admin-only to write, both read by everyone:
--
-- 1. THE HOOK (`hook_tr` / `hook_en` / `hook_author`). What a reader sees
--    on the closed card is no longer the real headline — it is a teaser
--    line the admin writes separately, carrying its own byline, the same
--    way Sözcel's word carries its Sözcü. Tapping the card is what earns
--    the real headline and body. `hook_author` is free text (there is no
--    assignment table yet, unlike sozcel_sozcul_assignments — every hook
--    is admin-written for now, so a typed name is enough); it becomes a
--    real per-member role once submissions open, the same door Sözcel's
--    own suggestion pool already stands behind.
--
-- 2. THE EDITION (`edition_date` / `edition_order`). A story only ever
--    reaches the reader's feed by being assigned a date here from the
--    admin's own curation panel — being posted is not being published.
--    "Today's edition" is always the MOST RECENT edition_date at or
--    before the reader's own day (see news_current_edition() below), so
--    it holds — frozen — for exactly as long as the admin leaves it
--    holding: there is no timer and no forced daily rollover. Within one
--    edition, `edition_order` is the story's position in its own
--    category's stack (see `category`), ascending, admin-set.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.breaking_news
  add column if not exists hook_tr text,
  add column if not exists hook_en text,
  add column if not exists hook_author text,
  add column if not exists edition_date date,
  add column if not exists edition_order integer not null default 0;

create index if not exists breaking_news_edition_idx
  on public.breaking_news (edition_date, category, edition_order);

-- The one date every reader's feed resolves against: the newest edition
-- that has actually gone out, never a future one an admin is still
-- assembling. SECURITY DEFINER so it can be called by any authenticated
-- reader without granting them a broad scan of every edition_date ever
-- set (RLS on breaking_news already lets them read everything, but the
-- function is where the "at or before today" rule lives, once, rather
-- than in every page that reads the feed).
create or replace function public.news_current_edition(p_today date)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select max(edition_date)
  from public.breaking_news
  where edition_date <= p_today;
$$;

grant execute on function public.news_current_edition(date) to authenticated;
