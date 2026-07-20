-- =====================================================================
-- quotes — general-purpose quote bank (Turkish + English body, author).
-- Admin adds/edits/removes quotes from admin.html; where they get shown
-- (games, library, profile pages, etc.) is decided later — this table
-- just holds the data set to draw from.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.quotes (
  id         uuid        primary key default gen_random_uuid(),
  body_tr    text        not null,
  body_en    text        not null,
  author     text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If an earlier version of this migration already ran with a single
-- `body` column, migrate it into `body_tr` and backfill `body_en`.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'quotes' and column_name = 'body')
     and not exists (select 1 from information_schema.columns
                      where table_schema = 'public' and table_name = 'quotes' and column_name = 'body_tr') then
    alter table public.quotes rename column body to body_tr;
  end if;
end $$;

alter table public.quotes add column if not exists body_en text;
update public.quotes set body_en = body_tr where body_en is null;
alter table public.quotes alter column body_en set not null;

alter table public.quotes enable row level security;

drop policy if exists "quotes read for authenticated" on public.quotes;
create policy "quotes read for authenticated"
  on public.quotes for select
  to authenticated
  using (true);

drop policy if exists "quotes insert admin" on public.quotes;
create policy "quotes insert admin"
  on public.quotes for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "quotes update admin" on public.quotes;
create policy "quotes update admin"
  on public.quotes for update
  to authenticated
  using  (public.is_admin())
  with check (public.is_admin());

drop policy if exists "quotes delete admin" on public.quotes;
create policy "quotes delete admin"
  on public.quotes for delete
  to authenticated
  using (public.is_admin());

-- Auto-bump updated_at on edits
create or replace function public.set_quotes_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_quotes_updated_at();
