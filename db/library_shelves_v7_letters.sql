-- =====================================================================
-- Kütüphane v7 — shelves can be flagged as Mektuplar (letters).
--
-- Kütüphane's "Mektuplar" box (kutuphane.html) previously had no backing
-- content -- just a static placeholder sheet. Letters reuse the exact same
-- shelf/article machinery as regular Makaleler shelves (a "letter" is
-- typically a single-article shelf, same as the reader already assumed --
-- see openShelfPath's "a shelf with a single article (e.g. a standalone
-- letter)" comment), just flagged so the two boxes can each show their own
-- list: Makaleler shows is_letter = false shelves, Mektuplar shows
-- is_letter = true ones.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.library_shelves
  add column if not exists is_letter boolean not null default false;
