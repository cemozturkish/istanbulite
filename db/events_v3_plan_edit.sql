-- =====================================================================
-- events_v3_plan_edit — a member may EDIT their own plan.
--
-- db/events_v2_plans.sql let a member put a plan up and take it back, and
-- nothing else: "Nobody can change it -- there is no update policy for
-- members at all". That left a typo, a wrong hour or a change of café
-- fixable only by taking the plan back (which drops everybody's answer
-- on it) and writing it again. This adds the one missing write.
--
-- WHAT AN EDIT MAY BE is exactly what an insert may be. The update policy
-- below restates the insert policy's fence on the NEW row (a petek row,
-- the caller's, no kefil, no edition, a district, a 1-80 character title,
-- a place of at most 80, dated inside the week the map shows) and adds
-- one thing on the OLD row: it has to be a petek row of the caller's
-- already. So an edit can never turn a plan into a city evening, hand it
-- to somebody else, or reach a row the caller did not write. There is no
-- count check -- an edit adds no row, so it cannot take anybody past the
-- five standing at once.
--
-- A PLAN THAT MOVES ASKS AGAIN. "I'm going" was said to a place and an
-- hour. If the creator changes either -- the day, the time or the
-- district -- the answers on it are cleared (event_rsvps and
-- event_interest), so the people who had said yes are not quietly
-- marked as going somewhere they never agreed to, and the people who had
-- said no get to look again. A new title or a new place name inside the
-- same district at the same hour keeps every answer: that is a
-- correction, not a different evening. The clearing is a SECURITY
-- DEFINER trigger because the creator holds no write on other members'
-- answers, and must not be given one.
--
-- The admin's own update policy (db/events_v2_plans.sql) stays fenced to
-- audience = 'city' on both sides, so this grants the admin nothing over
-- anybody else's plan either; an admin's own plan goes through this
-- member policy like anybody's.
--
-- Run in the Supabase SQL editor AFTER db/events_v2_plans.sql.
-- Idempotent.
-- =====================================================================

drop policy if exists "events update own plan" on public.events;
create policy "events update own plan"
  on public.events for update
  to authenticated
  using (audience = 'petek' and created_by = auth.uid())
  with check (
    audience = 'petek'
    and created_by = auth.uid()
    and kefil_id is null
    and edition_date is null
    and neighborhood is not null
    and char_length(btrim(title)) between 1 and 80
    and char_length(coalesce(location, '')) <= 80
    and event_date >= (date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')
    and event_date <  ((date_trunc('day', now() at time zone 'Europe/Istanbul') + interval '7 days') at time zone 'Europe/Istanbul')
  );

-- ── A plan that moves asks again ─────────────────────────────────────
create or replace function public.plan_moved_clear_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.audience = 'petek'
     and (new.event_date is distinct from old.event_date
          or new.neighborhood is distinct from old.neighborhood) then
    delete from public.event_rsvps    where event_id = new.id;
    delete from public.event_interest where event_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.plan_moved_clear_answers() from public;

drop trigger if exists events_plan_moved on public.events;
create trigger events_plan_moved
  after update on public.events
  for each row
  when (new.audience = 'petek')
  execute function public.plan_moved_clear_answers();
