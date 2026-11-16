-- =====================================================================
-- ADMIN v2: moving a member on the petek (admin.html -> Petek, drag)
--
-- The admin desk draws every petek as its honeycomb and lets the admin
-- press and hold a member's hexagon and drag it somewhere else on the
-- same petek. This is the one write that does it:
--
--   admin_hive_move(member, q, r)
--
--   * Dropped on an EMPTY place: the member moves there.
--   * Dropped on ANOTHER MEMBER: the two swap places.
--
-- WHAT HAPPENS TO THE BONDS. A bond is an attachment between two
-- members standing side by side, and the shape on screen has to be the
-- truth about who is next to whom (db/hive_lattice_v4.sql). So a move
-- re-draws the bonds of whoever moved, and only theirs:
--
--   1. A moved member is attached to EVERYBODY it now stands beside.
--      Dragging someone next to somebody is the admin saying they
--      belong there; leaving them merely adjacent would be a drawing
--      that the petek's own rules (bonds, plan visibility through
--      event_readable) do not agree with.
--   2. A bond whose two members are no longer side by side is broken.
--      It cannot be drawn honestly any more, and that rule is older
--      than this file (the v4 migration drops exactly those bonds).
--   3. Two members either of whom has BLOCKED the other are never
--      attached by a move (db/plan_reports_blocks_v2_petek.sql): a
--      block breaks a bond whatever the week, and the admin desk must
--      not quietly make one back.
--   4. Anyone left holding no bond steps off the grid and the map is
--      re-split, exactly as after a removal (hive_tidy_map in
--      db/admin_hive.sql). The desk shows who that would be before the
--      drop is confirmed.
--
-- Bonds the move keeps keep their own bonded_at and week lock. A bond it
-- makes is locked for this week, the same as any bond a member makes
-- with a code (hive_claim_slot): the admin ignores the lock, members do
-- not.
--
-- Open seat codes are left alone: hive_slot_offers stores a side of its
-- owner, resolved when the code is claimed, so a code read out before a
-- move seats its newcomer beside the owner where the owner now stands.
--
-- Statuses (worded by admin.html, PETEK_MOVE_ERR):
--   ok          — moved
--   not_placed  — that member is not standing on any petek
--   same_place  — dropped where it was picked up
--   alone       — nobody (who has not blocked them) would stand beside
--                 them there, so they would simply fall off the petek;
--                 "Petekten çıkar" is the way to do that on purpose
--
-- Run in the Supabase SQL editor AFTER db/admin_hive.sql. Idempotent.
-- =====================================================================

-- ── Are two places side by side? ──────────────────────────────────────
-- Hex distance 1 in axial coordinates: (|dq| + |dr| + |dq + dr|) / 2 = 1.
-- That is exactly the six vectors of hive_dir(), with no table to read.
create or replace function public.hive_adjacent(q1 int, r1 int, q2 int, r2 int)
returns boolean
language sql
immutable
as $$
  select abs(q1 - q2) + abs(r1 - r2) + abs((q1 - q2) + (r1 - r2)) = 2;
$$;

-- ── Has either of two members blocked the other? ──────────────────────
-- Internal (no grant). Answers false on a database where
-- db/plan_reports_blocks.sql has not been run: the table is read through
-- EXECUTE so this function can exist without it.
create or replace function public.hive_pair_blocked(p_one uuid, p_two uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  hit boolean;
begin
  if to_regclass('public.member_blocks') is null then
    return false;
  end if;
  execute 'select exists (select 1 from public.member_blocks
                           where (blocker = $1 and blocked = $2)
                              or (blocker = $2 and blocked = $1))'
    into hit using p_one, p_two;
  return coalesce(hit, false);
end;
$$;

revoke all on function public.hive_pair_blocked(uuid, uuid) from public;

-- ── The move ──────────────────────────────────────────────────────────
create or replace function public.admin_hive_move(p_member uuid, p_q int, p_r int)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m      uuid;
  oq     int;
  orr    int;
  other  uuid;
  moved  uuid[];
  mv     uuid;
  mq     int;
  mr     int;
  nb     uuid;
  wk     date := public.hive_week_start();
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;
  if p_member is null or p_q is null or p_r is null then
    raise exception 'admin_hive_move: member and place are required' using errcode = '22004';
  end if;

  select c.map_id, c.q, c.r into m, oq, orr
  from public.hive_cells c where c.user_id = p_member;
  if not found then
    return 'not_placed';
  end if;
  if oq = p_q and orr = p_r then
    return 'same_place';
  end if;

  -- Nobody else may claim a seat on this petek while it is being moved.
  perform 1 from public.hive_cells c where c.map_id = m for update;

  select c.user_id into other
  from public.hive_cells c
  where c.map_id = m and c.q = p_q and c.r = p_r;

  -- Somebody has to be standing beside the place it is dropped on once
  -- the move is done (a swapped member counts from where it lands).
  if not exists (
    select 1 from public.hive_cells c
    where c.map_id = m
      and c.user_id <> p_member
      and public.hive_adjacent(
            case when c.user_id = other then oq else c.q end,
            case when c.user_id = other then orr else c.r end,
            p_q, p_r)
      and not public.hive_pair_blocked(p_member, c.user_id)
  ) then
    return 'alone';
  end if;

  -- The position constraint is deferred (hive_lattice_v4), so a swap may
  -- pass through a moment where two members stand on one place.
  update public.hive_cells set q = p_q, r = p_r where user_id = p_member;
  if other is not null then
    update public.hive_cells set q = oq, r = orr where user_id = other;
    moved := array[p_member, other];
  else
    moved := array[p_member];
  end if;

  -- 2. Bonds of a moved member whose two ends are no longer side by side.
  delete from public.hive_bonds b
  using public.hive_cells ca, public.hive_cells cb
  where (b.a = any(moved) or b.b = any(moved))
    and ca.user_id = b.a
    and cb.user_id = b.b
    and not public.hive_adjacent(ca.q, ca.r, cb.q, cb.r);

  -- 1 + 3. A moved member is attached to everybody beside it, unless
  -- either of the two has blocked the other.
  foreach mv in array moved loop
    select c.q, c.r into mq, mr from public.hive_cells c where c.user_id = mv;
    for nb in
      select c.user_id from public.hive_cells c
      where c.map_id = m
        and c.user_id <> mv
        and public.hive_adjacent(c.q, c.r, mq, mr)
    loop
      continue when public.hive_pair_blocked(mv, nb);
      insert into public.hive_bonds (a, b, map_id, locked_until)
      values (least(mv, nb), greatest(mv, nb), m, wk + 7)
      on conflict (a, b) do nothing;
    end loop;
  end loop;

  -- 4. Whoever holds no bond now steps off; the map is re-split.
  perform public.hive_tidy_map(m);

  return 'ok';
end;
$$;

revoke all on function public.admin_hive_move(uuid, int, int) from public;
grant execute on function public.admin_hive_move(uuid, int, int) to authenticated;
