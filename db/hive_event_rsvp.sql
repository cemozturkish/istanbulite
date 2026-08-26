-- =====================================================================
-- hive_event_rsvp_status — who on your own petek is actually GOING to
-- something you kept.
--
-- The sibling of hive_event_interest_status (db/hive_event_interest.sql),
-- and deliberately a second question rather than a column added to that
-- one. A verdict is what somebody SAID about an event when it came past
-- them on Kahvehane's deck; an RSVP is that they are going to be
-- standing there. "There is somebody to go with" and "somebody is
-- going" are not the same fact, and a page that printed them as one
-- would be worth nothing.
--
-- It needs no table of its own: event_rsvps already holds the answer,
-- and every other page on the site reads it directly. What it needs is
-- the same fence hive_member_status and hive_event_interest_status
-- stand behind -- it takes no member list, only the caller's own list of
-- events, and can therefore only ever answer for the people already
-- standing on the caller's own map. The `members` CTE is the identical
-- join on hive_cells.map_id those two use.
--
-- The caller is deliberately NOT in the answer: Anahane already knows
-- its own reader's RSVP (myRsvpIds) and paints their hexagon from it,
-- which is also what lets the mark appear the instant the button is
-- pressed rather than after a round trip.
--
-- Run this in the Supabase SQL editor. It's idempotent.
-- =====================================================================

create or replace function public.hive_event_rsvp_status(
  p_event_ids uuid[]
)
returns table (
  event_id  uuid,
  member_id uuid
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
  select r.event_id, r.user_id
  from public.event_rsvps r
  join members m on m.id = r.user_id
  where r.event_id = any(p_event_ids);
$$;

revoke all on function public.hive_event_rsvp_status(uuid[]) from public;
grant execute on function public.hive_event_rsvp_status(uuid[]) to authenticated;
