-- =====================================================================
-- Kütüphane — Hikâyeler (country stories).
--
-- What the map is actually about. A reader does not touch Ukrayna to
-- read about Ukrayna; they touch it because there is a war there, and
-- that war is also Rusya. Touching either one lights BOTH and opens one
-- page -- the story -- rather than two country encyclopaedias that keep
-- describing the same events from opposite sides.
--
-- Two tables:
--
--   country_stories            the story itself: its name, and the line
--                              printed under that name on its page.
--   country_story_countries    which countries belong to it. `country`
--                              is the PRIMARY KEY, so a country belongs
--                              to at most one story -- the map has to be
--                              able to answer "what lights with this?"
--                              with one row, not a set of candidates.
--
-- No content table of its own: a story's pages are the existing
-- public.country_entries of its member countries, gathered and sorted as
-- one list. An entry stays filed under the country it is most about
-- (Karabağ under Azerbaycan, the closed border under Ermenistan) and the
-- story is what puts them on the same page, kickered with their own
-- country's name. That is the whole point -- an entry does not move, the
-- reader's route to it does.
--
-- A country in no story keeps behaving exactly as it did: touching it
-- lights it alone and opens its own entries.
--
-- Requires db/country_entries.sql (public.countries) to have been run.
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.country_stories (
  id text primary key,
  name_tr text not null,
  -- One line, printed under the story's name on its page: what the
  -- reader is looking at before they pick an entry. Optional.
  blurb text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.country_story_countries (
  -- One story per country, enforced by the key rather than by the admin
  -- remembering: two stories claiming Suriye would make what lights on
  -- the map depend on row order.
  country text primary key references public.countries(id) on delete cascade,
  story_id text not null references public.country_stories(id) on delete cascade
);

create index if not exists country_story_countries_story_idx
  on public.country_story_countries (story_id);

create or replace function public.country_stories_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists country_stories_set_updated_at on public.country_stories;
create trigger country_stories_set_updated_at
  before update on public.country_stories
  for each row execute function public.country_stories_set_updated_at();


-- ── The stories ──────────────────────────────────────────────────────
-- Structural rather than editorial: these five are the groupings the map
-- is drawn around. Their names and blurbs are editable from the admin
-- portal; which countries belong to which is not something that changes
-- with the news.
insert into public.country_stories (id, name_tr, blurb) values
  ('rusya-ukrayna', 'Rusya–Ukrayna Savaşı',
   'Avrupa''nın İkinci Dünya Savaşı''ndan bu yana gördüğü en büyük savaş — ve İstanbul''un iki kez masayı kurduğu yer.'),
  ('israil-cephesi', 'İsrail Cephesi',
   'Gazze''de başlayan savaşın Lübnan''a, Suriye''ye ve İran''a uzanan hattı. Dört ülke, tek cephe.'),
  ('karabag', 'Ermenistan–Azerbaycan',
   'Otuz beş yıl, iki savaş ve kapalı bir sınır. Türkiye''nin doğusundaki her şey bu iki başkentin arasından geçiyor.'),
  ('ege-kibris', 'Yunanistan ve Kıbrıs',
   'Bir denizin ve bir adanın paylaşılamaması. Türkiye''nin batısındaki en eski dosya.'),
  ('turkiye', 'Türkiye',
   'Haritanın ortasındaki ülke ve kararların alındığı şehir.')
on conflict (id) do update
  set name_tr = excluded.name_tr, blurb = excluded.blurb;


-- ── Who lights with whom ─────────────────────────────────────────────
insert into public.country_story_countries (country, story_id) values
  ('ukraine',    'rusya-ukrayna'),
  ('russia',     'rusya-ukrayna'),

  ('palestine',  'israil-cephesi'),
  ('lebanon',    'israil-cephesi'),
  ('syria',      'israil-cephesi'),
  ('iran',       'israil-cephesi'),

  ('armenia',    'karabag'),
  ('azerbaijan', 'karabag'),

  ('greece',     'ege-kibris'),
  ('cyprus',     'ege-kibris'),

  -- Ankara is in a story for what it lights, not for what it opens:
  -- touching it still opens the meclis (it is the only city drawn on the
  -- map and the only route to TBMM from it), but Türkiye lights with it
  -- either way, so the reader sees that the parliament they are about to
  -- open belongs to the country under it.
  ('turkiye',    'turkiye'),
  ('ankara',     'turkiye')
on conflict (country) do update set story_id = excluded.story_id;


alter table public.country_stories enable row level security;
alter table public.country_story_countries enable row level security;

-- Same rule as the entries these gather: everyone signed in reads, only
-- the admin writes. anon reads too, matching public.countries -- the
-- admin portal builds its picker from the same rows.
drop policy if exists "country_stories read" on public.country_stories;
create policy "country_stories read"
  on public.country_stories for select to anon, authenticated using (true);

drop policy if exists "country_stories insert admin" on public.country_stories;
create policy "country_stories insert admin"
  on public.country_stories for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_stories update admin" on public.country_stories;
create policy "country_stories update admin"
  on public.country_stories for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_stories delete admin" on public.country_stories;
create policy "country_stories delete admin"
  on public.country_stories for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_story_countries read" on public.country_story_countries;
create policy "country_story_countries read"
  on public.country_story_countries for select to anon, authenticated using (true);

drop policy if exists "country_story_countries insert admin" on public.country_story_countries;
create policy "country_story_countries insert admin"
  on public.country_story_countries for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_story_countries update admin" on public.country_story_countries;
create policy "country_story_countries update admin"
  on public.country_story_countries for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_story_countries delete admin" on public.country_story_countries;
create policy "country_story_countries delete admin"
  on public.country_story_countries for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
