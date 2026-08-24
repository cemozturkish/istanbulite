-- =====================================================================
-- OLAYLAR v4 — a colour per olay.
--
-- The board is the one surface on this site where the single site-wide
-- red gives way to several: four to six olaylar are pinned to the same
-- map at once, and their strings have to stay tellable apart. The
-- artist already picks a colour when they draw the lines (see
-- assets/olaylar/README.md); this column lets the UI chrome around that
-- drawing -- the paper's pin, its stamp, the chapter rail on its
-- dossier page -- match it, instead of defaulting every olay to the
-- same red regardless of what was actually drawn.
--
-- Null falls back to the site's own red (#c8322b) in code -- so an olay
-- created before this column existed, or one nobody has picked a colour
-- for yet, looks exactly as it always did.
--
-- Requires db/world_events.sql. Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.world_events
  add column if not exists color text;

comment on column public.world_events.color is
  'Hex colour for this olay''s UI chrome (paper pin, stamp, chapter rail). Null = the site''s own red (#c8322b).';
