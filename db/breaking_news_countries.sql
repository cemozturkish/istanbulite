-- =====================================================================
-- Kütüphane — which countries a Dünya story is about.
--
-- A world story is rarely about one place: a story can be about Suriye
-- and Irak at once, or about Rusya and Ukrayna as one thing. So this is
-- a join table rather than a column on breaking_news -- the admin ticks
-- as many countries as the story touches while posting it, and touching
-- that story on Kütüphane lights every one of them on the phone map.
--
-- The map is what this table is for. Its ids are public.countries' ids,
-- which are exactly the data-country slugs the map overlay carries
-- (assets/map/kutuphane-map-mobile.svg) -- a country nobody can see on
-- the map has nothing to light up, so the pickable set is the drawn set,
-- the same reason country_entries is keyed the way it is.
--
-- Only Dünya stories (breaking_news.category = 'dunya') are read this
-- way, because Kütüphane's feed is scoped to that category; nothing here
-- forbids a row on another category, it simply never gets shown.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.breaking_news_countries (
  news_id uuid not null references public.breaking_news(id) on delete cascade,
  country text not null references public.countries(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- One row per (story, country): ticking a country twice is the same
  -- statement, and the primary key says so instead of a guard in the
  -- admin portal.
  primary key (news_id, country)
);

-- The one query the page makes: the countries of the stories it just
-- fetched (a single .in() on news_id, embedded in the feed's select).
create index if not exists breaking_news_countries_news_idx
  on public.breaking_news_countries (news_id);

alter table public.breaking_news_countries enable row level security;

drop policy if exists "bnc read for authenticated" on public.breaking_news_countries;
create policy "bnc read for authenticated"
  on public.breaking_news_countries for select to authenticated using (true);

-- Writes are the admin's alone, same as the stories themselves: this is
-- editorial -- it says what a story is about.
drop policy if exists "bnc insert admin" on public.breaking_news_countries;
create policy "bnc insert admin"
  on public.breaking_news_countries for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "bnc delete admin" on public.breaking_news_countries;
create policy "bnc delete admin"
  on public.breaking_news_countries for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
