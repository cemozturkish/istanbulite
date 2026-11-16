-- =====================================================================
-- events_v4_plan_reach — how far a member's plan TRAVELS.
--
-- Until now a plan (db/events_v2_plans.sql) reached exactly one ring:
-- its creator and the members ATTACHED to them on the petek. The plan
-- form now carries a three-stop slider, and the stop is stored here:
--
--   reach = 'petek'     PETEĞİM -- the members attached to the creator,
--                       hand to hand. One bond away. What every plan
--                       was before this, and what a null still means.
--   reach = 'petek2'    PETEĞİMİN PETEĞİ -- those, and the members
--                       attached to THEM. Two bonds away at most.
--   reach = 'istanbul'  İSTANBUL -- everybody the creator is joined to by
--                       any chain of bonds at all, however long. The big
--                       petek, not the member list: a member nobody on
--                       the creator's petek is attached to, by any route,
--                       still does not see it. That is the difference
--                       between this and a city evening (audience
--                       'city'), which every member reads.
--
-- DISTANCE IS COUNTED IN BONDS, NOT IN CELLS. Standing next to somebody
-- on the grid is not being attached to them (a third member's
-- attachment can put two strangers side by side), and the fence for
-- "where I will be tonight" has always been the people you actually met
-- -- so every hop is a row in hive_bonds, and 'istanbul' is the bond-
-- connected group the creator stands in. That group always lies inside
-- one map (attaching merges maps), but a map can hold more than it: a
-- bond broken by a block leaves both sides on one map (see
-- db/plan_reports_blocks_v2_petek.sql), and those two halves are no
-- longer joined. The map is only used as a quick "no" below.
--
-- BLOCKS STILL WIN, at every distance. A blocked pair never reads each
-- other's plans however short the chain between them, the way
-- db/plan_reports_blocks.sql made it for one hop. A blocked pair is also
-- never a bridge, because the block broke their bond.
--
-- NARROWING A PLAN TAKES BACK WHAT IT GAVE. A creator who pulls a plan
-- from İstanbul back to their petek leaves everybody further out unable
-- to read it -- so their answers (event_rsvps, event_interest) are
-- cleared by the same trigger that clears every answer when a plan
-- moves, or the creator's own petek would go on showing people as going
-- to an evening they can no longer see. Widening clears nothing.
--
-- WHO CAN ASK WHAT. hive_reaches() answers about any two members, so it
-- is callable only from inside the database (no grant to anybody).
-- event_readable() asks it about the CALLER alone, which tells a member
-- how far they stand from somebody -- the same thing a plan from that
-- somebody already says when it reaches them. plan_reach_counts()
-- hands the caller three numbers for the form, and no names.
--
-- event_readable() GAINS A THIRD ARGUMENT, and the two-argument one is
-- dropped once nothing calls it: two candidates of one name invite a
-- policy re-created from an older file to quietly pick the narrower one.
-- Every caller is restated here -- the events read policy,
-- hive_event_rsvp_status, hive_event_interest_status and report_plan --
-- each with the same signature it already had.
--
-- Run in the Supabase SQL editor AFTER db/events_v3_plan_edit.sql and
-- db/plan_reports_blocks_v2_petek.sql. Idempotent.
-- =====================================================================


-- ── The column ───────────────────────────────────────────────────────
-- Nullable, and null is 'petek': every plan written before this, and any
-- written by a page still holding the old script, reaches exactly as far
-- as it always did. A city evening carries null; the column means
-- nothing on one.
alter table public.events
  add column if not exists reach text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_reach_check'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_reach_check
      check (reach is null or reach in ('petek', 'petek2', 'istanbul'));
  end if;
end $$;


-- ── A stop, as a number of bonds ─────────────────────────────────────
-- Null is "any distance". Anything unrecognised is ONE hop, never
-- "any": an unknown value must fail narrow.
create or replace function public.plan_reach_hops(p_reach text)
returns int
language sql
immutable
as $$
  select case coalesce(p_reach, 'petek')
           when 'petek2'   then 2
           when 'istanbul' then null
           else 1
         end;
$$;


-- ── Is p_to within p_hops bonds of p_from? ───────────────────────────
-- Null p_hops is any distance. A member is always within reach of
-- themselves. SECURITY DEFINER because hive_bonds, hive_cells and
-- member_blocks have no client read policies; internal only (see the
-- revoke at the foot of this block).
create or replace function public.hive_reaches(p_from uuid, p_to uuid, p_hops int)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  m_from uuid;
  hit    boolean;
begin
  if p_from is null or p_to is null then return false; end if;
  if p_from = p_to then return true; end if;

  if exists (
    select 1 from public.member_blocks k
    where (k.blocker = p_from and k.blocked = p_to)
       or (k.blocker = p_to   and k.blocked = p_from)
  ) then
    return false;
  end if;

  -- One bond.
  if exists (
    select 1 from public.hive_bonds b
    where b.a = least(p_from, p_to) and b.b = greatest(p_from, p_to)
  ) then
    return true;
  end if;
  if p_hops is not null and p_hops <= 1 then return false; end if;

  -- Two bonds: somebody attached to both.
  with nf as (
    select case when b.a = p_from then b.b else b.a end as m
    from public.hive_bonds b
    where b.a = p_from or b.b = p_from
  )
  select exists (
    select 1 from nf
    join public.hive_bonds b
      on b.a = least(nf.m, p_to) and b.b = greatest(nf.m, p_to)
  ) into hit;
  if hit then return true; end if;
  if p_hops is not null and p_hops <= 2 then return false; end if;

  -- Any distance. Two members joined by bonds always stand on one map,
  -- so a different map (or no cell at all) is a "no" without a walk.
  select c.map_id into m_from from public.hive_cells c where c.user_id = p_from;
  if m_from is null
     or not exists (select 1 from public.hive_cells c
                    where c.user_id = p_to and c.map_id = m_from) then
    return false;
  end if;

  -- The walk: UNION (not UNION ALL) over members alone, so a cycle in
  -- the petek is visited once and the walk ends.
  with recursive walk(node) as (
    select p_from
    union
    select case when b.a = w.node then b.b else b.a end
    from walk w
    join public.hive_bonds b on b.a = w.node or b.b = w.node
  )
  select exists (select 1 from walk where node = p_to) into hit;
  return hit;
end;
$$;

revoke all on function public.hive_reaches(uuid, uuid, int) from public;
do $$
begin
  -- Supabase grants every new function in public to these roles by
  -- default privilege, so revoking from PUBLIC alone leaves them able to
  -- call it -- and this one answers about any two members.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.hive_reaches(uuid, uuid, int) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.hive_reaches(uuid, uuid, int) from authenticated';
  end if;
end $$;


-- ── Who may read a row ───────────────────────────────────────────────
-- plpgsql so the city's rows never pay for the walk: a SQL OR does not
-- promise to evaluate its left side first.
create or replace function public.event_readable(p_audience text, p_created_by uuid, p_reach text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_audience is distinct from 'petek' then return true; end if;
  return public.hive_reaches(p_created_by, auth.uid(), public.plan_reach_hops(p_reach));
end;
$$;

revoke all on function public.event_readable(text, uuid, text) from public;
grant execute on function public.event_readable(text, uuid, text) to authenticated;

drop policy if exists "events read for authenticated" on public.events;
create policy "events read for authenticated"
  on public.events for select
  to authenticated
  using (public.event_readable(audience, created_by, reach));


-- ── The petek's guest lists, through the new fence ───────────────────
-- Same signatures as db/events_v2_plans.sql.
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
    and public.event_readable(e.audience, e.created_by, e.reach);
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
    and public.event_readable(e.audience, e.created_by, e.reach);
$$;

revoke all on function public.hive_event_interest_status(uuid[]) from public;
grant execute on function public.hive_event_interest_status(uuid[]) to authenticated;


-- ── report_plan, through the new fence ───────────────────────────────
-- Same signature and body as db/plan_reports_blocks_v2_petek.sql; only
-- the readability check changes. A member can report (and block) the
-- creator of any plan that reached them, at whatever distance.
create or replace function public.report_plan(p_event_id uuid, p_block boolean default false)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  e public.events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into e from public.events where id = p_event_id;
  if not found
     or e.audience is distinct from 'petek'
     or e.created_by = auth.uid()
     or not public.event_readable(e.audience, e.created_by, e.reach) then
    raise exception 'not_reportable';
  end if;

  insert into public.content_reports (reporter, reported_user, event_id, reason, title, location, event_date)
  values (auth.uid(), e.created_by, e.id,
          case when p_block then 'block' else 'report' end,
          e.title, e.location, e.event_date);

  if p_block then
    insert into public.member_blocks (blocker, blocked)
    values (auth.uid(), e.created_by)
    on conflict do nothing;
    perform public.hive_break_for_block(auth.uid(), e.created_by);
  end if;
end;
$$;

revoke all on function public.report_plan(uuid, boolean) from public;
grant execute on function public.report_plan(uuid, boolean) to authenticated;


-- ── The two-argument fence goes ──────────────────────────────────────
-- Nothing calls it any more: the policy and the three functions above
-- were its only callers.
drop function if exists public.event_readable(text, uuid);


-- ── A plan that moves asks again; a plan that narrows lets go ────────
-- Same trigger as db/events_v3_plan_edit.sql. Moving the day, the hour
-- or the district still clears every answer. Changing only the reach
-- clears the answers of the members it no longer reaches -- which, for
-- a plan that was widened, is nobody.
create or replace function public.plan_moved_clear_answers()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.audience = 'petek' then
    if new.event_date is distinct from old.event_date
       or new.neighborhood is distinct from old.neighborhood then
      delete from public.event_rsvps    where event_id = new.id;
      delete from public.event_interest where event_id = new.id;
    elsif coalesce(new.reach, 'petek') is distinct from coalesce(old.reach, 'petek') then
      delete from public.event_rsvps r
       where r.event_id = new.id
         and not public.hive_reaches(new.created_by, r.user_id, public.plan_reach_hops(new.reach));
      delete from public.event_interest i
       where i.event_id = new.id
         and not public.hive_reaches(new.created_by, i.user_id, public.plan_reach_hops(new.reach));
    end if;
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


-- ── How many each stop reaches, for the form ─────────────────────────
-- The caller's own three numbers -- members one bond away, two bonds
-- away at most, and joined by any chain -- never counting the caller or
-- anybody either side has blocked. Exactly the people
-- event_readable(..., reach) would let read the caller's plan, counted
-- rather than named. A member attached to nobody gets three zeros.
create or replace function public.plan_reach_counts()
returns table (petek int, petek2 int, istanbul int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with recursive
  me as (
    select auth.uid() as id
  ),
  blocked as (
    select case when k.blocker = me.id then k.blocked else k.blocker end as m
    from public.member_blocks k, me
    where k.blocker = me.id or k.blocked = me.id
  ),
  n1 as (
    select case when b.a = me.id then b.b else b.a end as m
    from public.hive_bonds b, me
    where b.a = me.id or b.b = me.id
  ),
  n2 as (
    select m from n1
    union
    select case when b.a = n1.m then b.b else b.a end
    from n1
    join public.hive_bonds b on b.a = n1.m or b.b = n1.m
  ),
  walk(m) as (
    select id from me
    union
    select case when b.a = w.m then b.b else b.a end
    from walk w
    join public.hive_bonds b on b.a = w.m or b.b = w.m
  )
  select
    (select count(*) from n1, me
      where n1.m <> me.id and n1.m not in (select m from blocked))::int,
    (select count(*) from n2, me
      where n2.m <> me.id and n2.m not in (select m from blocked))::int,
    (select count(*) from walk, me
      where walk.m <> me.id and walk.m not in (select m from blocked))::int;
$$;

revoke all on function public.plan_reach_counts() from public;
grant execute on function public.plan_reach_counts() to authenticated;

notify pgrst, 'reload schema';
