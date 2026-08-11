-- =====================================================================
-- coffee_prices v2 — the Kahve Endeksi becomes admin-curated.
--
-- Originally residents reported the price of a cup of coffee in their
-- own district (see coffee_prices.sql). The index is now maintained
-- exclusively from the admin portal: the site shows it read-only and
-- every add/edit/delete happens in admin.html's "Kahve" tab.
--
-- Only the write policies change here — the table, its constraints and
-- the "read for authenticated" policy stay exactly as they were, so
-- existing rows (and their original reporters) are preserved.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- Residents can no longer write to the index.
drop policy if exists "coffee_prices insert own district" on public.coffee_prices;
drop policy if exists "coffee_prices update own or admin" on public.coffee_prices;
drop policy if exists "coffee_prices delete own or admin" on public.coffee_prices;

-- Admin-only writes. reported_by still points at a real profile (the
-- admin's own, set by the admin panel) so the FK and the unique index
-- below keep working unchanged; with a single writer that index now
-- effectively means "one row per venue per district", which is what the
-- curated index wants anyway.
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
