-- =====================================================================
-- plan_reports_blocks — a member can REPORT a plan and BLOCK its creator.
--
-- A plan (db/events_v2_plans.sql) is the one thing on the site another
-- member writes and somebody else reads, which makes it user-generated
-- content in App Store terms (Guideline 1.2): there has to be a way to
-- flag it, a way to block the person who wrote it, and somebody who acts
-- on the flags. This is all three.
--
-- BLOCKING IS SYMMETRIC AND IMMEDIATE. Once A blocks B, event_readable()
-- below hides B's plans from A and A's plans from B -- a block that still
-- shows the blocker's whereabouts to the person blocked is not one. It
-- does not touch the petek: a bond is made by two people standing in
-- front of each other and is undone with Çıkar (hive_unbond) like any
-- other; a block is about what reaches your screen.
--
-- A REPORT IS A COPY, NOT A POINTER. The admin cannot read a plan
-- (event_readable has no is_admin() clause, on purpose), and a plan is
-- usually gone by the next midnight. So the report keeps the plan's own
-- words, its place and its creator at the moment it was flagged; event_id
-- is only there so the admin can take the plan down while it still stands
-- (admin_remove_plan, the one write the admin gets on a member's plan).
-- Blocking files a report too (reason 'block'), so the admin hears about
-- every block, which is what the guideline asks for.
--
-- Run in the Supabase SQL editor AFTER db/events_v2_plans.sql.
-- Idempotent.
-- =====================================================================


-- ── Blocks ───────────────────────────────────────────────────────────
create table if not exists public.member_blocks (
  blocker    uuid not null references public.profiles(id) on delete cascade,
  blocked    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

alter table public.member_blocks enable row level security;

-- A member sees, makes and lifts only their own blocks. Nobody can read
-- who has blocked them.
drop policy if exists "member_blocks read own" on public.member_blocks;
create policy "member_blocks read own"
  on public.member_blocks for select
  to authenticated
  using (blocker = auth.uid());

drop policy if exists "member_blocks insert own" on public.member_blocks;
create policy "member_blocks insert own"
  on public.member_blocks for insert
  to authenticated
  with check (blocker = auth.uid());

drop policy if exists "member_blocks delete own" on public.member_blocks;
create policy "member_blocks delete own"
  on public.member_blocks for delete
  to authenticated
  using (blocker = auth.uid());


-- ── Reports ──────────────────────────────────────────────────────────
create table if not exists public.content_reports (
  id            uuid primary key default gen_random_uuid(),
  reporter      uuid not null references public.profiles(id) on delete cascade,
  reported_user uuid references public.profiles(id) on delete set null,
  event_id      uuid references public.events(id) on delete set null,
  reason        text not null default 'report' check (reason in ('report', 'block')),
  title         text,
  location      text,
  event_date    timestamptz,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists content_reports_open_idx
  on public.content_reports (created_at desc) where resolved_at is null;

alter table public.content_reports enable row level security;

-- Nobody reads reports but the admin: a reported member must not learn
-- who flagged them.
drop policy if exists "content_reports admin read" on public.content_reports;
create policy "content_reports admin read"
  on public.content_reports for select
  to authenticated
  using (public.is_admin());

drop policy if exists "content_reports admin update" on public.content_reports;
create policy "content_reports admin update"
  on public.content_reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members file reports only through report_plan() below, which copies the
-- plan server-side, so there is no client insert policy.


-- ── Filing a report (and, optionally, a block) ───────────────────────
-- SECURITY DEFINER so it can copy the plan's own words whatever the
-- client sends. It only accepts a plan the caller can read right now --
-- you cannot report what you were never shown -- and never the caller's own.
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
  end if;
end;
$$;

revoke all on function public.report_plan(uuid, boolean) from public;
grant execute on function public.report_plan(uuid, boolean) to authenticated;


-- ── Who may read a plan, now minus blocks ────────────────────────────
-- Same signature as db/events_v2_plans.sql, so every policy and function
-- that already calls it (events read, the RSVP and interest fences, the
-- petek's guest lists) picks the block up with no change of its own.
-- A city evening is untouched: blocks hide members' plans, not the city.
create or replace function public.event_readable(p_audience text, p_created_by uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_audience is distinct from 'petek'
      or p_created_by = auth.uid()
      or (
        exists (
          select 1 from public.hive_bonds b
          where b.a = least(p_created_by, auth.uid())
            and b.b = greatest(p_created_by, auth.uid())
        )
        and not exists (
          select 1 from public.member_blocks k
          where (k.blocker = auth.uid() and k.blocked = p_created_by)
             or (k.blocker = p_created_by and k.blocked = auth.uid())
        )
      );
$$;

revoke all on function public.event_readable(text, uuid) from public;
grant execute on function public.event_readable(text, uuid) to authenticated;


-- ── The admin takes a reported plan down ─────────────────────────────
-- The admin's own write policies stop at audience = 'city' (see
-- db/events_v2_plans.sql), and should: this is the one exception, and it
-- only reaches a plan somebody has actually reported. It also closes
-- every open report on that plan.
create or replace function public.admin_remove_plan(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'not admin';
  end if;
  if not exists (select 1 from public.content_reports where event_id = p_event_id) then
    raise exception 'not_reported';
  end if;
  update public.content_reports set resolved_at = now()
   where event_id = p_event_id and resolved_at is null;
  delete from public.events where id = p_event_id and audience = 'petek';
end;
$$;

revoke all on function public.admin_remove_plan(uuid) from public;
grant execute on function public.admin_remove_plan(uuid) to authenticated;
