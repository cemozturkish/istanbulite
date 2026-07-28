-- =====================================================================
-- game_results v2 — add `guesses` so the Sözcü's "Bugünün Sonuçları"
-- panel can show a solver's actual per-letter guess pattern instead of
-- an approximated attempt-count bar.
--
-- guesses stores the same per-row 'correct'/'present'/'absent' arrays
-- already computed client-side for the personal share grid, e.g.:
--   [["absent","correct","present","absent","absent"], ["correct", ...]]
-- Only written on a game's completion row (attempts >= 1); left null on
-- the "started" row and on games that don't populate it yet.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

alter table public.game_results
  add column if not exists guesses jsonb;
