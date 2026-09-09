-- =====================================================================
-- breaking_news_series — pin a series to one of the three world-conflict
-- boxes on Kütüphane's Türkiye stop (project.html slide 1, left column).
--
-- Those three boxes used to name three hardcoded conflicts. The admin
-- picks which SERIES occupies each slot instead, from the same series
-- list the Haberler tab already manages (db/breaking_news_series.sql) --
-- so a box is just "whichever series is currently the reader's own
-- worry", and the box shows that series' own breaking_news rows as a
-- timeline, newest first.
--
-- Requires db/breaking_news_series.sql. Run in Supabase SQL editor.
-- Idempotent.
-- =====================================================================

alter table public.breaking_news_series
  add column if not exists pinned_slot smallint;

alter table public.breaking_news_series
  drop constraint if exists breaking_news_series_pinned_slot_check;
alter table public.breaking_news_series
  add constraint breaking_news_series_pinned_slot_check
  check (pinned_slot is null or pinned_slot in (1, 2, 3));

-- Only one series may hold a given slot at a time. A plain unique
-- constraint would reject every second NULL; a partial index over the
-- non-null rows is the one that actually lets series sit unpinned.
drop index if exists breaking_news_series_pinned_slot_idx;
create unique index breaking_news_series_pinned_slot_idx
  on public.breaking_news_series (pinned_slot)
  where pinned_slot is not null;
