-- =====================================================================
-- game_night_slots — which game stands in which of Kahvehane's two
-- Oyunlar slots on a given night.
--
-- A SLOT IS NOT A GAME. The app's Oyunlar column has two boxes
-- (1. Oyun / 2. Oyun), and which game fills each one is the admin's
-- choice per night — Sözcel and Çengel, Tümcel and Sözcel, just Çengel.
-- There are three games and two slots, so on any night at most two games
-- are on.
--
-- A night is named for the day it BEGAN on (IstDate.gameNight()), the
-- same key game_day_toggles.game_date uses.
--
-- Both slot rows are always written together, and `game` may be null: a
-- night with rows is an explicit lineup (an empty slot included), a night
-- with NO rows falls back to the default Sözcel / Tümcel — which is what
-- every night before this table existed showed.
--
-- game_day_toggles stays the one switch game-locks.js and the game pages
-- read: admin.html writes a toggle-off row for every game NOT in the
-- night's lineup and deletes it for the ones that are, so the two tables
-- can never disagree about whether a game is on.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.game_night_slots (
  game_date  date     not null,
  slot       smallint not null check (slot in (0, 1)),
  game       text              check (game in ('sozcel', 'tumcel', 'bulmaca')),
  updated_at timestamptz not null default now(),
  primary key (game_date, slot),
  -- One game cannot stand in both slots of the same night.
  unique (game_date, game)
);

alter table public.game_night_slots enable row level security;

drop policy if exists "game_night_slots read for authenticated" on public.game_night_slots;
create policy "game_night_slots read for authenticated"
  on public.game_night_slots for select
  to authenticated
  using (true);

drop policy if exists "game_night_slots admin manage" on public.game_night_slots;
create policy "game_night_slots admin manage"
  on public.game_night_slots for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
