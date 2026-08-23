-- =====================================================================
-- OLAYLAR v2 — the pinboard's drawing.
--
-- Kütüphane presents the olaylar as a PINBOARD rather than a column of
-- newspaper cards: four things pinned to cork with string run between
-- the ones that share a country. What is pinned is a drawing -- the
-- countries of that olay and the lines between them, in the site's own
-- hand -- and this column is where a copy kept somewhere other than the
-- convention is recorded.
--
-- The convention is the normal case and needs no row at all: drop the
-- file in at assets/olaylar/<id>.png and the board finds it. An olay
-- with no drawing yet prints its name alone on the card, which is what
-- every olay looks like on the day it is created.
--
-- Requires db/world_events.sql. Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.world_events
  add column if not exists image_url text;

comment on column public.world_events.image_url is
  'Optional override for the pinned drawing. Empty = assets/olaylar/<id>.png.';
