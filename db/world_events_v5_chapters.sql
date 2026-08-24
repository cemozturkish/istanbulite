-- =====================================================================
-- OLAYLAR v5 — a chapter can carry a photo.
--
-- world_event_moments already was an olay's chapters -- dated entries in
-- order -- but the dossier printed them as a bare ticked list, newest
-- first, the way every other Zaman Akışı on the site is. An olay reads
-- differently: it is a story with a shape, not a feed of updates, so its
-- dossier prints its chapters OLDEST FIRST (scrolling down moves toward
-- the present) and each chapter can now carry a photo of its own,
-- pinned above its text the way a note is pinned to a board.
--
-- The chapter's own body can still carry further [[img::URL]] images
-- inline, same convention library_articles uses (see
-- db/library_articles_v7_inline_images.sql) -- this column is only for
-- the one photo that leads the chapter.
--
-- Requires db/world_events.sql. Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.world_event_moments
  add column if not exists image_url text;

comment on column public.world_event_moments.image_url is
  'The chapter''s own lead photo, pinned above its text. Optional -- most chapters are text alone.';
