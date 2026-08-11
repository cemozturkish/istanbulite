-- =====================================================================
-- coffee_prices v2 — the Kahve Endeksi, admin-curated.
--
-- Self-contained: creates the table if it isn't there yet (same shape as
-- coffee_prices.sql, so running that first is optional), then puts the
-- write policies where they belong now — the index is maintained
-- exclusively from the admin portal. The site shows it read-only and
-- every add/edit/delete happens in admin.html's "Kahve" tab.
--
-- If the table already exists this only swaps the policies: the table,
-- its constraints and existing rows are left exactly as they are.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.coffee_prices (
  id           uuid        primary key default gen_random_uuid(),
  neighborhood text        not null references public.neighborhoods(id),
  venue        text        not null,
  price        numeric(6,2) not null,
  -- The admin's own profile, set by the admin panel on insert. Kept as a
  -- real FK so the unique index below stays meaningful; with a single
  -- writer it reads as "one entry per venue per district".
  reported_by  uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Accounts can only exist inside Istanbul; so can coffee prices.
  constraint coffee_prices_neighborhood_not_disi
    check (neighborhood <> 'istanbul_disi'),
  constraint coffee_prices_venue_len
    check (char_length(btrim(venue)) between 1 and 80),
  constraint coffee_prices_price_range
    check (price > 0 and price <= 5000)
);

create unique index if not exists coffee_prices_unique_report_idx
  on public.coffee_prices (neighborhood, reported_by, lower(btrim(venue)));

create index if not exists coffee_prices_neighborhood_idx
  on public.coffee_prices (neighborhood);

alter table public.coffee_prices enable row level security;

-- Every member reads the index (unchanged from v1).
drop policy if exists "coffee_prices read for authenticated" on public.coffee_prices;
create policy "coffee_prices read for authenticated"
  on public.coffee_prices for select
  to authenticated
  using (true);

-- Residents can no longer write to the index (v1 policies, if present).
drop policy if exists "coffee_prices insert own district" on public.coffee_prices;
drop policy if exists "coffee_prices update own or admin" on public.coffee_prices;
drop policy if exists "coffee_prices delete own or admin" on public.coffee_prices;

-- Admin-only writes.
drop policy if exists "coffee_prices insert admin only" on public.coffee_prices;
create policy "coffee_prices insert admin only"
  on public.coffee_prices for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "coffee_prices update admin only" on public.coffee_prices;
create policy "coffee_prices update admin only"
  on public.coffee_prices for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coffee_prices delete admin only" on public.coffee_prices;
create policy "coffee_prices delete admin only"
  on public.coffee_prices for delete
  to authenticated
  using (public.is_admin());

-- Auto-bump updated_at on edits (same idiom as events.sql).
create or replace function public.set_coffee_prices_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_coffee_prices_updated_at on public.coffee_prices;
create trigger set_coffee_prices_updated_at
  before update on public.coffee_prices
  for each row execute function public.set_coffee_prices_updated_at();
