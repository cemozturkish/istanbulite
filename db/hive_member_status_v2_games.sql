-- =====================================================================
-- hive_member_status v2 — the caller names the games
--
-- v1 (db/hive_member_status.sql) hardcoded ('sozcel','tumcel','bulmaca')
-- and counted the night's total as `3 - (games switched off)`. Both were
-- true when it was written and neither is now: the app's own sequence is
-- Sözcel and Tümcel (GAME_DEFS in project.html), Bulmaca is not cast in
-- any column, and the petek's caption draws that column as TWO boxes
-- (HIVE_DAY_SLOTS in profile-card.js). A neighbour was therefore
-- reporting "3 games" into a column with two slots in it — the number
-- and the drawing disagreeing about the same night.
--
-- So the game list is the caller's. It is the one fact the client
-- genuinely knows better than the database: which games the app is
-- actually casting tonight is a property of the app, and a copy of that
-- list kept here is a copy that drifts (which is exactly what happened).
--
-- The v1 signature is deliberately LEFT IN PLACE rather than dropped:
-- Pages redeploys on push while this file is run by hand, so there is
-- always a window where new HTML meets an old database. The client asks
-- for v2 and falls back to v1 on PGRST202 (see loadHiveStatus), and a
-- database that has only ever run v1 keeps captioning members exactly as
-- it did.
--
-- Run this in the Supabase SQL editor. It's idempotent.
-- =====================================================================

create or replace function public.hive_member_status(
  p_game_date date,
  p_game_key  text,
  p_games     text[]
)
returns table (
  member_id    uuid,
  news_stacked int,
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
