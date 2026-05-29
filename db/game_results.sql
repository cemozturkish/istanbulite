-- =====================================================================
-- game_results — per-user, per-game, per-day result rows for Kahvehane
-- games (sozcel, bulmaca, tumcel). 'baglantilar' is kept in the CHECK
-- list for back-compat with rows written before Bağlantılar was retired
-- and replaced by Tümcel — no new code writes that value. This is the
-- source of truth for:
--   * Each game's left-panel personal stats (played / wins / streak / dist)
--   * Each game's right-panel community stats (Günün İstatistikleri,
--     En Başarılı İlçeler)
--   * Kahvehane's weekly scoreboard (top 5 winners over the last 7 days)
--   * Hane's "Oyun Skorları" card
--
-- A user may have multiple rows for the same (game, date):
--   * One "started" row inserted on first interaction
--     (attempts = 0, won = false) — lets us count a game as played even
--     when the user abandons mid-puzzle.
--   * One or more "completion" rows when the game ends
--     (attempts >= 1, won = true/false).
-- Aggregation logic dedupes per (user_id, game, date): a date counts as
-- "played" if any row exists for it, and as "won" if any row has
-- won = true.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null check (game in ('sozcel', 'bulmaca', 'tumcel', 'baglantilar')),
  date text not null,                        -- "YYYY-M-D" Istanbul-local
  attempts integer not null default 0,       -- semantics depend on game
  won boolean not null default false,
  neighborhood text references public.neighborhoods(id),
  created_at timestamptz not null default now()
);

create index if not exists game_results_user_game_date_idx
  on public.game_results (user_id, game, date);

create index if not exists game_results_game_date_idx
  on public.game_results (game, date);

create index if not exists game_results_user_game_won_idx
  on public.game_results (user_id, game, won);

alter table public.game_results enable row level security;

-- Authenticated users may read all rows (needed for community stats and
-- the weekly scoreboard). No anon read.
drop policy if exists "game_results read for authenticated" on public.game_results;
create policy "game_results read for authenticated"
  on public.game_results for select
  to authenticated
  using (true);

-- A user may insert only their own rows.
drop policy if exists "game_results insert own" on public.game_results;
create policy "game_results insert own"
  on public.game_results for insert
  to authenticated
  with check (user_id = auth.uid());

-- No updates from clients. (Rows are append-only.)
-- No deletes from clients except admin (matches other tables).
drop policy if exists "game_results delete admin" on public.game_results;
create policy "game_results delete admin"
  on public.game_results for delete
  to authenticated
  using (public.is_admin());
