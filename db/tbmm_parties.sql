-- =====================================================================
-- tbmm_parties — the admin's ordered "recipe" for how public.tbmm_seats'
-- party/color columns get laid out across the 600-seat hemicycle chart
-- (see tbmm.js: seat_number sweeps left to right by angle across every
-- ring, so a contiguous range of seat numbers is a radial wedge).
--
-- Each row is one party: name, color, and how many seats it holds.
-- `display_order` is the left-to-right position (0 = leftmost wedge) --
-- admin.html's TBMM tab lets the admin reorder these directly, and
-- "Kaydet ve Uygula" recomputes cumulative seat ranges from this order
-- and writes the resulting party/color onto every row of tbmm_seats,
-- without touching any seat's politician_id.
--
-- This table doesn't drive the chart directly -- it's only the input to
-- that one recompute step, so reordering/resizing parties never requires
-- hand-editing 600 individual seat rows.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.tbmm_parties (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  color         text        not null,
  seat_count    int         not null default 0 check (seat_count >= 0),
  display_order int         not null default 0,
  updated_at    timestamptz not null default now()
);

create index if not exists tbmm_parties_display_order_idx on public.tbmm_parties (display_order);

alter table public.tbmm_parties enable row level security;

drop policy if exists "tbmm_parties read for authenticated" on public.tbmm_parties;
create policy "tbmm_parties read for authenticated"
  on public.tbmm_parties for select
  to authenticated
  using (true);

drop policy if exists "tbmm_parties insert admin" on public.tbmm_parties;
create policy "tbmm_parties insert admin"
  on public.tbmm_parties for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "tbmm_parties update admin" on public.tbmm_parties;
create policy "tbmm_parties update admin"
  on public.tbmm_parties for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tbmm_parties delete admin" on public.tbmm_parties;
create policy "tbmm_parties delete admin"
  on public.tbmm_parties for delete
  to authenticated
  using (public.is_admin());

create or replace function public.set_tbmm_parties_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_tbmm_parties_updated_at on public.tbmm_parties;
create trigger set_tbmm_parties_updated_at
  before update on public.tbmm_parties
  for each row execute function public.set_tbmm_parties_updated_at();
