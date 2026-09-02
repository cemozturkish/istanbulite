-- =====================================================================
-- breaking_news — the English half of a story.
--
-- A story is entered twice now: the Turkish version (title/body, which
-- stay required and are what every reader sees by default) and an
-- optional English one. A reader whose language_pref is more_english
-- gets the English text where it exists and the Turkish where it does
-- not — a story half-translated still reads, and nothing is ever blank
-- because nobody got round to it.
--
-- The same pair is added to breaking_news_updates: a gelişme is part of
-- the same story, and a timeline that reverts to Turkish half way down
-- is worse than one that was never translated at all.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.breaking_news
  add column if not exists title_en text,
  add column if not exists body_en  text;

alter table public.breaking_news_updates
  add column if not exists title_en text,
  add column if not exists body_en  text;
