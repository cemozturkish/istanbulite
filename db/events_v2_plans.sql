-- =====================================================================
-- events_v2_plans — a member's own PLAN: "I'll be here, this day, this
-- time", shown only to the people attached to them on the petek.
--
-- A plan is a row in `events`, not a table of its own, so the card, the
-- RSVP and the petek's guest-list colours all work on it unchanged:
-- event_rsvps, event_interest, hive_event_rsvp_status and
-- hive_event_interest_status already take an event id and nothing else.
-- What tells the two kinds apart is one column:
--
--   audience = 'city'   an evening the admin writes and curates into a
--                       baskı; readable by every member, exactly as
--                       every row before this migration is and stays.
--   audience = 'petek'  a member's plan. It never goes through a baskı
--                       (edition_date stays null, so
--                       events_current_edition() never sees it), and it
--                       is readable only by its creator and by the
--                       members ATTACHED to them on the petek.
--
-- WHO SEES A PLAN is the whole point, so it is stated once:
-- public.event_readable(). "Attached" means a row in hive_bonds -- the
-- hand-to-hand attachment, made by reading a code out to somebody
-- standing in front of you -- and NOT merely standing next to somebody
-- on the grid. Two members can end up adjacent without a bond (a third
-- member attached to one of them landed beside the other), and that
-- adjacency is somebody else's doing; saying where you will be and when
-- is personal, and the fence for it is the people you actually met.
--
-- The admin reads no plan through the client either (event_readable has
-- no is_admin() clause). A plan is a few people telling each other where
-- they will be, which is as close to private speech as this site has,
-- and Istanbulite does not read its members' private speech (see "No
-- DMs — ever" in CLAUDE.md). An admin who is also a member sees their
-- own petek's plans like anybody else, which is why admin.html filters
-- audience = 'petek' out of its event lists.
--
-- A PLAN'S KEFIL IS ITS CREATOR, but that is said by created_by, not by
-- kefil_id. kefil_id stays what db/events_kefil.sql made it: the member
-- the admin assigned to vouch for a city evening, counted on their
-- profile as "Etkinlik Kefili". A member's own plans must not inflate
-- that count, so a plan carries kefil_id = null and the client reads
-- `kefil_id || created_by` wherever it needs the name to print.
--
-- A plan LEAVES AT MIDNIGHT AFTER ITS DAY. Nothing deletes it: the home
-- screen only asks for evenings from today's İstanbul midnight onwards,
-- the same window the city evenings are read through. Its creator can
-- take it back before then (the delete policy below). Nobody else can
-- change it -- there is no update policy for members at all -- and the
-- only thing another member can do with it is say whether they are
-- going. No edits and no comments, so still no DMs.
--
-- Run in the Supabase SQL editor AFTER db/events_kefil.sql,
-- db/hive_event_interest.sql and db/hive_event_rsvp.sql (this file
-- redefines the two hive_event_* functions and the event_interest
-- policies). Idempotent.
-- =====================================================================


-- ── The two columns ──────────────────────────────────────────────────
-- created_by cascades: a member who deletes their account takes their
-- own plans with them, the way their comments go. A city evening has no
-- creator recorded (it is the admin's).
alter table public.events
  add column if not exists created_by uuid references public.profiles(id) on delete cascade,
  add column if not exists audience   text not null default 'city';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_audience_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_audience_check check (
        audience = 'city'
        or (audience = 'petek' and created_by is not null and edition_date is null)
      );
  end if;
end $$;

create index if not exists events_petek_idx
  on public.events (created_by, event_date)
  where audience = 'petek';


-- ── Who may read a row ───────────────────────────────────────────────
-- SECURITY DEFINER because hive_bonds has no client policies at all (see
-- db/hive_lattice_v4.sql). It only ever answers about the CALLER's own
-- bonds -- "am I attached to this member" -- which the caller already
-- knows from hive_map(), so it opens nothing new.
create or replace function public.event_readable(p_audience text, p_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_audience is distinct from 'petek'
      or p_created_by = auth.uid()
      or exists (
        select 1 from public.hive_bonds b
        where b.a = least(p_created_by, auth.uid())
          and b.b = greatest(p_created_by, auth.uid())
      );
$$;

revoke all on function public.event_readable(text, uuid) from public;
grant execute on function public.event_readable(text, uuid) to authenticated;

drop policy if exists "events read for authenticated" on public.events;
create policy "events read for authenticated"
  on public.events for select
  to authenticated
  using (public.event_readable(audience, created_by));


-- ── A member writes their own plan, and may take it back ─────────────
-- What the form can send and nothing more: a petek row, theirs, with no
-- kefil and no edition, in a district, inside the week the map shows
-- (today's İstanbul midnight to seven days on), titled, and at most five
-- standing at once -- an offer to a few people, not a channel to fill.
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
    and (
      select count(*) from public.events e
      where e.created_by = auth.uid()
        and e.audience = 'petek'
        and e.event_date >= (date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul')
    ) < 5
  );

drop policy if exists "events delete own plan" on public.events;
create policy "events delete own plan"
  on public.events for delete
  to authenticated
  using (audience = 'petek' and created_by = auth.uid());

-- ── And the admin's own write policies stop at the city ──────────────
-- Policies are permissive: they OR together, so the creator-only rule
-- above holds only if nothing else grants a write on a plan. The admin's
-- three from db/events.sql checked the email and nothing else, and the
-- admin is a member too -- attached to a plan's creator, they can READ
-- that plan (event_readable), and an UPDATE or DELETE reaches every row
-- the reader can see. So unfenced, the admin could rewrite another
-- member's plan, or flip its audience to 'city' and publish a few
-- people's evening to the whole site. Restated here with the same email
-- check, limited to city rows on both sides of the write. The admin's
-- OWN plans go through the member policies above like anybody's.
-- Moderating a member's plan is for the Supabase dashboard, not the app.
drop policy if exists "events insert admin" on public.events;
create policy "events insert admin"
  on public.events for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com' and audience = 'city');

drop policy if exists "events update admin" on public.events;
create policy "events update admin"
  on public.events for update
  to authenticated
  using      ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com' and audience = 'city')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com' and audience = 'city');

drop policy if exists "events delete admin" on public.events;
create policy "events delete admin"
  on public.events for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com' and audience = 'city');


-- ── Answering: only what you can see ─────────────────────────────────
-- An RSVP or a verdict on an event is now readable and writable only
-- where the event itself is. The subqueries run as the caller, so the
-- events policy above is what decides; nothing is restated here.
drop policy if exists "event_rsvps read for authenticated" on public.event_rsvps;
create policy "event_rsvps read for authenticated"
  on public.event_rsvps for select
  to authenticated
  using (exists (select 1 from public.events e where e.id = event_id));

drop policy if exists "event_rsvps insert own" on public.event_rsvps;
create policy "event_rsvps insert own"
  on public.event_rsvps for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id)
  );

drop policy if exists "event_interest insert own" on public.event_interest;
create policy "event_interest insert own"
  on public.event_interest for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id)
  );

drop policy if exists "event_interest update own" on public.event_interest;
create policy "event_interest update own"
  on public.event_interest for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.events e where e.id = event_id)
  );


-- ── The petek's guest list, fenced the same way ──────────────────────
-- Both functions are SECURITY DEFINER, so they read every row whatever
-- the policies say. They already answer only for members on the caller's
-- own map; now they also answer only for events the caller can read, so
-- an id that somehow reached somebody outside a plan's petek tells them
-- nothing. Same signatures as db/hive_event_rsvp.sql and
-- db/hive_event_interest.sql, so `create or replace` is enough.
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
  join public.events e on e.id = r.event_id
  where r.event_id = any(p_event_ids)
    and public.event_readable(e.audience, e.created_by);
$$;

revoke all on function public.hive_event_rsvp_status(uuid[]) from public;
grant execute on function public.hive_event_rsvp_status(uuid[]) to authenticated;

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
  join public.events e on e.id = ei.event_id
  where ei.event_id = any(p_event_ids)
    and public.event_readable(e.audience, e.created_by);
$$;

revoke all on function public.hive_event_interest_status(uuid[]) from public;
grant execute on function public.hive_event_interest_status(uuid[]) to authenticated;
