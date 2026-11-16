-- One plan of a member's own per day, instead of at most five at once.
-- Restates the insert policy from events_v2_plans.sql with the count
-- narrowed to the same İstanbul day, so a member can fill every day of
-- the week the map shows (seven) but never put two on one day.
drop policy if exists "events insert own plan" on public.events;
create policy "events insert own plan"
  on public.events for insert
  to authenticated
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
    and not exists (
      select 1 from public.events e
      where e.created_by = auth.uid()
        and e.audience = 'petek'
        and (e.event_date at time zone 'Europe/Istanbul')::date
            = (events.event_date at time zone 'Europe/Istanbul')::date
    )
  );
