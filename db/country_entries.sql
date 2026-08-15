-- =====================================================================
-- Kütüphane — Ülkeler (country entries).
--
-- What a reader gets when they touch a country on the phone map: that
-- country's entries, listed newest first in the same half-page sheet the
-- letters and articles rise in, each one opening to its own page.
--
-- Two tables, matching how neighborhoods already work:
--
--   countries        the lookup of valid country ids, exactly the slugs
--                    the map overlay carries as data-country (see
--                    assets/map/kutuphane-map-mobile.svg). The map is the
--                    reason this list is what it is: a country nobody can
--                    touch has nowhere to appear, so the set is the set
--                    that was drawn.
--   country_entries  the entries themselves, several per country.
--
-- `ankara` is in the lookup because it is on the map, but nothing routes
-- to entries for it -- touching Ankara opens the TBMM sheet instead. It
-- is kept in the list so the id set stays exactly the drawn set rather
-- than the drawn set minus one special case.
--
-- Deliberately its own table rather than a category on breaking_news:
-- that feed is time-boxed (kutuphane.html reads the last 72 hours) and
-- carries polls, series and updates, none of which a country page wants.
-- These are meant to sit there until the admin changes them.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.countries (
  id text primary key,
  name_tr text not null
);

insert into public.countries (id, name_tr) values
  ('jordan', 'Ürdün'),
  ('iran', 'İran'),
  ('armenia', 'Ermenistan'),
  ('azerbaijan', 'Azerbaycan'),
  ('iraq', 'Irak'),
  ('egypt', 'Mısır'),
  ('palestine', 'Filistin'),
  ('saudiarabia', 'Suudi Arabistan'),
  ('yemen', 'Yemen'),
  ('eritrea', 'Eritre'),
  ('ethiopia', 'Etiyopya'),
  ('sudan', 'Sudan'),
  ('chad', 'Çad'),
  ('libya', 'Libya'),
  ('macedonia', 'Makedonya'),
  ('serbia', 'Sırbistan'),
  ('syria', 'Suriye'),
  ('lebanon', 'Lübnan'),
  ('cyprus', 'Kıbrıs'),
  ('turkiye', 'Türkiye'),
  ('ankara', 'Ankara'),
  ('greece', 'Yunanistan'),
  ('bulgaria', 'Bulgaristan'),
  ('romania', 'Romanya'),
  ('moldova', 'Moldova'),
  ('ukraine', 'Ukrayna'),
  ('georgia', 'Gürcistan'),
  ('russia', 'Rusya')
on conflict (id) do update set name_tr = excluded.name_tr;

create table if not exists public.country_entries (
  id uuid primary key default gen_random_uuid(),
  country text not null references public.countries(id) on delete cascade,
  title text not null,
  body text not null,
  -- Optional, and only a date: an entry is not news, it does not need a
  -- timestamp. Left blank the reader simply sees no date line.
  entry_date date,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The one query the page makes: a country's entries, newest first.
create index if not exists country_entries_country_idx
  on public.country_entries (country, entry_date desc nulls last, created_at desc);

create or replace function public.country_entries_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists country_entries_set_updated_at on public.country_entries;
create trigger country_entries_set_updated_at
  before update on public.country_entries
  for each row execute function public.country_entries_set_updated_at();

alter table public.countries enable row level security;
alter table public.country_entries enable row level security;

-- The lookup is readable by anon as well as authenticated, same as
-- neighborhoods: it is a list of country names, and the admin portal
-- reads it to build its picker.
drop policy if exists "countries read" on public.countries;
create policy "countries read"
  on public.countries for select to anon, authenticated using (true);

drop policy if exists "countries insert admin" on public.countries;
create policy "countries insert admin"
  on public.countries for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "countries update admin" on public.countries;
create policy "countries update admin"
  on public.countries for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "countries delete admin" on public.countries;
create policy "countries delete admin"
  on public.countries for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_entries read for authenticated" on public.country_entries;
create policy "country_entries read for authenticated"
  on public.country_entries for select to authenticated using (true);

drop policy if exists "country_entries insert admin" on public.country_entries;
create policy "country_entries insert admin"
  on public.country_entries for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_entries update admin" on public.country_entries;
create policy "country_entries update admin"
  on public.country_entries for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_entries delete admin" on public.country_entries;
create policy "country_entries delete admin"
  on public.country_entries for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
