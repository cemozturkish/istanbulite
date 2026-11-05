-- =====================================================================
-- site_palette — the admin's own colours, published to every page.
--
-- admin.html's Renkler section lets the admin change any colour on the
-- site, separately in each of the four states the palette can be in
-- (siyah-beyaz / kahverengi × gündüz / gece), on a live copy of the app.
-- What it publishes is ONE row, id = 'live', whose `overrides` is:
--
--   { "v": 1,
--     "states": {
--       "mono-light":  { "tokens": { "--ink": "#111111" },
--                        "rules":  [ { "sel": ".fb-box .k", "prop": "color",
--                                      "val": "#b93631", "page": "project" } ] },
--       "mono-dark":   { … }, "earth-light": { … }, "earth-dark": { … } } }
--
-- palette.js reads it on every page load (with the anon key, so the login
-- gate is in the same colours as the app behind it), caches it in
-- localStorage for the next first paint, and turns it into one <style>
-- element. The stylesheets themselves are never touched: deleting this
-- row puts the site back to exactly the colours written in palette.css,
-- frames.css and the pages.
--
-- Nothing here is private -- it is colours -- so it is readable by
-- everybody, signed in or not, and writable by the admin alone.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.site_palette (
  id          text primary key default 'live',
  overrides   jsonb not null default '{}'::jsonb,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.site_palette enable row level security;

drop policy if exists "site_palette read for everyone" on public.site_palette;
create policy "site_palette read for everyone"
  on public.site_palette for select
  to anon, authenticated
  using (true);

drop policy if exists "site_palette admin manage" on public.site_palette;
create policy "site_palette admin manage"
  on public.site_palette for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select on public.site_palette to anon, authenticated;
grant insert, update, delete on public.site_palette to authenticated;
