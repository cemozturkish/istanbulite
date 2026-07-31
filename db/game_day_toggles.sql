-- =====================================================================
-- game_day_toggles — admin on/off switch for a game on a given day.
--
-- Presence of a row for (game, game_date) means that game is DISABLED
-- for that day; absence means the game runs normally. Admin toggles a
-- game off by inserting a row (e.g. "turn Tümcel off for tomorrow") and
-- back on by deleting it. Read from game-locks.js (applyGameLocks) on
-- every game page and from Kahvehane's nav to lock the game and, if a
-- user hits it directly, bounce them back with "Bugün <Oyun> yok!".
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.game_day_toggles (
  game        text not null check (game in ('sozcel', 'tumcel', 'bulmaca')),
  game_date   date not null,
  disabled_by uuid references public.profiles(id),
  disabled_at timestamptz not null default now(),
  primary key (game, game_date)
);

alter table public.game_day_toggles enable row level security;

-- All authenticated members can read (every game page needs to check
-- today's status, not just admins).
drop policy if exists "game_day_toggles read for authenticated" on public.game_day_toggles;
create policy "game_day_toggles read for authenticated"
  on public.game_day_toggles for select
  to authenticated
  using (true);

-- Only admin toggles games on/off.
drop policy if exists "game_day_toggles admin manage" on public.game_day_toggles;
create policy "game_day_toggles admin manage"
  on public.game_day_toggles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
