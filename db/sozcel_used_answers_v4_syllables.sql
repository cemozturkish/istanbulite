-- =====================================================================
-- sozcel_used_answers v4 — stores the Sözcü's own syllable breakdown of
-- their submitted word, instead of leaving the game to auto-syllabify
-- it. The Sözcü now enters the word by typing 2–3 syllables directly
-- (see sozcel.html's Sözcü Görevi form); `word` is just their
-- concatenation, kept for the existing used-word/dictionary lookups.
--
-- `syllables` stays nullable: rows written before this migration (or by
-- the auto-pick fallback pool, which has no Sözcü and no manual
-- breakdown) have none, and sozcel.html falls back to its own
-- syllabifyTr() auto-split for those.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

alter table public.sozcel_used_answers
  add column if not exists syllables text[];

-- Defense in depth: RLS already restricts writes to the assigned Sözcü
-- (or the deterministic auto-pick insert, which never sets this column),
-- but a client could still call the REST API directly with the public
-- anon key, so enforce the 2–3 syllable rule at the database level too,
-- matching the client-side validation in submitTakeover().
alter table public.sozcel_used_answers
  drop constraint if exists sozcel_used_answers_syllables_len;
alter table public.sozcel_used_answers
  add constraint sozcel_used_answers_syllables_len
  check (syllables is null or (cardinality(syllables) between 2 and 3));
