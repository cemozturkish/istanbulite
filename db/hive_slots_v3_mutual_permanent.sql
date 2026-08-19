-- =====================================================================
-- hive_slots v3 — the honeycomb becomes mutual, and permanent.
--
-- Two changes to how a slot works, both of them changes to what the
-- honeycomb *means*:
--
--   1. A placement no longer runs out. v1 gave every placement seven
--      days so the honeycomb would empty itself unless the contact kept
--      happening — a record of who you are seeing, not who you have
--      ever met. Placements are now permanent: whoever you put in
--      stands there until one of you takes the other out.
--
--   2. Placing is mutual, and mirrored. Resolving someone's code puts
--      them in your honeycomb AND puts you in theirs — in the slot
--      opposite the one you used, so the two combs read as one shape
--      seen from either side: your top-right is their bottom-left.
--      Slots are numbered 0-5 as two / two / two down the rows either
--      side of the middle cell (see HIVE_ROWS in profile-card.js), so
--      the mirror of a slot is 5 - slot.
--
-- The exchange itself is untouched: the code is still weekly, still
-- unreadable to anyone but its owner, and still the only way in. You
-- still have to have been handed it, which still means you saw them.
-- What changes is that being handed a code is now an introduction in
-- both directions rather than a note one person takes about the other.
--
-- Because a claim now writes a row into somebody *else's* honeycomb,
-- and a removal deletes one out of it, both go through SECURITY DEFINER
-- functions — there is still no client INSERT/UPDATE policy on
-- hive_slots, and the DELETE policy stays own-rows-only.
--
-- Existing rows are left as they are: they lose their expiry (the
-- column is dropped) and so become permanent, but a one-sided placement
-- made under v1 is not mirrored retroactively. Removing it from either
-- side still clears both.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ── Placements no longer expire ──
alter table public.hive_slots drop column if exists expires_at;

-- ── The caller's honeycomb (expiry gone from the shape) ──
-- Return type changes, so the old function has to go first — create or
-- replace cannot narrow a function's OUT columns.
drop function if exists public.hive_my_slots();
create or replace function public.hive_my_slots()
returns table (
  slot              smallint,
  member_id         uuid,
  first_name        text,
  last_name         text,
  neighborhood      text,
  avatar_url        text,
  avatar_hair       text,
  avatar_hat        text,
  avatar_accessory  text,
  avatar_shirt      text,
  cover_badges      jsonb,
  placed_at         timestamptz
)
language sql
stable
as $$
  select s.slot, s.member_id,
         p.first_name, p.last_name, p.neighborhood,
         p.avatar_url, p.avatar_hair, p.avatar_hat, p.avatar_accessory,
         p.avatar_shirt, p.cover_badges,
         s.placed_at
  from public.hive_slots s
  join public.profiles p on p.id = s.member_id
  where s.owner_id = auth.uid()
  order by s.slot;
$$;

-- ── Claim: place them with you, and you with them ──
-- Returns a status the UI words for itself:
--   ok               — placed, both sides
--   invalid_code     — no member holds that code this week
--   self             — that's your own code
--   slot_taken       — the slot you tapped already holds someone
--   already_in_hive  — that member is already in one of your slots
--   their_hive_full  — their six are full, so this cannot be mutual
--
-- their_hive_full refuses the whole claim rather than placing one side:
-- a honeycomb that is mutual only when there happened to be room is not
-- mutual, it is a coin toss, and the one-sided row it would leave is
-- exactly the state this version exists to remove.
create or replace function public.hive_claim_code(p_code text, p_slot smallint)
returns table (status text, member_id uuid, mirror_slot smallint)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wk       date := public.hive_week_start();
  uid      uuid := auth.uid();
  target   uuid;
  mirror   smallint;
  free     smallint;
begin
  if uid is null then
    raise exception 'hive_claim_code: authentication required' using errcode = '42501';
  end if;
  if p_slot is null or p_slot < 0 or p_slot > 5 then
    raise exception 'hive_claim_code: slot out of range' using errcode = '22003';
  end if;

  -- Only the live week's codes resolve; that is what makes them renew.
  select c.user_id into target
  from public.hive_codes c
  where c.week_start = wk
    and c.code = upper(btrim(coalesce(p_code, '')));

  if target is null then
    return query select 'invalid_code'::text, null::uuid, null::smallint;
    return;
  end if;
  if target = uid then
    return query select 'self'::text, null::uuid, null::smallint;
    return;
  end if;
  if exists (select 1 from public.hive_slots s
             where s.owner_id = uid and s.slot = p_slot) then
    return query select 'slot_taken'::text, null::uuid, null::smallint;
    return;
  end if;
  if exists (select 1 from public.hive_slots s
             where s.owner_id = uid and s.member_id = target) then
    return query select 'already_in_hive'::text, null::uuid, null::smallint;
    return;
  end if;

  -- Their side. The mirror slot is the point reflection of yours through
  -- the middle cell: 0↔5, 1↔4, 2↔3.
  mirror := 5 - p_slot;

  if exists (select 1 from public.hive_slots s
             where s.owner_id = target and s.member_id = uid) then
    -- A one-sided placement left over from v1: they already hold you.
    -- Leave their side exactly as they arranged it and just complete
    -- yours — moving someone already standing in their honeycomb is not
    -- this function's call to make.
    mirror := null;
  else
    if exists (select 1 from public.hive_slots s
               where s.owner_id = target and s.slot = mirror) then
      -- The mirror is occupied, so the shape can't be honoured. Take the
      -- lowest free slot instead — mutual matters more than mirrored.
      select g.n into free
      from generate_series(0, 5) as g(n)
      where not exists (select 1 from public.hive_slots s
                        where s.owner_id = target and s.slot = g.n)
      order by g.n
      limit 1;

      if free is null then
        return query select 'their_hive_full'::text, null::uuid, null::smallint;
        return;
      end if;
      mirror := free;
    end if;

    insert into public.hive_slots (owner_id, slot, member_id)
    values (target, mirror, uid);
  end if;

  insert into public.hive_slots (owner_id, slot, member_id)
  values (uid, p_slot, target);

  return query select 'ok'::text, target, mirror;
end;
$$;

-- ── Remove: clears both sides ──
-- Placing is mutual, so unplacing has to be too — otherwise one Çıkar
-- leaves precisely the one-sided row this version removes. A member may
-- still delete their own row directly under the DELETE policy; this is
-- the operation the UI uses, because it is the one that keeps the two
-- honeycombs agreeing with each other.
create or replace function public.hive_remove_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'hive_remove_member: authentication required' using errcode = '42501';
  end if;

  delete from public.hive_slots s
  where (s.owner_id = uid and s.member_id = p_member_id)
     or (s.owner_id = p_member_id and s.member_id = uid);
end;
$$;

revoke all on function public.hive_my_slots() from public;
revoke all on function public.hive_claim_code(text, smallint) from public;
revoke all on function public.hive_remove_member(uuid) from public;
grant execute on function public.hive_my_slots() to authenticated;
grant execute on function public.hive_claim_code(text, smallint) to authenticated;
grant execute on function public.hive_remove_member(uuid) to authenticated;
