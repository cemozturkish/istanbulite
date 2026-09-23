-- =====================================================================
-- Drop daily_questions / question_answers — the question that used to
-- stand between two games (db/daily_questions.sql), and the game-to-game
-- lock that came with it (Tümcel shut until Sözcel's question was
-- answered, Çengel until Tümcel's).
--
-- Both are gone. Sözcel, Tümcel and Çengel are independent now — any of
-- the three can be played in any order, with only the admin's per-day
-- off-switch (game_day_toggles) locking any of them — and anything the
-- site wants to ask its members goes through Anket (neighborhood_polls)
-- instead, which already covers the same ground and more (a per-district
-- split, not just a citywide count).
--
-- question_answers is dropped first: it references daily_questions, and
-- an explicit order reads better than leaning on CASCADE to do it quietly.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

drop function if exists public.question_tally(uuid);
drop table if exists public.question_answers;
drop table if exists public.daily_questions;
