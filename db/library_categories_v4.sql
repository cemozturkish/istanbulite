-- =====================================================================
-- Kütüphane v4 — topic-based categories + sidebar counters.
--
-- Replaces the source-based left nav with editable topic categories
-- ("what we think of others", "what others think of us", "what we think
-- of ourselves") and a separate strip of admin-editable counters that
-- tick from a fixed start date.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ── library_categories: editable topic labels for the left nav ──────
create table if not exists public.library_categories (
  id text primary key,                 -- short slug, used by library_articles.category
  label_tr text not null,              -- display label (Turkish)
  position integer not null default 0, -- lower = higher up in the nav
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.library_categories_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists library_categories_set_updated_at on public.library_categories;
create trigger library_categories_set_updated_at
  before update on public.library_categories
  for each row execute function public.library_categories_set_updated_at();

alter table public.library_categories enable row level security;

drop policy if exists "library_categories read for authenticated" on public.library_categories;
create policy "library_categories read for authenticated"
  on public.library_categories for select to authenticated using (true);

drop policy if exists "library_categories insert admin" on public.library_categories;
create policy "library_categories insert admin"
  on public.library_categories for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_categories update admin" on public.library_categories;
create policy "library_categories update admin"
  on public.library_categories for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_categories delete admin" on public.library_categories;
create policy "library_categories delete admin"
  on public.library_categories for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- Seed the three starter categories. ON CONFLICT keeps any admin renames.
insert into public.library_categories (id, label_tr, position) values
  ('bizden_baskalarina',  'Başkaları Hakkında Düşüncelerimiz', 0),
  ('baskalarindan_bize',  'Başkalarının Bizim Hakkımızdaki Düşünceleri', 1),
  ('bizden_bize',         'Kendimiz Hakkında Düşüncelerimiz', 2)
on conflict (id) do nothing;

-- ── library_articles: add nullable category column ──────────────────
-- The old `source` column stays for byline/attribution purposes; new
-- articles are filed under a category. The source check constraint is
-- relaxed so admin can pick any string (or none) without a migration.
alter table public.library_articles
  add column if not exists category text references public.library_categories(id) on update cascade on delete set null;

alter table public.library_articles
  drop constraint if exists library_articles_source_check;

create index if not exists library_articles_category_position_idx
  on public.library_articles (category, position);

-- ── library_counters: editable sidebar tickers ──────────────────────
create table if not exists public.library_counters (
  id uuid primary key default gen_random_uuid(),
  label_tr text not null,
  start_date date not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.library_counters_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists library_counters_set_updated_at on public.library_counters;
create trigger library_counters_set_updated_at
  before update on public.library_counters
  for each row execute function public.library_counters_set_updated_at();

alter table public.library_counters enable row level security;

drop policy if exists "library_counters read for authenticated" on public.library_counters;
create policy "library_counters read for authenticated"
  on public.library_counters for select to authenticated using (true);

drop policy if exists "library_counters insert admin" on public.library_counters;
create policy "library_counters insert admin"
  on public.library_counters for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_counters update admin" on public.library_counters;
create policy "library_counters update admin"
  on public.library_counters for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_counters delete admin" on public.library_counters;
create policy "library_counters delete admin"
  on public.library_counters for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- Seed the Imamoğlu counter; the other two slots are placeholders the
-- admin will rename / re-date from the Editorial Desk.
insert into public.library_counters (label_tr, start_date, position)
select 'Ekrem İmamoğlu''nun tutuklanalı geçen süre', date '2025-03-19', 0
where not exists (select 1 from public.library_counters);

insert into public.library_counters (label_tr, start_date, position)
select 'Sayaç 2', current_date, 1
where (select count(*) from public.library_counters) < 2;

insert into public.library_counters (label_tr, start_date, position)
select 'Sayaç 3', current_date, 2
where (select count(*) from public.library_counters) < 3;
