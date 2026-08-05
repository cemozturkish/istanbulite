-- =====================================================================
-- coffee_prices — the Kahve Endeksi (coffee price index): user-reported
-- price of a cup of coffee at a venue, per district. The local-economy
-- layer of Kahvehane per the Vision section of CLAUDE.md ("nearest
-- cheapest coffee").
--
-- One row per (district, venue, reporter). A user re-reporting the same
-- venue updates their existing row (enforced by the unique index below;
-- the client does find-then-update). Residency gate mirrors
-- neighborhood_comments: you may only report prices for your own
-- district (admin override).
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.coffee_prices (
  id           uuid        primary key default gen_random_uuid(),
  neighborhood text        not null references public.neighborhoods(id),
  venue        text        not null,
  price        numeric(6,2) not null,
  reported_by  uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Accounts can only exist inside Istanbul; so can coffee reports.
  constraint coffee_prices_neighborhood_not_disi
    check (neighborhood <> 'istanbul_disi'),
  constraint coffee_prices_venue_len
    check (char_length(btrim(venue)) between 1 and 80),
  constraint coffee_prices_price_range
    check (price > 0 and price <= 5000)
);

-- One report per venue per reporter per district (case-insensitive venue).
create unique index if not exists coffee_prices_unique_report_idx
  on public.coffee_prices (neighborhood, reported_by, lower(btrim(venue)));

create index if not exists coffee_prices_neighborhood_idx
  on public.coffee_prices (neighborhood);

alter table public.coffee_prices enable row level security;

drop policy if exists "coffee_prices read for authenticated" on public.coffee_prices;
create policy "coffee_prices read for authenticated"
  on public.coffee_prices for select
  to authenticated
  using (true);

-- Report only as yourself, and only for your own district (admin: any).
drop policy if exists "coffee_prices insert own district" on public.coffee_prices;
create policy "coffee_prices insert own district"
  on public.coffee_prices for insert
  to authenticated
  with check (
    reported_by = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.neighborhood = coffee_prices.neighborhood
      )
    )
  );

-- Refresh your own report's price; admin may fix any. The with check
-- re-applies the residency gate so a row can't be moved to another
-- district by its (non-admin) owner.
drop policy if exists "coffee_prices update own or admin" on public.coffee_prices;
create policy "coffee_prices update own or admin"
  on public.coffee_prices for update
  to authenticated
  using (reported_by = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      reported_by = auth.uid()
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and p.neighborhood = coffee_prices.neighborhood
      )
    )
  );

drop policy if exists "coffee_prices delete own or admin" on public.coffee_prices;
create policy "coffee_prices delete own or admin"
  on public.coffee_prices for delete
  to authenticated
  using (reported_by = auth.uid() or public.is_admin());

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
