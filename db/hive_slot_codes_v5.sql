-- =====================================================================
-- PETEK v5 — the code belongs to the SLOT, and only for a moment.
--
-- WHAT CHANGES, AND WHY
--
-- Until now every member carried one code for the whole Istanbul week
-- (hive_codes), and attaching meant typing somebody's code into a side
-- of your own hexagon that you picked. Two things were wrong with that
-- once the petek became one shared grid:
--
--   1. A code that identifies a *person* for a week is an identifier.
--      Hand it to one person and it is theirs to keep, to pass on, to
--      use next Tuesday. Whatever the week's rhythm was worth, it was
--      also a small permanent handle on a member.
--   2. The person who chose where the newcomer would stand was the
--      newcomer. You typed a code and picked a side of yourself; the
--      owner of the code had no say in where they ended up on the grid.
--
-- The code is now the **empty seat itself**: you tap a free side of your
-- own hexagon and the app mints a code for exactly that place, good for
-- a few minutes and for one person. You read it out to the member
-- standing in front of you; they type it in and land in that seat. Then
-- it is spent. Nobody carries a code around, so there is nothing to pass
-- on and nothing to look up — which is the same hand-to-hand rule the
-- old design was reaching for, made literal.
--
-- The exchange is still the only way in, and it still costs a meeting.
-- What is gone is the part that outlived the meeting.
--
-- SUPERSEDES the hive_codes half of db/hive_slots.sql, and
-- hive_bond_code(code, dir) in db/hive_lattice_v4.sql. hive_cells,
-- hive_bonds, hive_map(), hive_unbond(), hive_dir() and hive_rot() are
-- unchanged and still the shape of the petek. The old hive_codes table
-- is left in place, unread; nothing writes to it any more.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- How long an offered seat stands. Long enough to read six characters
-- out to somebody in front of you and watch them type it; short enough
-- that a code overheard across the room is already dead.
create or replace function public.hive_offer_ttl()
returns interval
language sql
immutable
as $$ select interval '10 minutes' $$;

create table if not exists public.hive_slot_offers (
  code       text        primary key,
  owner_id   uuid        not null references public.profiles(id) on delete cascade,
  -- The side of the owner's own hexagon this seat is on, 0-5 (see
  -- hive_dir in db/hive_lattice_v4.sql). Where that lands on the grid is
  -- resolved when the code is claimed, not when it is minted: the owner
  -- may not be standing anywhere yet, and somebody else's merge may move
  -- them in the meantime.
  dir        smallint    not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_by uuid        references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  constraint hive_slot_offers_dir_range check (dir between 0 and 5),
  constraint hive_slot_offers_format check (code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

create index if not exists hive_slot_offers_owner_idx
  on public.hive_slot_offers (owner_id, dir);

alter table public.hive_slot_offers enable row level security;

-- No client policies at all, as with the rest of the petek. A member
-- mints an offer through hive_offer_slot() and spends one through
-- hive_claim_slot(); reading the table is what would turn a hand-to-hand
-- exchange back into a directory, and claiming a code has to resolve a
-- row the caller was never allowed to see.

-- ── Mint the seat ──
-- Returns the code and when it dies. One live offer per side: tapping
-- the same side again replaces whatever was standing there rather than
-- leaving two doors into one seat.
create or replace function public.hive_offer_slot(p_dir smallint)
returns table (code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid    uuid := auth.uid();
  alpha  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  gen    text;
  tries  int := 0;
begin
  if uid is null then
    raise exception 'hive_offer_slot: authentication required' using errcode = '42501';
  end if;
  if p_dir is null or p_dir < 0 or p_dir > 5 then
    raise exception 'hive_offer_slot: direction out of range' using errcode = '22003';
  end if;

  -- Anything of this member's that is spent or dead is cleared out here
  -- rather than by a job: the table only ever needs to be tidy at the
  -- moment somebody asks it for a seat.
  delete from public.hive_slot_offers o
  where o.owner_id = uid
    and (o.dir = p_dir or o.expires_at < now() or o.claimed_at is not null);

  loop
    tries := tries + 1;
    gen := '';
    for i in 1..6 loop
      gen := gen || substr(alpha, 1 + floor(random() * length(alpha))::int, 1);
    end loop;
    exit when not exists (select 1 from public.hive_slot_offers o where o.code = gen);
    if tries > 40 then
      raise exception 'hive_offer_slot: could not mint a code';
    end if;
  end loop;

  insert into public.hive_slot_offers (code, owner_id, dir, expires_at)
  values (gen, uid, p_dir, now() + public.hive_offer_ttl());

  return query select gen, now() + public.hive_offer_ttl();
end;
$$;

-- ── Take the seat ──
-- The direction is the offer's, not the claimer's: whoever opened the
-- seat decided where it is, which is the whole point of the code being
-- the seat rather than the person.
--
-- Statuses, worded by the UI (see profile.hive.err.* in i18n.js):
--   ok             — attached
--   invalid_code   — no live seat with that code
--   expired        — there was one, and it has run out
--   spent          — somebody already took it
--   self           — that is your own seat
--   already_bonded — you two are already attached
--   dir_taken      — somebody moved into that place first
--   too_far        — you are both on this petek already, but not next to
--                    each other, and moving either of you would break a
--                    formation that is not yours to rearrange
--   no_room        — your two peteks cannot be joined there in any
--                    rotation without two members overlapping
create or replace function public.hive_claim_slot(p_code text)
returns table (status text, member_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid     uuid := auth.uid();
  offer   record;
  target  uuid;
  p_dir   smallint;
  v       int[];
  my_map  uuid; my_q int; my_r int; my_n int;
  th_map  uuid; th_q int; th_r int; th_n int;
  new_map uuid;
  mover   uuid;
  keeper  uuid;
  anch_q  int; anch_r int;
  need_q  int; need_r int;
  d       int;
  k       int;
  dirs    int[];
  fitted  boolean := false;
begin
  if uid is null then
    raise exception 'hive_claim_slot: authentication required' using errcode = '42501';
  end if;

  select * into offer from public.hive_slot_offers o
  where o.code = upper(btrim(coalesce(p_code, '')));

  if not found then
    return query select 'invalid_code'::text, null::uuid; return;
  end if;
  if offer.claimed_at is not null then
    return query select 'spent'::text, null::uuid; return;
  end if;
  if offer.expires_at < now() then
    return query select 'expired'::text, null::uuid; return;
  end if;

  target := offer.owner_id;
  p_dir  := offer.dir;

  if target = uid then
    return query select 'self'::text, null::uuid; return;
  end if;
  if exists (select 1 from public.hive_bonds b
             where b.a = least(uid, target) and b.b = greatest(uid, target)) then
    return query select 'already_bonded'::text, null::uuid; return;
  end if;

  -- From here on this is v4's attach, with the roles the offer decided:
  -- `target` is the member who opened the seat, and the caller lands on
  -- the side of them that the seat is on.
  v := public.hive_dir(p_dir);
  select c.map_id, c.q, c.r into my_map, my_q, my_r
  from public.hive_cells c where c.user_id = uid;
  select c.map_id, c.q, c.r into th_map, th_q, th_r
  from public.hive_cells c where c.user_id = target;

  -- ── Neither of us is on a petek yet: this bond starts one ──
  if my_map is null and th_map is null then
    new_map := gen_random_uuid();
    insert into public.hive_cells (user_id, map_id, q, r) values (target, new_map, 0, 0);
    insert into public.hive_cells (user_id, map_id, q, r)
      values (uid, new_map, v[1], v[2]);
    my_map := new_map;

  -- ── They are standing somewhere; I take the seat beside them ──
  elsif my_map is null then
    if exists (select 1 from public.hive_cells c
               where c.map_id = th_map and c.q = th_q + v[1] and c.r = th_r + v[2]) then
      return query select 'dir_taken'::text, null::uuid; return;
    end if;
    my_map := th_map;
    insert into public.hive_cells (user_id, map_id, q, r)
      values (uid, my_map, th_q + v[1], th_r + v[2]);

  -- ── I am standing somewhere and they are not: they join beside me ──
  -- The seat is still theirs to give, so it is still their side that
  -- decides the angle — I end up on the side of them they opened, which
  -- means they end up on the opposite side of me.
  elsif th_map is null then
    th_q := my_q - v[1];
    th_r := my_r - v[2];
    if exists (select 1 from public.hive_cells c
               where c.map_id = my_map and c.q = th_q and c.r = th_r) then
      th_q := null;
      for d in 0..5 loop
        if not exists (
          select 1 from public.hive_cells c
          where c.map_id = my_map
            and c.q = my_q + (public.hive_dir(d))[1]
            and c.r = my_r + (public.hive_dir(d))[2]
        ) then
          th_q := my_q + (public.hive_dir(d))[1];
          th_r := my_r + (public.hive_dir(d))[2];
          exit;
        end if;
      end loop;
      if th_q is null then
        return query select 'no_room'::text, null::uuid; return;
      end if;
    end if;
    insert into public.hive_cells (user_id, map_id, q, r)
      values (target, my_map, th_q, th_r);

  -- ── Both of us are already on the same petek ──
  elsif my_map = th_map then
    if not exists (
      select 1 from generate_series(0, 5) g(d)
      where my_q = th_q + (public.hive_dir(g.d))[1]
        and my_r = th_r + (public.hive_dir(g.d))[2]
    ) then
      return query select 'too_far'::text, null::uuid; return;
    end if;

  -- ── Two peteks meet ──
  -- The smaller one is carried over to the larger one's frame whole:
  -- rotated by a multiple of 60° and shifted, never rearranged. The
  -- offered side is tried first, then the owner's other free sides.
  else
    select count(*) into my_n from public.hive_cells c where c.map_id = my_map;
    select count(*) into th_n from public.hive_cells c where c.map_id = th_map;

    dirs := array[p_dir];
    for d in 0..5 loop
      if d <> p_dir then dirs := dirs || d; end if;
    end loop;

    <<search>>
    foreach d in array dirs loop
      v := public.hive_dir(d);
      if th_n >= my_n then
        -- Their petek stays; mine travels, and I land on the side of
        -- them the seat was opened on.
        keeper := th_map; mover := my_map;
        anch_q := my_q;   anch_r := my_r;
        need_q := th_q + v[1]; need_r := th_r + v[2];
      else
        keeper := my_map; mover := th_map;
        anch_q := th_q;   anch_r := th_r;
        need_q := my_q - v[1]; need_r := my_r - v[2];
      end if;

      for k in 0..5 loop
        if not exists (
          select 1
          from public.hive_cells m
          join public.hive_cells s
            on s.map_id = keeper
           and s.q = (public.hive_rot(m.q - anch_q, m.r - anch_r, k))[1] + need_q
           and s.r = (public.hive_rot(m.q - anch_q, m.r - anch_r, k))[2] + need_r
          where m.map_id = mover
        ) then
          update public.hive_cells m
             set map_id = keeper,
                 q = (public.hive_rot(m.q - anch_q, m.r - anch_r, k))[1] + need_q,
                 r = (public.hive_rot(m.q - anch_q, m.r - anch_r, k))[2] + need_r
           where m.map_id = mover;
          update public.hive_bonds bo set map_id = keeper where bo.map_id = mover;
          my_map := keeper;
          fitted := true;
          exit search;
        end if;
      end loop;
    end loop;

    if not fitted then
      return query select 'no_room'::text, null::uuid; return;
    end if;
  end if;

  insert into public.hive_bonds (a, b, map_id, locked_until)
  values (least(uid, target), greatest(uid, target), my_map, public.hive_week_start() + 7);

  -- Spent: the seat was for one person, and they have taken it.
  update public.hive_slot_offers o
     set claimed_by = uid, claimed_at = now()
   where o.code = offer.code;

  return query select 'ok'::text, target;
end;
$$;

-- v4's attach went with the weekly per-member code it was built on.
drop function if exists public.hive_bond_code(text, smallint);

revoke all on function public.hive_offer_slot(smallint) from public;
revoke all on function public.hive_claim_slot(text) from public;
grant execute on function public.hive_offer_slot(smallint) to authenticated;
grant execute on function public.hive_claim_slot(text) to authenticated;
