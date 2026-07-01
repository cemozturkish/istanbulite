-- =====================================================================
-- event_rsvps — tracks which users have RSVP'd to an event in the
-- Anahane right-column events panel. One row per (event, user); the
-- attendee count shown in the UI is just count(*) grouped by event_id.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.event_rsvps (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists event_rsvps_event_id_idx
  on public.event_rsvps (event_id);

alter table public.event_rsvps enable row level security;

-- Authenticated users may read all rows (needed to render attendee counts).
drop policy if exists "event_rsvps read for authenticated" on public.event_rsvps;
create policy "event_rsvps read for authenticated"
  on public.event_rsvps for select
  to authenticated
  using (true);

-- A user may RSVP only as themselves.
drop policy if exists "event_rsvps insert own" on public.event_rsvps;
create policy "event_rsvps insert own"
  on public.event_rsvps for insert
  to authenticated
  with check (user_id = auth.uid());

-- A user may cancel their own RSVP; admin may remove any.
drop policy if exists "event_rsvps delete own or admin" on public.event_rsvps;
create policy "event_rsvps delete own or admin"
  on public.event_rsvps for delete
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
