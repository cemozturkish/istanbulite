-- =====================================================================
-- events — upcoming events shown in the Anahane right column.
-- Admin posts; visible to all authenticated users.
-- neighborhood is optional (null = city-wide İstanbul event).
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.events (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  description text,
  neighborhood text       references public.neighborhoods(id) on delete set null,
  location    text,
  event_date  timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists events_event_date_idx
  on public.events (event_date asc);

alter table public.events enable row level security;

drop policy if exists "events read for authenticated" on public.events;
create policy "events read for authenticated"
  on public.events for select
  to authenticated
  using (true);

drop policy if exists "events insert admin" on public.events;
create policy "events insert admin"
  on public.events for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "events update admin" on public.events;
create policy "events update admin"
  on public.events for update
  to authenticated
  using  ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "events delete admin" on public.events;
create policy "events delete admin"
  on public.events for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- Auto-bump updated_at on edits
create or replace function public.set_events_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_events_updated_at();
