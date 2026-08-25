-- =====================================================================
-- OLAYLAR v3 — where the paper hangs.
--
-- The board is the map, and an olay is a piece of paper pinned to it
-- with a hand-drawn line running from the paper to the place. The line
-- is in the olay's own drawing (assets/olaylar/<id>.png, 1080x2420, the
-- map's own frame). Where the LINE ENDS is where the paper has to be --
-- and nothing in the drawing can tell the app that, because a stroke
-- ending in empty sea looks exactly like a stroke ending anywhere else.
--
-- So the author says it: two coordinates in that same 1080x2420 frame,
-- picked by clicking the map in the admin portal's Olaylar tab. They are
-- optional -- an olay with none falls back to hanging its paper under
-- its drawing's ink, and with no drawing either, over its countries --
-- but a drawing whose line runs somewhere specific needs them, or the
-- string is left pointing at nothing.
--
-- Requires db/world_events.sql. Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.world_events
  add column if not exists paper_x int,
  add column if not exists paper_y int;

comment on column public.world_events.paper_x is
  'Where the paper hangs, in the map''s own 1080-wide frame. Null = place it under the drawing.';
comment on column public.world_events.paper_y is
  'Where the paper hangs, in the map''s own 1920-tall frame. Null = place it under the drawing.';
