-- =====================================================================
-- news_dealt + hive_member_status — what the people beside you are in
-- the middle of, printed next to their name on the petek.
--
-- The petek's middle depth names the six members touching the reader.
-- A name alone says who is there; what it does not say is where they
-- ARE — how much of the day's news is still stacked in their Kütüphane,
-- how far into the day's games they have got. That is the app's own
-- formula (people → their ideas → our opinions on those ideas) applied
-- to the drawing the app is built around: you see that these people
-- exist AND that they are in the middle of something, which is the
-- thing worth walking up to them about.
--
-- Two halves, and only one of them needed a new table:
--
--   * The games were already here. game_results is readable by every
--     signed-in member and game_day_toggles says how many games the day
--     has at all, so "1/3" is arithmetic over rows that already exist.
--
--   * The news deck was not. What a member has dealt with lived only in
--     their own localStorage (dunya_dealt_<uid> in kutuphane.html), so
--     nothing outside that one browser could say how deep their deck
--     still is. news_dealt below is that same store, written server-side
--     as well — same semantics exactly: what is remembered is not "this
--     story is done" but the story's own updated_at AS THROWN, so a
--     gelişme landing on the timeline brings it back for them, and their
--     count on somebody else's petek goes back up with it.
--
-- Run this in the Supabase SQL editor. It's idempotent.
-- =====================================================================

-- ── The deck, per member ──
create table if not exists public.news_dealt (
  user_id     uuid not null references auth.users(id) on delete cascade,
  news_id     uuid not null references public.breaking_news(id) on delete cascade,
  -- The story as thrown: breaking_news.updated_at at that moment. A
  -- story that has since moved past this stamp is back in their deck.
  dealt_stamp timestamptz not null,
  dealt_at    timestamptz not null default now(),
  primary key (user_id, news_id)
);

create index if not exists news_dealt_user_idx on public.news_dealt (user_id);

alter table public.news_dealt enable row level security;

-- A member reads and writes their own rows and nobody else's. What
-- another member is *counted* as having left is answered by
-- hive_member_status below, which hands back a number and never a list
-- of stories: the petek says somebody has three left to read, never
-- which three. Reading over somebody's shoulder is not what the middle
-- page is for.
drop policy if exists "news_dealt select own" on public.news_dealt;
create policy "news_dealt select own"
  on public.news_dealt for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "news_dealt insert own" on public.news_dealt;
create policy "news_dealt insert own"
  on public.news_dealt for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "news_dealt update own" on public.news_dealt;
create policy "news_dealt update own"
  on public.news_dealt for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "news_dealt delete own" on public.news_dealt;
create policy "news_dealt delete own"
  on public.news_dealt for delete
  to authenticated
  using (user_id = auth.uid());

-- ── Where everybody on your petek stands, right now ──
-- Takes no member list: it answers for exactly the members on the
-- caller's own map, the same set hive_map() draws. A function that took
-- ids would be a directory anyone could sweep; this one can only tell
-- you about people you are already standing next to.
--
-- The two dates are the client's, because the Istanbul day is the
-- client's (see ist-date.js, and coding convention 10): p_game_date is
-- the ISO day game_day_toggles is keyed by, p_game_key the unpadded
-- "Y-M-D" that game_results.date has always been written as.
create or replace function public.hive_member_status(
  p_game_date date,
  p_game_key  text
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
  -- The same window the deck itself is built from (see loadDunyaNews in
  -- kutuphane.html): live, unarchived, touched in the last 72 hours.
  live as (
    select id, updated_at
    from public.breaking_news
    where archived_at is null
      and updated_at >= now() - interval '72 hours'
  ),
  off as (
    select game
    from public.game_day_toggles
    where game_date = p_game_date
      and game in ('sozcel', 'tumcel', 'bulmaca')
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
    -- Played means a row exists for the day, exactly as every other
    -- aggregation over this table reads it (see db/game_results.sql):
    -- an abandoned game still counts as one the member has started
    -- their day with. A game the admin switched off is not counted on
    -- either side of the fraction — it is not a step anybody has left
    -- to take.
    (
      select count(distinct g.game)::int
      from public.game_results g
      where g.user_id = m.id
        and g.date = p_game_key
        and g.game in ('sozcel', 'tumcel', 'bulmaca')
        and g.game not in (select game from off)
    ),
    (3 - (select count(*)::int from off))
  from members m;
$$;

revoke all on function public.hive_member_status(date, text) from public;
grant execute on function public.hive_member_status(date, text) to authenticated;
