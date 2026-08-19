-- =====================================================================
-- The hane honeycomb — six slots around you, filled by a weekly code.
--
-- Opening your profile on Anahane opens the honeycomb: your own frame in
-- the middle, six slots packed around it (see hiveHTML in
-- profile-card.js). This is what fills them.
--
-- The exchange is deliberately hand-to-hand. There is no member search,
-- no follow button and no request-and-accept: to put someone in your
-- honeycomb you have to be told their code, and the code is only good
-- for the week it was issued in. That keeps the honeycomb a record of
-- people you actually saw — which is the whole point of an app whose job
-- is to push attention outside — and it keeps it from silently accruing
-- into a follower list. A placement lasts a week too, so the honeycomb
-- empties itself unless the contact keeps happening.
--
-- Two tables:
--   hive_codes — one code per member per Istanbul week. A member may
--                read ONLY their own; that a code cannot be looked up is
--                exactly why holding one means you were given it.
--   hive_slots — who is in which of your six slots, and until when.
--
-- Claiming therefore cannot be a plain insert (it has to resolve a code
-- the caller is not allowed to read), so it goes through
-- hive_claim_code(), which is SECURITY DEFINER and returns a status
-- string rather than raising — the UI prints its own wording per status
-- (see i18n.js, profile.hive.*).
--
-- SUPERSEDED IN PART by db/hive_slots_v3_mutual_permanent.sql: the
-- seven-day placement described below is gone (expires_at is dropped),
-- placing is mutual and mirrored, and removal clears both sides. The
-- code half — weekly, unreadable to anyone but its owner — is unchanged.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ── Monday of the current Istanbul week ──
-- The site's week starts Monday everywhere it matters (the profile's
-- weekly game grid, the scoreboards), and the date is resolved
-- server-side for the same reason the Sözcel word is: a device's own
-- idea of the date must never decide which week's code is live.
-- date_trunc('week', …) is Monday-based in Postgres.
create or replace function public.hive_week_start()
returns date
language sql
stable
as $$
  select date_trunc('week', (now() at time zone 'Europe/Istanbul'))::date;
$$;

-- ── Codes ──
create table if not exists public.hive_codes (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  week_start date        not null,
  code       text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start),
  -- Unambiguous alphabet only (no I/O/0/1) — these get read aloud and
  -- typed off a screen someone is holding up.
  constraint hive_codes_format check (code ~ '^[A-HJ-NP-Z2-9]{6}$')
);

-- A code identifies exactly one member within its own week. It is free
-- to come round again in a later week; only the live week is ever
-- resolved (see hive_claim_code).
create unique index if not exists hive_codes_week_code_idx
  on public.hive_codes (week_start, code);

alter table public.hive_codes enable row level security;

-- Your own code, and nothing else. There is deliberately no policy that
-- lets one member read another's: the security model here IS that a code
-- can only reach you by being handed over.
drop policy if exists "hive_codes read own" on public.hive_codes;
create policy "hive_codes read own"
  on public.hive_codes for select
  to authenticated
  using (user_id = auth.uid());

-- No client writes at all. Issuing is hive_my_code()'s job (SECURITY
-- DEFINER below) — a member must not be able to choose their own code,
-- or codes could be squatted to impersonate someone else's.

-- ── Slots ──
create table if not exists public.hive_slots (
  owner_id   uuid        not null references public.profiles(id) on delete cascade,
  slot       smallint    not null,
  member_id  uuid        not null references public.profiles(id) on delete cascade,
  placed_at  timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (owner_id, slot),
  constraint hive_slots_slot_range check (slot between 0 and 5),
  constraint hive_slots_not_self   check (member_id <> owner_id)
);

-- The same member can't hold two of your six slots. Expired rows are
-- swept by hive_claim_code before it inserts, so this never blocks
-- putting someone back after their week has run out.
create unique index if not exists hive_slots_owner_member_idx
  on public.hive_slots (owner_id, member_id);

alter table public.hive_slots enable row level security;

-- Your honeycomb is yours to read. Nobody else's profile surfaces a
-- honeycomb yet, and being able to enumerate who someone keeps close is
-- not something to hand out before that is designed.
drop policy if exists "hive_slots read own" on public.hive_slots;
create policy "hive_slots read own"
  on public.hive_slots for select
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- Emptying a slot early is a plain delete — no code, no ceremony.
drop policy if exists "hive_slots delete own" on public.hive_slots;
create policy "hive_slots delete own"
  on public.hive_slots for delete
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- INSERT/UPDATE stay closed to clients: filling a slot means resolving
-- somebody else's code, which only hive_claim_code can do.

-- ── This week's code for the caller, issued on first ask ──
create or replace function public.hive_my_code()
returns table (code text, week_start date)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wk       date := public.hive_week_start();
  uid      uuid := auth.uid();
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i        int;
  attempt  int;
begin
  if uid is null then
    raise exception 'hive_my_code: authentication required' using errcode = '42501';
  end if;

  -- Already issued this week.
  return query
    select c.code, c.week_start from public.hive_codes c
    where c.user_id = uid and c.week_start = wk;
  if found then
    return;
  end if;

  -- 32^6 ≈ 1.07e9 codes against at most one row per member per week, so
  -- a collision is a curiosity rather than a case to design around — but
  -- it is one unique index away from being an error someone sees, so
  -- retry a few times before giving up.
  for attempt in 1 .. 12 loop
    candidate := '';
    for i in 1 .. 6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    begin
      insert into public.hive_codes (user_id, week_start, code)
      values (uid, wk, candidate);
      exit;
    exception
      when unique_violation then
        -- Either the code was taken this week (retry with another) or
        -- this member got a code from a concurrent call (done).
        if exists (select 1 from public.hive_codes c
                   where c.user_id = uid and c.week_start = wk) then
          exit;
        end if;
    end;
  end loop;

  return query
    select c.code, c.week_start from public.hive_codes c
    where c.user_id = uid and c.week_start = wk;
end;
$$;

-- ── Put whoever owns `p_code` into slot `p_slot`, for a week ──
-- Returns a status the UI words for itself:
--   ok              — placed; member_id/expires_at are set
--   invalid_code    — no member holds that code this week
--   self            — that's your own code
--   slot_taken      — that slot already holds someone (empty it first)
--   already_in_hive — that member is already in another of your slots
create or replace function public.hive_claim_code(p_code text, p_slot smallint)
returns table (status text, member_id uuid, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  wk     date := public.hive_week_start();
  uid    uuid := auth.uid();
  target uuid;
  until  timestamptz := now() + interval '7 days';
begin
  if uid is null then
    raise exception 'hive_claim_code: authentication required' using errcode = '42501';
  end if;
  if p_slot is null or p_slot < 0 or p_slot > 5 then
    raise exception 'hive_claim_code: slot out of range' using errcode = '22003';
  end if;

  -- A week that has run out is a week that has run out: only the live
  -- week's codes resolve, which is what makes them regenerate.
  select c.user_id into target
  from public.hive_codes c
  where c.week_start = wk
    and c.code = upper(btrim(coalesce(p_code, '')));

  if target is null then
    return query select 'invalid_code'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if target = uid then
    return query select 'self'::text, null::uuid, null::timestamptz;
    return;
  end if;

  -- Sweep this caller's finished placements first, so an expired row
  -- neither holds a slot nor trips the one-member-one-slot index below.
  delete from public.hive_slots s
  where s.owner_id = uid and s.expires_at <= now();

  if exists (select 1 from public.hive_slots s
             where s.owner_id = uid and s.slot = p_slot) then
    return query select 'slot_taken'::text, null::uuid, null::timestamptz;
    return;
  end if;
  if exists (select 1 from public.hive_slots s
             where s.owner_id = uid and s.member_id = target) then
    return query select 'already_in_hive'::text, null::uuid, null::timestamptz;
    return;
  end if;

  insert into public.hive_slots (owner_id, slot, member_id, expires_at)
  values (uid, p_slot, target, until);

  return query select 'ok'::text, target, until;
end;
$$;

-- ── The caller's live honeycomb, with each occupant's public identity ──
-- One call rather than slots-then-profiles, and expiry is settled by the
-- database instead of by whatever the device thinks the time is. SECURITY
-- INVOKER on purpose: it reads only what the caller may already read (own
-- hive_slots rows, and profiles, which every member can read).
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
  expires_at        timestamptz
)
language sql
stable
as $$
  select s.slot, s.member_id,
         p.first_name, p.last_name, p.neighborhood,
         p.avatar_url, p.avatar_hair, p.avatar_hat, p.avatar_accessory,
         p.avatar_shirt, p.cover_badges,
         s.expires_at
  from public.hive_slots s
  join public.profiles p on p.id = s.member_id
  where s.owner_id = auth.uid()
    and s.expires_at > now()
  order by s.slot;
$$;

revoke all on function public.hive_week_start() from public;
revoke all on function public.hive_my_code() from public;
revoke all on function public.hive_claim_code(text, smallint) from public;
revoke all on function public.hive_my_slots() from public;
grant execute on function public.hive_week_start() to authenticated;
grant execute on function public.hive_my_code() to authenticated;
grant execute on function public.hive_claim_code(text, smallint) to authenticated;
grant execute on function public.hive_my_slots() to authenticated;
