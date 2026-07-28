-- =====================================================================
-- tbmm_seats — the 600 seats of the Turkish Grand National Assembly
-- (TBMM), shown as an interactive hemicycle chart on Kütüphane's TBMM
-- page (see tbmm.js for the shared seat-geometry + SVG rendering, used
-- by both admin.html's TBMM tab and kutuphane.html's public page).
--
-- `seat_number` is a purely geometric index (1..600, see
-- IstTBMM.seatPositions() in tbmm.js) — it has no political meaning of
-- its own, it's just "which dot in the chart this row controls".
-- `politician_id` points at the public.politicians roster (the same
-- people table used for mayors — see db/politicians.sql), so an MP and a
-- mayor can be the same person without duplicating their data.
-- `party`/`color` describe the seat directly (independent of whichever
-- specific person, if any, currently holds it) so the admin can lay out
-- the chart's party-block coloring before naming every individual member,
-- same as public.political_seats' `title` is independent of its
-- politician_id.
--
-- Not pre-seeded with 600 empty rows — a seat only gets a row once the
-- admin sets something on it (color/party/person); an unconfigured seat
-- just renders in the chart's neutral empty color.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.tbmm_seats (
  seat_number   int         primary key check (seat_number between 1 and 600),
  politician_id uuid        references public.politicians(id) on delete set null,
  party         text,
  color         text,
  updated_at    timestamptz not null default now()
);

alter table public.tbmm_seats enable row level security;

drop policy if exists "tbmm_seats read for authenticated" on public.tbmm_seats;
create policy "tbmm_seats read for authenticated"
  on public.tbmm_seats for select
  to authenticated
  using (true);

drop policy if exists "tbmm_seats insert admin" on public.tbmm_seats;
create policy "tbmm_seats insert admin"
  on public.tbmm_seats for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "tbmm_seats update admin" on public.tbmm_seats;
create policy "tbmm_seats update admin"
  on public.tbmm_seats for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tbmm_seats delete admin" on public.tbmm_seats;
create policy "tbmm_seats delete admin"
  on public.tbmm_seats for delete
  to authenticated
  using (public.is_admin());

create or replace function public.set_tbmm_seats_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_tbmm_seats_updated_at on public.tbmm_seats;
create trigger set_tbmm_seats_updated_at
  before update on public.tbmm_seats
  for each row execute function public.set_tbmm_seats_updated_at();
