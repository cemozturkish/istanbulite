-- =====================================================================
-- hive_pokes — OYUNA DÜRT: nudging somebody on your petek to play today.
--
-- WHAT A POKE IS FOR: the day's games. A poke says one thing -- "today's
-- games are waiting, play them" -- from somebody you handed a code to
-- face to face, so tonight's board on the petek fills up with the people
-- you actually know. It carries NO words of the poker's own -- no
-- message, no emoji, no reply box -- because a poke with a line of text
-- in it is a DM, and there are no DMs, ever (CLAUDE.md, "No DMs — ever").
--
-- WHOM: only somebody who has NOT yet finished today's games. The caller
-- names the games and the night's key (the client is the authority on
-- the İstanbul game night and the lineup, like hive_member_status), and
-- a member who has finished all of them answers 'played'.
--
-- WHO MAY POKE WHOM: only the two ends of a bond (hive_bonds) -- the
-- people you are actually attached to, not everybody standing on the
-- same grid -- and never across a block, in either direction.
--
-- HOW OFTEN: ONE poke a day per member, in total -- not one per friend.
-- Having just one makes it a choice (whom do I want on the board
-- tonight?) rather than a spray, and a member can still receive several,
-- one from each friend who picked them. A second poke the same day
-- answers 'already' and changes nothing.
--
-- WHAT THE RECEIVER GETS: a lock-screen push (kind 'poke', see
-- db/push_notifications.sql -- quiet hours hold, and it is re-checked at
-- release against the bond and blocks; a tap opens the games), and in
-- the app the poker's hexagon on their petek says "SENİ DÜRTTÜ" for the
-- rest of the day.
--
-- PRIVACY: no client policies on the table. A member learns only the
-- pokes between themselves and their own bonds, through hive_pokes_today().
-- The admin reads none (admin_push_log blanks the poke's text).
--
-- Run in the Supabase SQL editor AFTER db/hive_lattice_v4.sql,
-- db/plan_reports_blocks.sql and (re-)running db/push_notifications.sql.
-- Idempotent.
-- =====================================================================

create table if not exists public.hive_pokes (
  id        bigint      generated always as identity primary key,
  poker     uuid        not null references public.profiles(id) on delete cascade,
  poked     uuid        not null references public.profiles(id) on delete cascade,
  -- The İstanbul calendar day it was given on (content -- and the games
  -- -- turn at midnight, see "Launch state" in CLAUDE.md). The unique
  -- index on (poker, ist_day) is the one-a-day rule, enforced where two
  -- quick presses cannot race.
  ist_day   date        not null default ((now() at time zone 'Europe/Istanbul')::date),
  poked_at  timestamptz not null default now(),
  check (poker <> poked)
);
drop index if exists public.hive_pokes_daily_idx;
create unique index if not exists hive_pokes_one_a_day_idx on public.hive_pokes (poker, ist_day);
create index if not exists hive_pokes_poked_idx on public.hive_pokes (poked, ist_day);

alter table public.hive_pokes enable row level security;
-- No client policies: written through hive_poke(), read through
-- hive_pokes_today().


-- ── Poke ─────────────────────────────────────────────────────────────
-- Answers a status the UI words itself (profile.poke.err.* in i18n.js):
--   ok           poked; the push is queued
--   already      you already used today's poke (on anybody)
--   played       they have already finished today's games
--   not_bonded   you are not attached to them (or never were)
--   blocked      one of you blocked the other
--   self         that is you
drop function if exists public.hive_poke(uuid);
create or replace function public.hive_poke(p_member uuid, p_game_key text default null, p_games text[] default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me  uuid := auth.uid();
  n   int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_member is null or p_member = me then return 'self'; end if;
  if not exists (select 1 from public.hive_bonds hb
                 where hb.a = least(me, p_member) and hb.b = greatest(me, p_member)) then
    return 'not_bonded';
  end if;
  if to_regclass('public.member_blocks') is not null and exists (
       select 1 from public.member_blocks b
       where (b.blocker = me and b.blocked = p_member) or (b.blocker = p_member and b.blocked = me)) then
    return 'blocked';
  end if;
  -- Nothing left to poke them about: every game named is finished
  -- (attempts >= 1 -- the same reading the app's own tiles use).
  if p_game_key is not null and coalesce(array_length(p_games, 1), 0) > 0
     and not exists (
       select 1 from unnest(p_games) g
       where not exists (select 1 from public.game_results r
                         where r.user_id = p_member and r.game = g
                           and r.date = p_game_key and r.attempts >= 1)) then
    return 'played';
  end if;

  insert into public.hive_pokes (poker, poked) values (me, p_member)
  on conflict (poker, ist_day) do nothing;
  get diagnostics n = row_count;
  if n = 0 then return 'already'; end if;

  -- The push is best-effort: a database without the push tables, or a
  -- push that fails, must never lose the poke itself.
  begin
    -- Expires at the İstanbul midnight: a nudge to play today's games is
    -- worthless once they have turned over.
    perform public.push_enqueue(p_member, 'poke', null,
      jsonb_build_object('actor', me),
      'poke:' || me || ':' || ((now() at time zone 'Europe/Istanbul')::date)::text,
      (((now() at time zone 'Europe/Istanbul')::date + 1)::timestamp at time zone 'Europe/Istanbul'));
  exception when others then
    raise warning 'hive_poke push: %', sqlerrm;
  end;
  return 'ok';
end;
$$;


-- ── Today's pokes, between the caller and their own bonds ────────────
-- One row per bonded member with a poke either way today: when THEY
-- poked the caller (in_at) and when the caller poked THEM (out_at).
-- Nothing about anybody the caller is not attached to. Whether the
-- caller has used today's one poke at all is hive_poke_used_today().
create or replace function public.hive_pokes_today()
returns table (member_id uuid, in_at timestamptz, out_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with bonds as (
    select case when hb.a = auth.uid() then hb.b else hb.a end as m
    from public.hive_bonds hb
    where hb.a = auth.uid() or hb.b = auth.uid()
  ), today as (
    select (now() at time zone 'Europe/Istanbul')::date as d
  )
  select bonds.m,
         (select max(p.poked_at) from public.hive_pokes p, today
           where p.poker = bonds.m and p.poked = auth.uid() and p.ist_day = today.d),
         (select max(p.poked_at) from public.hive_pokes p, today
           where p.poker = auth.uid() and p.poked = bonds.m and p.ist_day = today.d)
  from bonds
  where exists (select 1 from public.hive_pokes p, today
                where p.ist_day = today.d
                  and ((p.poker = bonds.m and p.poked = auth.uid())
                    or (p.poker = auth.uid() and p.poked = bonds.m)));
$$;

-- Has the caller spent today's poke? (On a member the reader may since
-- have lost their bond to, too -- it is still spent.)
create or replace function public.hive_poke_used_today()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.hive_pokes p
                 where p.poker = auth.uid()
                   and p.ist_day = (now() at time zone 'Europe/Istanbul')::date);
$$;

revoke all on function public.hive_poke(uuid, text, text[]) from public, anon;
revoke all on function public.hive_pokes_today() from public, anon;
revoke all on function public.hive_poke_used_today() from public, anon;
grant execute on function public.hive_poke(uuid, text, text[]) to authenticated;
grant execute on function public.hive_poke_used_today() to authenticated;
grant execute on function public.hive_pokes_today() to authenticated;
