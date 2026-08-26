-- =====================================================================
-- event_interest + hive_event_interest_status — what the people beside
-- you said about something you kept, printed on their own hexagon.
--
-- Same shape as news_dealt + hive_member_status (db/hive_member_status.sql):
-- a per-member table synced fire-and-forget beside the reader's own
-- localStorage (event-interest.js is still the source of truth for
-- their OWN verdict — this exists only so somebody ELSE'S hive query can
-- see it), and a SECURITY DEFINER RPC that only ever answers for the
-- members already on the caller's own map, for the exact events they
-- name. A function that took a member list would be a directory anyone
-- could sweep; this one can only tell you about the six people you are
-- already standing next to.
--
-- One row per (event, member, verdict) rather than a per-event tally:
-- the client already knows exactly which hexagon a member_id belongs to
-- (hive_map's own q/r), so painting a cell needs nothing more than the
-- same shape hive_map answers in.
--
-- Run this in the Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.event_interest (
  user_id    uuid not null references auth.users(id) on delete cascade,
  event_id   uuid not null references public.events(id) on delete cascade,
  verdict    text not null check (verdict in ('yes', 'no')),
  verdict_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create index if not exists event_interest_event_idx on public.event_interest (event_id);

alter table public.event_interest enable row level security;

drop policy if exists "event_interest select own" on public.event_interest;
create policy "event_interest select own"
  on public.event_interest for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "event_interest insert own" on public.event_interest;
create policy "event_interest insert own"
  on public.event_interest for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "event_interest update own" on public.event_interest;
create policy "event_interest update own"
  on public.event_interest for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "event_interest delete own" on public.event_interest;
create policy "event_interest delete own"
  on public.event_interest for delete
  to authenticated
  using (user_id = auth.uid());

-- ── Where everybody on your petek stands on the events you ask about ──
-- Takes no member list, the same as hive_member_status: the `members`
-- CTE below is the identical join on hive_cells.map_id that function
-- uses. p_event_ids is the caller's own list of which events to answer
-- for -- the ones actually standing in the petek's kept-events stack
-- right now, never a way to sweep somebody else's calendar.
create or replace function public.hive_event_interest_status(
  p_event_ids uuid[]
)
returns table (
  event_id  uuid,
  member_id uuid,
  verdict   text
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
  )
  select ei.event_id, ei.user_id, ei.verdict
  from public.event_interest ei
  join members m on m.id = ei.user_id
  where ei.event_id = any(p_event_ids);
$$;

revoke all on function public.hive_event_interest_status(uuid[]) from public;
grant execute on function public.hive_event_interest_status(uuid[]) to authenticated;
