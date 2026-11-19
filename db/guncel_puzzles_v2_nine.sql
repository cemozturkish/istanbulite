-- =====================================================================
-- guncel_puzzles v2 — Güncel is a 3×3 now: nine cards, four answers.
--
-- v1 fenced `cards` to exactly 16 (a 4×4). The board is nine cards now,
-- exactly four of them dated the puzzle's day or the day before it (the
-- admin's editor enforces the four; nothing stores which cards are the
-- answers, see v1). Boards already written with sixteen stay valid and
-- guncel.html still plays them as a 4×4, so the check takes either.
--
-- Run in Supabase SQL editor AFTER db/guncel_puzzles.sql. Idempotent.
-- =====================================================================

do $$
declare c record;
begin
  -- The v1 check was declared inline on the column, so its name is
  -- Postgres's own; it is found by what it checks rather than by name.
  for c in
    select conname from pg_constraint
    where conrelid = 'public.guncel_puzzles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%jsonb_array_length%'
  loop
    execute format('alter table public.guncel_puzzles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.guncel_puzzles add constraint guncel_puzzles_cards_check
  check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) in (9, 16));
