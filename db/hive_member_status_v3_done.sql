-- =====================================================================
-- hive_member_status v3 — a neighbour's day glyph is three states, not two
--
-- The petek's own caption under a name (hiveStatHTML in profile-card.js)
-- used to draw only ONE thing: how much of the day is still STANDING —
-- filled from the bottom, in the member's own ink, with an outline for
-- everything else. It never said "already read" apart from "nothing
-- here at all", because v1/v2 only ever counted what was left
-- (news_stacked) and what was played (games_played, against a known
-- games_total) — the games half already had both halves of the fact,
-- the news half only ever had one.
--
-- Recoloured now to three states — nothing there stays blank, standing
-- (not yet interacted with) is dark gray, done (interacted with) is
-- red — the news column needed the other half too: how many of the
-- live stories a member has ALREADY dealt with, not only how many are
-- still stacked. news_done is that count, read off the same news_dealt
-- table news_stacked already joins against.
--
-- The signature is UNCHANGED (date, text, text[]) — same as v2 — so
-- this is a create-or-replace everywhere except the return row, and a
-- changed return row needs the function dropped first (Postgres refuses
-- to change OUT columns on a plain create-or-replace). The v1 two-arg
-- fallback in loadHiveStatus (profile-card.js) is untouched: a database
-- that has only ever run v1 keeps captioning members exactly as it did.
--
-- Run this in the Supabase SQL editor. It's idempotent.
-- =====================================================================

drop function if exists public.hive_member_status(date, text, text[]);

create or replace function public.hive_member_status(
  p_game_date date,
  p_game_key  text,
  p_games     text[]
)
returns table (
  member_id    uuid,
  news_stacked int,
  news_done    int,
  games_played int,
  games_total  int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select * from public.hive_cells where user_id = auth.uid()
  ),
  members as (
    select c.user_id as id
    from me
    join public.hive_cells c
      on c.map_id = me.map_id and c.user_id <> me.user_id
  ),
  -- The same window the reader's own column is built from: live,
  -- unarchived, touched in the last 72 hours.
  live as (
    select id, updated_at
    from public.breaking_news
    where archived_at is null
      and updated_at >= now() - interval '72 hours'
  ),
  -- The night's games: the ones the caller named, minus the ones the
  -- admin switched off. A game that is off is on NEITHER side of the
  -- fraction — it is not a step anybody has left to take.
  on_tonight as (
    select g as game
    from unnest(coalesce(p_games, array[]::text[])) as g
    where not exists (
      select 1 from public.game_day_toggles t
      where t.game_date = p_game_date and t.game = g
    )
  )
  select
    m.id,
    (
      select count(*)::int
      from live l
      left join public.news_dealt d
        on d.user_id = m.id and d.news_id = l.id
      where d.news_id is null or l.updated_at > d.dealt_stamp
    ),
    -- The other half of the same join: a live story this member HAS
    -- dealt with, and has not moved past that verdict since (a gelişme
    -- landing on it is exactly what news_stacked already counts back
    -- in, so the two must never double-count the same row).
    (
      select count(*)::int
      from live l
      join public.news_dealt d
        on d.user_id = m.id and d.news_id = l.id
      where l.updated_at <= d.dealt_stamp
    ),
    (
      select count(distinct g.game)::int
      from public.game_results g
      where g.user_id = m.id
        and g.date = p_game_key
        and g.game in (select game from on_tonight)
    ),
    (select count(*)::int from on_tonight)
  from members m;
$$;

revoke all on function public.hive_member_status(date, text, text[]) from public;
grant execute on function public.hive_member_status(date, text, text[]) to authenticated;
