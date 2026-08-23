-- =====================================================================
-- Kütüphane — OLAYLAR (world events).
--
-- The thing the news is about, as an object of its own: Rusya–Ukrayna
-- Savaşı, İsrail'in Gazze soykırımı, İran–ABD hattı. Not a feed and not
-- a tag -- a standing account of something that is happening, with a
-- beginning, a chain of key moments, and a place it currently stands.
--
-- Why this is not breaking_news_series. A series is a label laid over
-- separate breaking_news rows so a reader can follow a developing thing
-- back through its earlier posts -- it exists to make updates traceable,
-- and it says nothing at all on a day nobody posted. An olay is the
-- event itself: it is there whether or not there was news today, it can
-- reach back to 2014 when the newest story is from this morning, and a
-- reader opens it to find out what this whole thing IS rather than what
-- happened in the last 72 hours. The two are complementary and neither
-- replaces the other.
--
-- Why this is not country_stories either. That grouping belongs to the
-- MAP: one story per country (the primary key on
-- country_story_countries enforces it), and only for the 28 shapes that
-- were drawn, because its whole job is answering "what lights when this
-- is touched?" with exactly one row. An olay is not bound to the map:
-- ABD is in one and is not on the drawing, İran is in more than one, and
-- an olay with no country ticked at all is still a page. The countries
-- here are what the map can LIGHT while an olay is open (see
-- world_event_countries) -- a garnish on the page, not its identity.
--
-- Three tables:
--
--   world_events            the olay: its name, the line under that
--                           name, who is in it, whether it is still
--                           going, and the standing account.
--   world_event_moments     its Zaman Akışı -- dated key moments,
--                           printed newest first, exactly like a
--                           country entry's chain. DATED, not aged:
--                           these reach back decades and "12 yıl önce"
--                           tells a reader nothing.
--   world_event_countries   which drawn countries it touches. Optional,
--                           NOT exclusive (İran may be in several), and
--                           only ever used to light the map behind the
--                           open page.
--
-- Requires db/country_entries.sql (public.countries).
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.world_events (
  -- A slug rather than a uuid, like country_stories: these are few,
  -- named, long-lived things, and a seed file that can name them is
  -- worth more here than a generated key.
  id text primary key,
  name_tr text not null,
  -- One line, printed under the name in the list and on the page: what
  -- the reader is looking at before they read a word of the account.
  blurb text,
  -- Who is in it, as plain text -- "Rusya · Ukrayna", "İsrail · ABD ·
  -- İran". Deliberately not derived from world_event_countries: the
  -- parties to an olay are routinely not all on the map (ABD, Hamas,
  -- the UN), and a kicker that can only name drawn shapes would be
  -- lying by omission. Printed as the card's kicker.
  parties text,
  -- 'ongoing' or 'ended'. The one fact a list of olaylar has to carry
  -- that a list of news items does not: whether this is still the world
  -- the reader is living in.
  status text not null default 'ongoing'
    check (status in ('ongoing', 'ended')),
  started_on date,
  ended_on date,
  -- The standing account: a few paragraphs of what this is. Optional --
  -- an olay whose timeline says it all is a better page than one with a
  -- paragraph written to fill the space.
  body text,
  -- Ties an olay to its news trail (db/breaking_news_series.sql), so the
  -- admin can see which series feeds it. Nullable and unused by the
  -- reader for now; the two objects are separate on purpose (see the
  -- header), this only records that they are about the same thing.
  series_id uuid references public.breaking_news_series(id) on delete set null,
  -- Ongoing olaylar are listed by this first, so the page can be
  -- arranged by weight rather than by whichever moved most recently --
  -- a war does not stop being the biggest thing on the page because
  -- something smaller had a development this morning.
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.world_event_moments (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.world_events(id) on delete cascade,
  -- NOT NULL, unlike a country entry's own optional date: an entry may
  -- be undated prose, but a moment on a timeline is nothing without its
  -- date.
  moment_date date not null,
  title text not null,
  body text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists world_event_moments_event_idx
  on public.world_event_moments (event_id, moment_date desc, created_at desc);

create table if not exists public.world_event_countries (
  event_id text not null references public.world_events(id) on delete cascade,
  country text not null references public.countries(id) on delete cascade,
  -- Composite key, NOT a key on `country` alone: unlike the map's
  -- stories, an olay does not own its countries. İran is in the İsrail
  -- hattı and in the ABD one at the same time, and both are true.
  primary key (event_id, country)
);

create index if not exists world_event_countries_country_idx
  on public.world_event_countries (country);

create or replace function public.world_events_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists world_events_set_updated_at on public.world_events;
create trigger world_events_set_updated_at
  before update on public.world_events
  for each row execute function public.world_events_set_updated_at();

drop trigger if exists world_event_moments_set_updated_at on public.world_event_moments;
create trigger world_event_moments_set_updated_at
  before update on public.world_event_moments
  for each row execute function public.world_events_set_updated_at();


alter table public.world_events enable row level security;
alter table public.world_event_moments enable row level security;
alter table public.world_event_countries enable row level security;

-- Same rule as everything else on this side of the app: Kütüphane is
-- read and observed, not argued with. Everyone signed in reads, only the
-- admin writes.
drop policy if exists "world_events read" on public.world_events;
create policy "world_events read"
  on public.world_events for select to authenticated using (true);

drop policy if exists "world_events insert admin" on public.world_events;
create policy "world_events insert admin"
  on public.world_events for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_events update admin" on public.world_events;
create policy "world_events update admin"
  on public.world_events for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_events delete admin" on public.world_events;
create policy "world_events delete admin"
  on public.world_events for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_event_moments read" on public.world_event_moments;
create policy "world_event_moments read"
  on public.world_event_moments for select to authenticated using (true);

drop policy if exists "world_event_moments insert admin" on public.world_event_moments;
create policy "world_event_moments insert admin"
  on public.world_event_moments for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_event_moments update admin" on public.world_event_moments;
create policy "world_event_moments update admin"
  on public.world_event_moments for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_event_moments delete admin" on public.world_event_moments;
create policy "world_event_moments delete admin"
  on public.world_event_moments for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_event_countries read" on public.world_event_countries;
create policy "world_event_countries read"
  on public.world_event_countries for select to authenticated using (true);

drop policy if exists "world_event_countries insert admin" on public.world_event_countries;
create policy "world_event_countries insert admin"
  on public.world_event_countries for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "world_event_countries delete admin" on public.world_event_countries;
create policy "world_event_countries delete admin"
  on public.world_event_countries for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
