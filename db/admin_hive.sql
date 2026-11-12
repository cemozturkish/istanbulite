-- =====================================================================
-- ADMIN: control of the petek (admin.html -> Petek)
--
-- hive_cells / hive_bonds / hive_slot_offers carry no client policies at
-- all (db/hive_lattice_v4.sql, db/hive_slot_codes_v5.sql): a member sees
-- only their own map through hive_map(). The admin therefore reads and
-- writes the grid through SECURITY DEFINER functions of its own, every
-- one of which starts with an is_admin() check. Nothing here is
-- reachable by a member.
--
--   admin_hive_cells()            every placed member, with their map
--   admin_hive_bonds()            every attachment
--   admin_hive_remove_member(id)  takes one member out of the petek
--   admin_hive_unbond(a, b)       breaks one attachment (ignores the
--                                 week lock a member is held to)
--   admin_hive_dissolve_map(map)  empties a whole petek
--
-- Removing someone from a petek does NOT touch their account. They
-- become their own single hexagon again, exactly as a member who has
-- never attached, and can be attached anew with a code.
--
-- A removal can cut a petek in two (the member removed was the only
-- thing joining two groups). The pieces keep their positions but are
-- given maps of their own (hive_resplit_map), so the shape drawn for
-- everyone stays the truth about who is connected to whom.
--
-- Run in the Supabase SQL editor AFTER db/hive_lattice_v4.sql and
-- db/hive_slot_codes_v5.sql. Idempotent.
-- =====================================================================

-- ── Reading ───────────────────────────────────────────────────────────
create or replace function public.admin_hive_cells()
returns table (
  user_id      uuid,
  map_id       uuid,
  q            int,
  r            int,
  first_name   text,
  last_name    text,
  neighborhood text,
  joined_at    timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;
  return query
    select c.user_id, c.map_id, c.q, c.r,
           p.first_name, p.last_name, p.neighborhood, c.joined_at
    from public.hive_cells c
    left join public.profiles p on p.id = c.user_id
    order by c.map_id, c.r, c.q;
end;
$$;

create or replace function public.admin_hive_bonds()
returns table (
  a            uuid,
  b            uuid,
  map_id       uuid,
  bonded_at    timestamptz,
  locked_until date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;
  return query
    select b.a, b.b, b.map_id, b.bonded_at, b.locked_until
    from public.hive_bonds b
    order by b.map_id, b.bonded_at;
end;
$$;

-- ── Keeping maps honest after a removal ───────────────────────────────
-- Gives every connected group of one map, except the largest, a map id
-- of its own. Positions are left alone: only the label moves, and the
-- (map_id, q, r) uniqueness cannot be hit because the groups already
-- stood on distinct places of one map.
create or replace function public.hive_resplit_map(p_map uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  grp  record;
  keep boolean := true;
  nid  uuid;
begin
  for grp in
    with recursive reach(root, node) as (
      select c.user_id, c.user_id
      from public.hive_cells c where c.map_id = p_map
      union
      select r.root,
             case when b.a = r.node then b.b else b.a end
      from reach r
      join public.hive_bonds b on b.a = r.node or b.b = r.node
    ),
    comp as (
      select node as user_id, min(root::text) as grp_key
      from reach group by node
    )
    select array_agg(user_id) as members
    from comp
    group by grp_key
    order by count(*) desc, grp_key
  loop
    if keep then keep := false; continue; end if;
    nid := gen_random_uuid();
    update public.hive_cells set map_id = nid where user_id = any(grp.members);
    update public.hive_bonds set map_id = nid where a = any(grp.members);
  end loop;
end;
$$;

revoke all on function public.hive_resplit_map(uuid) from public;

-- Cells left holding no bond at all go (a member attached to nobody has
-- no cell, see hive_lattice_v4), then the map is re-split.
create or replace function public.hive_tidy_map(p_map uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_map is null then return; end if;
  delete from public.hive_cells c
  where c.map_id = p_map
    and not exists (
      select 1 from public.hive_bonds b
      where b.a = c.user_id or b.b = c.user_id
    );
  perform public.hive_resplit_map(p_map);
end;
$$;

revoke all on function public.hive_tidy_map(uuid) from public;

-- ── Taking a member out ───────────────────────────────────────────────
create or replace function public.admin_hive_remove_member(p_member uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m uuid;
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;

  select c.map_id into m from public.hive_cells c where c.user_id = p_member;

  delete from public.hive_bonds b where b.a = p_member or b.b = p_member;
  delete from public.hive_cells c where c.user_id = p_member;
  -- Their open seats go with them; a code they minted must not still
  -- put somebody on the grid beside a hexagon that is no longer there.
  delete from public.hive_slot_offers o where o.owner_id = p_member;

  perform public.hive_tidy_map(m);
end;
$$;

-- ── Breaking one attachment ───────────────────────────────────────────
create or replace function public.admin_hive_unbond(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m uuid;
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;

  select b.map_id into m from public.hive_bonds b
  where b.a = least(p_a, p_b) and b.b = greatest(p_a, p_b);
  if not found then
    raise exception 'not_bonded';
  end if;

  delete from public.hive_bonds b
  where b.a = least(p_a, p_b) and b.b = greatest(p_a, p_b);

  perform public.hive_tidy_map(m);
end;
$$;

-- ── Emptying a whole petek ────────────────────────────────────────────
create or replace function public.admin_hive_dissolve_map(p_map uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin' using errcode = '42501';
  end if;

  delete from public.hive_slot_offers o
  where o.owner_id in (select c.user_id from public.hive_cells c where c.map_id = p_map);
  delete from public.hive_bonds b where b.map_id = p_map;
  delete from public.hive_cells c where c.map_id = p_map;
end;
$$;

revoke all on function public.admin_hive_cells() from public;
revoke all on function public.admin_hive_bonds() from public;
revoke all on function public.admin_hive_remove_member(uuid) from public;
revoke all on function public.admin_hive_unbond(uuid, uuid) from public;
revoke all on function public.admin_hive_dissolve_map(uuid) from public;
grant execute on function public.admin_hive_cells() to authenticated;
grant execute on function public.admin_hive_bonds() to authenticated;
grant execute on function public.admin_hive_remove_member(uuid) to authenticated;
grant execute on function public.admin_hive_unbond(uuid, uuid) to authenticated;
grant execute on function public.admin_hive_dissolve_map(uuid) to authenticated;
