-- =====================================================================
-- sozcel_used_answers v2 — lets the assigned Sözcül change the word
-- (and its dictionary entry) as many times as they like, right up
-- until the submission deadline (midnight Istanbul, start of used_on).
--
-- `sozcul_id` and `definition` already exist on the live table (added
-- ad hoc via the Sözcül assignment work) but were never captured in a
-- migration file — this file adds them defensively so a fresh database
-- ends up with the same schema, then adds the missing UPDATE policy.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

alter table public.sozcel_used_answers
  add column if not exists sozcul_id uuid references public.profiles(id) on delete set null;

alter table public.sozcel_used_answers
  add column if not exists definition text;

-- The assigned Sözcül may update their own day's word/definition freely
-- until its deadline (midnight Istanbul, i.e. UTC-3h, at the start of
-- used_on) passes. After that the row is locked — the game has gone
-- live and RLS stops accepting changes even if a client tries.
drop policy if exists "sozcel_used_answers update own before deadline"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers update own before deadline"
  on public.sozcel_used_answers for update
  to authenticated
  using (
    sozcul_id = auth.uid()
    and now() < (used_on::timestamp at time zone 'utc') - interval '3 hours'
  )
  with check (
    sozcul_id = auth.uid()
    and now() < (used_on::timestamp at time zone 'utc') - interval '3 hours'
  );
