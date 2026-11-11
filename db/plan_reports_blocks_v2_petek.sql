-- =====================================================================
-- plan_reports_blocks_v2_petek — a block takes the member off your petek.
--
-- db/plan_reports_blocks.sql made a block hide the other member's plans,
-- and left them standing on the blocker's petek: their hexagon, their
-- name, their avatar, still attached. A block that still shows you the
-- person is not one. So, from here on, a block does two more things:
--
--   1. IT BREAKS THE BOND, whatever the week. hive_unbond refuses a bond
--      made this week ("a petek that can be unpicked the moment it is
--      built is a drawing, not a structure") -- that is a rule for
--      friends changing their minds, not for somebody being blocked. The
--      cells are released the same way hive_unbond releases them: a
--      member left holding no bonds steps off the grid; everybody else
--      keeps their coordinates.
--
--   2. hive_map() LEAVES THEM OUT, both ways. The petek is one shared
--      grid, so a blocked member can still be standing on it through
--      somebody else's bond. Their cell stays where it is (moving them
--      would move a formation other people are standing in) but neither
--      of the two is drawn on the other's map. hive_hidden_cells() hands
--      the client just those positions, which it draws as dark hexagons
--      nobody can press -- somebody is there, and you are not shown who.
--      Nobody else's petek changes: only the two members' own bond
--      breaks, and everyone else still sees everyone.
--
-- Blocks made before this migration get step 1 applied at the bottom.
--
-- Run in the Supabase SQL editor AFTER db/plan_reports_blocks.sql.
-- Idempotent.
-- =====================================================================


-- ── Breaking a bond for a block ──────────────────────────────────────
-- Internal: called by report_plan and by the backfill below, never by a
-- client (no grant).
create or replace function public.hive_break_for_block(p_one uuid, p_two uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.hive_bonds b
  where b.a = least(p_one, p_two) and b.b = greatest(p_one, p_two);

  delete from public.hive_cells c
  where c.user_id in (p_one, p_two)
    and not exists (
      select 1 from public.hive_bonds b
      where b.a = c.user_id or b.b = c.user_id
    );
end;
$$;

revoke all on function public.hive_break_for_block(uuid, uuid) from public;


-- ── report_plan, now breaking the bond on a block ────────────────────
-- Same signature as db/plan_reports_blocks.sql.
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
     or not public.event_readable(e.audience, e.created_by) then
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


-- ── The petek, minus blocks ──────────────────────────────────────────
-- Same columns as db/hive_lattice_v4.sql; one extra condition.
create or replace function public.hive_map()
returns table (
  member_id        uuid,
  q                int,
  r                int,
  first_name       text,
  last_name        text,
  neighborhood     text,
  avatar_url       text,
  avatar_hair      text,
  avatar_hat       text,
  avatar_accessory text,
  avatar_shirt     text,
  cover_badges     jsonb,
  bonded           boolean,
  locked           boolean,
  joined_at        timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select * from public.hive_cells where user_id = auth.uid()
  )
  select c.user_id,
         c.q - me.q,
         c.r - me.r,
         p.first_name, p.last_name, p.neighborhood,
         p.avatar_url, p.avatar_hair, p.avatar_hat, p.avatar_accessory,
         p.avatar_shirt, p.cover_badges,
         (b.a is not null),
         coalesce(b.locked_until > public.hive_week_start(), false),
         c.joined_at
  from me
  join public.hive_cells c on c.map_id = me.map_id and c.user_id <> me.user_id
  join public.profiles p on p.id = c.user_id
  left join public.hive_bonds b
         on b.a = least(me.user_id, c.user_id)
        and b.b = greatest(me.user_id, c.user_id)
  where not exists (
    select 1 from public.member_blocks k
    where (k.blocker = me.user_id and k.blocked = c.user_id)
       or (k.blocker = c.user_id and k.blocked = me.user_id)
  )
  order by c.r, c.q;
$$;

revoke all on function public.hive_map() from public;
grant execute on function public.hive_map() to authenticated;


-- ── Where the hidden members stand ────────────────────────────────────
-- hive_map() leaves a blocked member out, but their cell is still on the
-- grid, and one standing on a side of the caller's own hexagon would
-- otherwise read as a free seat that refuses every code. So the client
-- draws these places as dark hexagons nobody can press. Positions only,
-- relative to the caller like hive_map(): no id, no name, nothing that
-- says who is standing there.
create or replace function public.hive_hidden_cells()
returns table (q int, r int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with me as (
    select * from public.hive_cells where user_id = auth.uid()
  )
  select c.q - me.q, c.r - me.r
  from me
  join public.hive_cells c on c.map_id = me.map_id and c.user_id <> me.user_id
  where exists (
    select 1 from public.member_blocks k
    where (k.blocker = me.user_id and k.blocked = c.user_id)
       or (k.blocker = c.user_id and k.blocked = me.user_id)
  );
$$;

revoke all on function public.hive_hidden_cells() from public;
grant execute on function public.hive_hidden_cells() to authenticated;


-- ── Blocks made before this migration ────────────────────────────────
do $$
declare k record;
begin
  for k in select blocker, blocked from public.member_blocks loop
    perform public.hive_break_for_block(k.blocker, k.blocked);
  end loop;
end $$;
