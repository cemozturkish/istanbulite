-- =====================================================================
-- Kütüphane — Mektuplar (letters).
--
-- Deliberately separate from library_shelves/library_articles: a letter
-- isn't a shelf with a path of chapters, polls, or vocab tooltips -- it's
-- just a title, a date, and a body, shown as one scrollable page. Kept as
-- its own flat table so the admin form (and the reader) can both stay
-- simple instead of routing letters through the shelf/article machinery
-- built for Makaleler (which also requires a non-null `source` column
-- letters have no use for).
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.library_letters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  letter_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.library_letters_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists library_letters_set_updated_at on public.library_letters;
create trigger library_letters_set_updated_at
  before update on public.library_letters
  for each row execute function public.library_letters_set_updated_at();

alter table public.library_letters enable row level security;

drop policy if exists "library_letters read for authenticated" on public.library_letters;
create policy "library_letters read for authenticated"
  on public.library_letters for select to authenticated using (true);

drop policy if exists "library_letters insert admin" on public.library_letters;
create policy "library_letters insert admin"
  on public.library_letters for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_letters update admin" on public.library_letters;
create policy "library_letters update admin"
  on public.library_letters for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_letters delete admin" on public.library_letters;
create policy "library_letters delete admin"
  on public.library_letters for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
