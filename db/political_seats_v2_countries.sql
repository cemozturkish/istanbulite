-- =====================================================================
-- political_seats — a seat per country, alongside the districts.
--
-- Kütüphane's phone map is Türkiye among its neighbours, and touching a
-- country there opens that country's page. The profile bar's left end
-- follows the map on that page the same way it follows Hane's: tap a
-- country and it names that country's leader, exactly as tapping a
-- district names its Belediye Başkanı. This is what those seats are
-- stored in.
--
-- A country seat is the same shape as a district seat, keyed by the same
-- id the map's data-country carries (db/country_entries.sql) — so the id
-- set is, again, the set that was drawn. The `country` column mirrors
-- `neighborhood`: it exists so the check constraint can tell the two
-- kinds of seat apart and so the FK keeps a seat from pointing at a
-- country that is not on the map.
--
-- No row is required for a country. Kütüphane falls back to the
-- Cumhurbaşkanı for a country nobody has been recorded for, rather than
-- printing the country's name over "Henüz eklenmedi" — most of the
-- countries on that map will never have a leader entered, and the
-- national seat is that page's resting state anyway.
--
-- Run in Supabase SQL editor. Idempotent. Requires db/politicians.sql
-- and db/country_entries.sql to have been run first.
-- =====================================================================

alter table public.political_seats
  add column if not exists country text references public.countries(id) on delete set null;

-- Three kinds of seat now, and exactly one shape each:
--   the two national/city seats  — neither a district nor a country
--   a district seat              — id is the neighborhood
--   a country seat               — id is the country
-- Written as one constraint rather than three so a row can never be
-- half of two kinds at once (a seat carrying both a neighborhood and a
-- country would be reachable from two maps and answer to neither).
alter table public.political_seats drop constraint if exists political_seats_seat_matches_neighborhood;
alter table public.political_seats add constraint political_seats_seat_matches_neighborhood
  check (
    (id in ('istanbul', 'cumhurbaskani') and neighborhood is null and country is null)
    or (neighborhood = id and country is null)
    or (country = id and neighborhood is null)
  );

-- The bar swaps its seat on every tap, so the lookup that feeds it is by
-- id and already indexed by the primary key; nothing else is needed here.
