-- =====================================================================
-- bulmaca_puzzles — admin-authored Çengel (crossword) puzzles.
--
-- Çengel's puzzles used to be a hardcoded JS array in bulmaca.html
-- (PUZZLES), picked for the night by a seeded random over the game
-- night's own key. This table replaces that pool entirely: the admin
-- draws the grid cell by cell (which squares are blocked, which
-- letter sits in each open one) and writes the across/down clues in
-- the Oyunlar → Çengel panel, and bulmaca.html reads the night's own
-- row by `puzzle_date`, the same way tumcel_puzzles is read by
-- `puzzle_date` off IstDate.gameNightSeed() (a night is named for the
-- day it began on, so this is the calendar day the night started on,
-- not a rollover at midnight).
--
-- `grid` is a rows×cols array of arrays: each cell is an uppercase
-- Turkish letter (unicode) or null for a blocked square. `clues` is
-- { across: [...], down: [...] }, each entry
-- { num, row, col, len, clue } — num/row/col/len are the numbering
-- the admin's own grid produced at save time (standard crossword
-- numbering: a cell starts an across/down entry when it opens a run
-- of 2+ open cells with a blocked square or the grid edge behind it).
-- bulmaca.html recomputes the same numbering off the grid to place
-- the numbers in the cells, so the two must agree — this is why `num`
-- is stored explicitly rather than trusted to match order alone.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.bulmaca_puzzles (
  puzzle_date date        primary key,
  rows        integer     not null,
  cols        integer     not null,
  grid        jsonb       not null,
  clues       jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.bulmaca_puzzles enable row level security;

-- All authenticated members can read (needed to load the night's puzzle).
drop policy if exists "Authenticated users can view bulmaca_puzzles" on public.bulmaca_puzzles;
create policy "Authenticated users can view bulmaca_puzzles"
  on public.bulmaca_puzzles
  for select to authenticated using (true);

-- Only admin creates/edits/deletes puzzles.
drop policy if exists "Admin can manage bulmaca_puzzles" on public.bulmaca_puzzles;
create policy "Admin can manage bulmaca_puzzles"
  on public.bulmaca_puzzles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Auto-bump updated_at on edits
create or replace function public.set_bulmaca_puzzles_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_bulmaca_puzzles_updated_at on public.bulmaca_puzzles;
create trigger set_bulmaca_puzzles_updated_at
  before update on public.bulmaca_puzzles
  for each row execute function public.set_bulmaca_puzzles_updated_at();
