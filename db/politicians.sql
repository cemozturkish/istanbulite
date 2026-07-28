-- =====================================================================
-- Politicians roster + seat assignment, shown on Anahane's top-right
-- "politician card" (mirrors the top-left profile/identity card): the
-- İstanbul Büyükşehir Belediye Başkanı by default, or the clicked
-- district's Belediye Başkanı once a neighborhood is selected on the map.
-- Clicking the card opens a bottom sheet with the assigned person's full
-- info (see anahane.html's buildPoliticianDetailHtml).
--
-- Two tables, split so a person's data lives in one place and can be
-- reassigned between seats (or swapped out) without re-entering anything:
--
--   public.politicians     — the people roster (name, avatar, bio, party,
--                             birth info). Freeform: admin adds/edits/
--                             deletes people from admin.html's Kişiler tab,
--                             independent of any seat.
--   public.political_seats — the 26 fixed "seats" (İstanbul Büyükşehir +
--                             25 ilçe). `id` doubles as the neighborhood
--                             slug for the 25 ilçe seats (so it lines up
--                             with map clicks with no extra lookup) and is
--                             the literal 'istanbul' for the one citywide
--                             seat, where `neighborhood` is null.
--                             `politician_id` points at whoever currently
--                             holds the seat (null = vacant) — admin
--                             reassigns from the Koltuklar tab by picking
--                             a different person and saving, no history
--                             kept of who held it before.
--
-- Nothing about who holds which seat is hardcoded in client code, since
-- officeholders can and do change.
--
-- Run in Supabase SQL editor. Idempotent — also migrates an earlier
-- single-table version of this file (where public.politicians itself held
-- seat-shaped rows with first_name/last_name/title/avatar_* columns).
-- =====================================================================

-- Migrate the earlier single-table shape: if `politicians` still looks
-- like the old seat table (has first_name) and the new seat table doesn't
-- exist yet, rename it out of the way first so `politicians` is free for
-- its new meaning (the people roster).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'politicians')
     and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'politicians' and column_name = 'first_name')
     and not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'political_seats') then
    alter table public.politicians rename to political_seats;
  end if;
end $$;

create table if not exists public.political_seats (
  id           text        primary key,
  neighborhood text        references public.neighborhoods(id) on delete set null,
  title        text        not null default '',
  updated_at   timestamptz not null default now(),
  constraint political_seats_seat_matches_neighborhood
    check ((id = 'istanbul' and neighborhood is null) or (neighborhood = id))
);

create table if not exists public.politicians (
  id           uuid        primary key default gen_random_uuid(),
  first_name   text        not null,
  last_name    text        not null,
  avatar_hair      text,
  avatar_hat       text,
  avatar_accessory text,
  avatar_shirt     text,
  bio          text,
  party        text,
  birth_date   date,
  birth_place  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.political_seats add column if not exists politician_id uuid references public.politicians(id) on delete set null;

-- Backfill: if political_seats still carries the old per-seat person
-- columns (renamed from politicians above), move each filled seat's
-- person data into a new politicians row and link it, then drop the
-- now-redundant columns.
do $$
declare
  r record;
  new_id uuid;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'political_seats' and column_name = 'first_name') then
    for r in select * from public.political_seats where politician_id is null and coalesce(first_name, '') <> '' loop
      insert into public.politicians (first_name, last_name, avatar_hair, avatar_hat, avatar_accessory, avatar_shirt)
      values (r.first_name, r.last_name, r.avatar_hair, r.avatar_hat, r.avatar_accessory, r.avatar_shirt)
      returning id into new_id;
      update public.political_seats set politician_id = new_id where id = r.id;
    end loop;
  end if;
end $$;

alter table public.political_seats drop column if exists first_name;
alter table public.political_seats drop column if exists last_name;
alter table public.political_seats drop column if exists avatar_hair;
alter table public.political_seats drop column if exists avatar_hat;
alter table public.political_seats drop column if exists avatar_accessory;
alter table public.political_seats drop column if exists avatar_shirt;
alter table public.political_seats drop column if exists photo_url;

alter table public.political_seats enable row level security;

drop policy if exists "political_seats read for authenticated" on public.political_seats;
create policy "political_seats read for authenticated"
  on public.political_seats for select
  to authenticated
  using (true);

drop policy if exists "political_seats insert admin" on public.political_seats;
create policy "political_seats insert admin"
  on public.political_seats for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "political_seats update admin" on public.political_seats;
create policy "political_seats update admin"
  on public.political_seats for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

drop policy if exists "political_seats delete admin" on public.political_seats;
create policy "political_seats delete admin"
  on public.political_seats for delete
  to authenticated
  using (public.is_admin());

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

-- Auto-bump updated_at on edits (one function per table, matching the
-- rest of this codebase's convention -- see db/quotes.sql).
create or replace function public.set_political_seats_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_politicians_updated_at on public.political_seats;
drop trigger if exists set_political_seats_updated_at on public.political_seats;
create trigger set_political_seats_updated_at
  before update on public.political_seats
  for each row execute function public.set_political_seats_updated_at();

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
