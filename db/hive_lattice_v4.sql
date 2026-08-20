-- =====================================================================
-- PETEK v4 — one shared lattice, not six slots each.
--
-- WHAT CHANGES, AND WHY
--
-- Until now every member had a honeycomb *of their own*: six numbered
-- slots, and a placement wrote one row into yours and a mirrored row
-- into theirs. Two people who were both in your comb had no relation to
-- each other in it — the shape was a diagram of your contacts, redrawn
-- from scratch for every viewer, and nobody was ever standing anywhere.
--
-- The petek is now a single thing that people attach *to*. A member is
-- one hexagon, permanently, at a real position; attaching to somebody
-- means becoming their neighbour on that shared grid; and a third member
-- who attaches to either of them arrives into the shape those two have
-- already made rather than into a private copy of it. Whoever you can
-- see, you see in the formation everyone else sees them in. That is the
-- whole point: a petek is a thing being built, and it has to be the same
-- object for everyone building it.
--
--   1. Every member is one cell, at axial coordinates (q, r), on a map.
--      A member who has never attached to anyone has no cell at all —
--      they are their own single hexagon with six free sides, and they
--      join the grid the moment they first attach.
--   2. Attaching is mutual (it always was) and is now LOCKED FOR THE
--      WEEK it was made in. You cannot unpick a bond the same week you
--      made it. A petek that can be rearranged the moment it is built is
--      a drawing, not a structure.
--   3. Attaching two members who are already on *different* maps merges
--      those maps — rigidly. Each map keeps its own internal formation
--      exactly; one of them is rotated (a multiple of 60°) and moved as
--      a whole so the two cells land side by side. If no rotation fits
--      without a collision, the attach is refused rather than shuffling
--      anyone. Nobody's existing formation is ever disturbed to make
--      room.
--
-- Three tables, one of them inherited:
--   hive_codes  — unchanged. One code per member per Istanbul week,
--                 readable only by its owner. Still the only way in:
--                 you have to have been handed it, which means you saw
--                 them.
--   hive_cells  — who is standing where, on which map.
--   hive_bonds  — who is attached to whom, and until when it is locked.
--
-- db/hive_slots.sql's `hive_slots` table is superseded by these two. It
-- is left in place, unread, and the DO block at the bottom embeds
-- whatever is in it onto the new grid.
--
-- DIRECTIONS. The six sides of a cell are numbered the way the drawing
-- reads, 0-5 down the rows (this is the same numbering the old slots
-- used, which is why the old mirror rule — 5 - slot — is exactly the
-- negation of the vector here, and why the migration below reproduces
-- most old combs cell for cell):
--
--     0 (0,-1)   1 (+1,-1)
--   2 (-1, 0)  ME  3 (+1, 0)
--     4 (-1,+1)  5 ( 0,+1)
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ── The six sides, as axial vectors ──
create or replace function public.hive_dir(d int)
returns int[]
language sql
immutable
as $$
  select case d
    when 0 then array[ 0, -1]
    when 1 then array[ 1, -1]
    when 2 then array[-1,  0]
    when 3 then array[ 1,  0]
    when 4 then array[-1,  1]
    when 5 then array[ 0,  1]
  end;
$$;

-- ── Rotation about the origin, k × 60° ──
-- The one operation a merge is allowed to perform on a map: it preserves
-- every distance and every angle inside it, so a formation that arrives
-- rotated is the same formation. Written out per k rather than applied k
-- times, because it is called in the inner loop of the merge search.
create or replace function public.hive_rot(q int, r int, k int)
returns int[]
language sql
immutable
as $$
  select case ((k % 6) + 6) % 6
    when 0 then array[ q,      r     ]
    when 1 then array[-r,      q + r ]
    when 2 then array[-q - r,  q     ]
    when 3 then array[-q,     -r     ]
    when 4 then array[ r,     -q - r ]
    when 5 then array[ q + r, -q     ]
  end;
$$;

-- ── Cells: one per member, on one map ──
-- map_id is the connected structure a member belongs to. It is not a row
-- in a table of its own: a map is exactly the set of cells sharing an id,
-- and merging two of them is a plain update of the losing id.
create table if not exists public.hive_cells (
  user_id   uuid        not null primary key references public.profiles(id) on delete cascade,
  map_id    uuid        not null,
  q         int         not null,
  r         int         not null,
  joined_at timestamptz not null default now()
);

-- Two members can never stand in the same place. Deferred, because a
-- merge moves a whole map in one statement and the intermediate rows of
-- that statement are meaningless — the collision check that matters is
-- done in hive_bond_code before the update runs.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'hive_cells_position_uniq'
      and conrelid = 'public.hive_cells'::regclass
  ) then
    alter table public.hive_cells
      add constraint hive_cells_position_uniq unique (map_id, q, r)
      deferrable initially deferred;
  end if;
end $$;

create index if not exists hive_cells_map_idx on public.hive_cells (map_id);

-- ── Bonds: who is attached to whom ──
-- Stored once per pair, smaller uuid first, because an attachment has no
-- direction: there is no owner of a bond and no follower in one.
create table if not exists public.hive_bonds (
  a            uuid        not null references public.profiles(id) on delete cascade,
  b            uuid        not null references public.profiles(id) on delete cascade,
  map_id       uuid        not null,
  bonded_at    timestamptz not null default now(),
  -- The Istanbul week-start from which this bond may be broken. Set to
  -- the week AFTER the one it was made in: locked for the week.
  locked_until date        not null,
  primary key (a, b),
  constraint hive_bonds_ordered check (a < b)
);

create index if not exists hive_bonds_map_idx on public.hive_bonds (map_id);
create index if not exists hive_bonds_b_idx on public.hive_bonds (b);

alter table public.hive_cells enable row level security;
alter table public.hive_bonds enable row level security;

-- No client policies on either table, of any kind. A member reads the
-- petek only through hive_map() below, which hands back the one map they
-- are standing on — the grid is not a directory to be enumerated, and
-- every write here has to resolve a code the caller is not allowed to
-- read (see hive_bond_code).

-- ── What the caller can see: their own map ──
-- Returned relative to the caller, who is always at (0, 0): the client
-- draws itself in the middle and everyone else where they actually are
-- around it. `bonded` marks the members the caller is themselves
-- attached to (their own six sides), `locked` whether that attachment is
-- still inside the week it was made in.
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
  order by c.r, c.q;
$$;

-- ── Attach ──
-- p_dir is the side of the caller's own hexagon they tapped: the member
-- whose code this is ends up standing there, if the grid allows it.
--
-- Statuses, worded by the UI (see profile.hive.err.* in i18n.js):
--   ok             — attached
--   invalid_code   — no member holds that code this week
--   self           — that's your own code
--   already_bonded — you two are already attached
--   dir_taken      — somebody is already standing on that side of you
--   too_far        — you are both on this petek already, but not next to
--                    each other, and moving either of you would break a
--                    formation that is not yours to rearrange
--   no_room        — your two peteks cannot be joined at that side in any
--                    rotation without two members overlapping
create or replace function public.hive_bond_code(p_code text, p_dir smallint)
returns table (status text, member_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid     uuid := auth.uid();
  wk      date := public.hive_week_start();
  target  uuid;
  v       int[];
  my_map  uuid; my_q int; my_r int; my_n int;
  th_map  uuid; th_q int; th_r int; th_n int;
  new_map uuid;
  mover   uuid;   -- map_id being carried over to the other frame
  keeper  uuid;   -- map_id that stays exactly where it is
  anch_q  int; anch_r int;   -- the moving map's anchor cell, in its own frame
  need_q  int; need_r int;   -- where that anchor must land, in the keeper's frame
  d       int;
  k       int;
  dirs    int[];
  fitted  boolean := false;
begin
  if uid is null then
    raise exception 'hive_bond_code: authentication required' using errcode = '42501';
  end if;
  if p_dir is null or p_dir < 0 or p_dir > 5 then
    raise exception 'hive_bond_code: direction out of range' using errcode = '22003';
  end if;

  -- Only the live week's codes resolve; that is what makes them renew.
  select c.user_id into target
  from public.hive_codes c
  where c.week_start = wk
    and c.code = upper(btrim(coalesce(p_code, '')));

  if target is null then
    return query select 'invalid_code'::text, null::uuid; return;
  end if;
  if target = uid then
    return query select 'self'::text, null::uuid; return;
  end if;
  if exists (select 1 from public.hive_bonds b
             where b.a = least(uid, target) and b.b = greatest(uid, target)) then
    return query select 'already_bonded'::text, null::uuid; return;
  end if;

  v := public.hive_dir(p_dir);
  select c.map_id, c.q, c.r into my_map, my_q, my_r
  from public.hive_cells c where c.user_id = uid;
  select c.map_id, c.q, c.r into th_map, th_q, th_r
  from public.hive_cells c where c.user_id = target;

  -- ── Neither of us is on a petek yet: this bond starts one ──
  if my_map is null and th_map is null then
    new_map := gen_random_uuid();
    insert into public.hive_cells (user_id, map_id, q, r) values (uid, new_map, 0, 0);
    insert into public.hive_cells (user_id, map_id, q, r)
      values (target, new_map, v[1], v[2]);
    my_map := new_map;

  -- ── I am standing somewhere; they join beside me ──
  elsif th_map is null then
    if exists (select 1 from public.hive_cells c
               where c.map_id = my_map and c.q = my_q + v[1] and c.r = my_r + v[2]) then
      return query select 'dir_taken'::text, null::uuid; return;
    end if;
    insert into public.hive_cells (user_id, map_id, q, r)
      values (target, my_map, my_q + v[1], my_r + v[2]);

  -- ── They are standing somewhere; I join their petek ──
  -- I take the side of them that puts them on the side of me I tapped;
  -- if somebody is already there, any free side of them will do — what
  -- the tap chose is a preference, and being attached at all matters
  -- more than being attached at that exact angle.
  elsif my_map is null then
    my_map := th_map;
    my_q := th_q - v[1];
    my_r := th_r - v[2];
    if exists (select 1 from public.hive_cells c
               where c.map_id = my_map and c.q = my_q and c.r = my_r) then
      my_q := null;
      for d in 0..5 loop
        if not exists (
          select 1 from public.hive_cells c
          where c.map_id = th_map
            and c.q = th_q + (public.hive_dir(d))[1]
            and c.r = th_r + (public.hive_dir(d))[2]
        ) then
          my_q := th_q + (public.hive_dir(d))[1];
          my_r := th_r + (public.hive_dir(d))[2];
          exit;
        end if;
      end loop;
      if my_q is null then
        return query select 'no_room'::text, null::uuid; return;
      end if;
    end if;
    insert into public.hive_cells (user_id, map_id, q, r)
      values (uid, my_map, my_q, my_r);

  -- ── Both of us are already on the same petek ──
  -- Then we are either already neighbours (and this bond simply records
  -- what the grid already shows) or we are not, and nothing can be done
  -- about it: moving either of us would drag a formation other people
  -- are standing in.
  elsif my_map = th_map then
    if not exists (
      select 1 from generate_series(0, 5) g(d)
      where th_q = my_q + (public.hive_dir(g.d))[1]
        and th_r = my_r + (public.hive_dir(g.d))[2]
    ) then
      return query select 'too_far'::text, null::uuid; return;
    end if;

  -- ── Two peteks meet ──
  -- The smaller one is carried over to the larger one's frame, whole:
  -- rotated by some multiple of 60° and shifted, never rearranged. The
  -- side I tapped is tried first, then my other free sides; the first
  -- rotation that lands no two members on the same cell wins.
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
      if my_n >= th_n then
        -- Their petek comes to mine: they land on the side I tapped.
        keeper := my_map; mover := th_map;
        anch_q := th_q;   anch_r := th_r;
        need_q := my_q + v[1]; need_r := my_r + v[2];
      else
        -- Mine is the smaller one, so mine travels — but the geometry
        -- asked for is the same: I end up on the side of them that puts
        -- them on the side of me I tapped.
        keeper := th_map; mover := my_map;
        anch_q := my_q;   anch_r := my_r;
        need_q := th_q - v[1]; need_r := th_r - v[2];
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

  -- Locked for the week: breakable from the start of the next one.
  insert into public.hive_bonds (a, b, map_id, locked_until)
  values (least(uid, target), greatest(uid, target), my_map, wk + 7);

  return query select 'ok'::text, target;
end;
$$;

-- ── Detach ──
-- Refused while the bond is still inside the week it was made in. A
-- member left holding no bonds at all steps off the grid entirely (their
-- cell is released), so a petek never carries someone who is attached to
-- nothing — they are a single hexagon again, free to attach anywhere.
-- Everyone else keeps their coordinates: a petek does not re-form itself
-- around a departure.
--
--   ok           — detached
--   locked       — made this week; not until the week turns over
--   not_bonded   — you two were not attached
create or replace function public.hive_unbond(p_member_id uuid)
returns table (status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  wk  date := public.hive_week_start();
  bond record;
begin
  if uid is null then
    raise exception 'hive_unbond: authentication required' using errcode = '42501';
  end if;

  select * into bond from public.hive_bonds b
  where b.a = least(uid, p_member_id) and b.b = greatest(uid, p_member_id);

  if not found then
    return query select 'not_bonded'::text; return;
  end if;
  if bond.locked_until > wk then
    return query select 'locked'::text; return;
  end if;

  delete from public.hive_bonds b
  where b.a = bond.a and b.b = bond.b;

  delete from public.hive_cells c
  where c.user_id in (uid, p_member_id)
    and not exists (
      select 1 from public.hive_bonds b
      where b.a = c.user_id or b.b = c.user_id
    );

  return query select 'ok'::text;
end;
$$;

revoke all on function public.hive_map() from public;
revoke all on function public.hive_bond_code(text, smallint) from public;
revoke all on function public.hive_unbond(uuid) from public;
grant execute on function public.hive_map() to authenticated;
grant execute on function public.hive_bond_code(text, smallint) to authenticated;
grant execute on function public.hive_unbond(uuid) to authenticated;

-- =====================================================================
-- Migrating the old six-slot combs onto the grid
--
-- Every mutual pair in hive_slots is an attachment that was really made
-- and should survive. What cannot always survive is the angle: two combs
-- agreed only pairwise, so a set of them need not be embeddable in the
-- plane at all. Each connected group is therefore walked breadth-first
-- and laid down as it goes, keeping each pair's old direction wherever
-- the cell is free and taking any free side otherwise. A bond whose two
-- members both end up placed but not adjacent is dropped — the shape on
-- screen has to be the truth about who is next to whom, and there is no
-- honest way to draw that one.
--
-- Migrated bonds are unlocked from the start (locked_until = this week),
-- since the week they were made in is long past.
-- =====================================================================
do $$
declare
  seed uuid; cur uuid; m uuid;
  rec  record;
  cq int; cr int; nq int; nr int;
  d int; free_found boolean;
begin
  if to_regclass('public.hive_slots') is null then return; end if;
  if exists (select 1 from public.hive_cells) then return; end if;

  create temp table if not exists _hive_walk (user_id uuid) on commit drop;

  for seed in select distinct s.owner_id from public.hive_slots s order by 1 loop
    continue when exists (select 1 from public.hive_cells c where c.user_id = seed);

    m := gen_random_uuid();
    insert into public.hive_cells (user_id, map_id, q, r) values (seed, m, 0, 0);
    delete from _hive_walk;
    insert into _hive_walk values (seed);

    while exists (select 1 from _hive_walk) loop
      select w.user_id into cur from _hive_walk w limit 1;
      delete from _hive_walk w where w.user_id = cur;
      select c.q, c.r into cq, cr from public.hive_cells c where c.user_id = cur;

      -- Both directions of the old table count as one attachment: v1
      -- could leave a one-sided row, and it still records a code that
      -- changed hands.
      for rec in
        select s.member_id as other, min(s.slot) as slot
        from public.hive_slots s where s.owner_id = cur
        group by s.member_id
        union
        select s.owner_id, min(5 - s.slot)
        from public.hive_slots s where s.member_id = cur
          and not exists (select 1 from public.hive_slots o
                          where o.owner_id = cur and o.member_id = s.owner_id)
        group by s.owner_id
      loop
        if not exists (select 1 from public.hive_cells c where c.user_id = rec.other) then
          nq := cq + (public.hive_dir(rec.slot))[1];
          nr := cr + (public.hive_dir(rec.slot))[2];
          if exists (select 1 from public.hive_cells c
                     where c.map_id = m and c.q = nq and c.r = nr) then
            free_found := false;
            for d in 0..5 loop
              nq := cq + (public.hive_dir(d))[1];
              nr := cr + (public.hive_dir(d))[2];
              if not exists (select 1 from public.hive_cells c
                             where c.map_id = m and c.q = nq and c.r = nr) then
                free_found := true; exit;
              end if;
            end loop;
            continue when not free_found;
          end if;
          insert into public.hive_cells (user_id, map_id, q, r) values (rec.other, m, nq, nr);
          insert into _hive_walk values (rec.other);
        end if;

        -- Only record the bond if the two really did end up side by side.
        insert into public.hive_bonds (a, b, map_id, locked_until)
        select least(cur, rec.other), greatest(cur, rec.other), m, public.hive_week_start()
        from public.hive_cells c1, public.hive_cells c2
        where c1.user_id = cur and c2.user_id = rec.other
          and c1.map_id = c2.map_id
          and exists (
            select 1 from generate_series(0, 5) g(d)
            where c2.q = c1.q + (public.hive_dir(g.d))[1]
              and c2.r = c1.r + (public.hive_dir(g.d))[2]
          )
        on conflict do nothing;
      end loop;
    end loop;
  end loop;
end $$;
