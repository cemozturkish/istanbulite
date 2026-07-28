-- =====================================================================
-- politicians — currently-serving mayors shown on Anahane's top-right
-- "politician card" (mirrors the top-left profile/identity card): the
-- İstanbul Büyükşehir Belediye Başkanı by default, or the clicked
-- district's Belediye Başkanı once a neighborhood is selected on the map.
--
-- One row per "seat". `id` doubles as the neighborhood slug for the 25
-- ilçe seats (so it lines up with map clicks with no extra lookup) and is
-- the literal 'istanbul' for the one citywide seat, where `neighborhood`
-- is null. Admin manages rows (name/title/avatar) from admin.html as the
-- office changes hands — nothing here is inferred or hardcoded in client
-- code, since officeholders can and do change.
--
-- Politicians get the same illustrated avatar system as user profiles
-- (see avatar.js: bald base + independent shirt/accessory/hair/hat
-- overlays) rather than a real photo, picked freely by the admin with no
-- unlock rules (those only apply to a real user's own game history).
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.politicians (
  id         text        primary key,
  neighborhood text      references public.neighborhoods(id) on delete set null,
  first_name text        not null,
  last_name  text        not null,
  title      text        not null,
  avatar_hair      text,
  avatar_hat       text,
  avatar_accessory text,
  avatar_shirt     text,
  updated_at timestamptz not null default now(),
  constraint politicians_seat_matches_neighborhood
    check ((id = 'istanbul' and neighborhood is null) or (neighborhood = id))
);

-- Migrate an earlier version of this table (photo_url, no avatar columns).
alter table public.politicians add column if not exists avatar_hair text;
alter table public.politicians add column if not exists avatar_hat text;
alter table public.politicians add column if not exists avatar_accessory text;
alter table public.politicians add column if not exists avatar_shirt text;
alter table public.politicians drop column if exists photo_url;

alter table public.politicians enable row level security;

drop policy if exists "politicians read for authenticated" on public.politicians;
create policy "politicians read for authenticated"
  on public.politicians for select
  to authenticated
  using (true);

drop policy if exists "politicians insert admin" on public.politicians;
create policy "politicians insert admin"
  on public.politicians for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "politicians update admin" on public.politicians;
create policy "politicians update admin"
  on public.politicians for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

drop policy if exists "politicians delete admin" on public.politicians;
create policy "politicians delete admin"
  on public.politicians for delete
  to authenticated
  using (public.is_admin());

-- Auto-bump updated_at on edits
create or replace function public.set_politicians_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_politicians_updated_at on public.politicians;
create trigger set_politicians_updated_at
  before update on public.politicians
  for each row execute function public.set_politicians_updated_at();
