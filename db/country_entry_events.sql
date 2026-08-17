-- =====================================================================
-- Kütüphane — Ülke girdilerinin zaman akışı (country entry events).
--
-- The chain a country entry can carry: a "key timeline" of dated
-- moments hanging off one entry, the way a breaking_news story grows a
-- chain of breaking_news_updates as it develops -- and printed the same
-- way one is, **newest first**. A country page is a news page here, not
-- a history chapter: the reader opens Ukrayna to see where the thing
-- stands, and what it stands at belongs at the top.
--
-- The one difference from a news chain is the stamp. A moment is dated,
-- not aged: these chains reach back to 1917, and "109 yıl önce" tells a
-- reader nothing. Hence `event_date` is a plain date and is NOT NULL,
-- where a country entry's own `entry_date` is optional -- an entry may
-- be undated prose, but a moment on a timeline is nothing without its
-- date.
--
-- Deliberately not folded into country_entries.body as hand-typed
-- lines: the admin has to be able to insert a moment into the middle of
-- a timeline years later without retyping the rest, and the reader gets
-- the ticked track rather than a paragraph that happens to have dates
-- in it.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.country_entry_events (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.country_entries(id) on delete cascade,
  event_date date not null,
  title text not null,
  -- Optional: most moments are one line. The body is for the ones that
  -- need a sentence of context under the headline.
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The one query the reader makes: one entry's moments, newest first.
create index if not exists country_entry_events_entry_idx
  on public.country_entry_events (entry_id, event_date desc, created_at desc);

create or replace function public.country_entry_events_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists country_entry_events_set_updated_at on public.country_entry_events;
create trigger country_entry_events_set_updated_at
  before update on public.country_entry_events
  for each row execute function public.country_entry_events_set_updated_at();

alter table public.country_entry_events enable row level security;

-- Same rule as the entries they hang off: everyone signed in reads,
-- only the admin writes. A country page is curated, not a forum.
drop policy if exists "country_entry_events read for authenticated" on public.country_entry_events;
create policy "country_entry_events read for authenticated"
  on public.country_entry_events for select to authenticated using (true);

drop policy if exists "country_entry_events insert admin" on public.country_entry_events;
create policy "country_entry_events insert admin"
  on public.country_entry_events for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_entry_events update admin" on public.country_entry_events;
create policy "country_entry_events update admin"
  on public.country_entry_events for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "country_entry_events delete admin" on public.country_entry_events;
create policy "country_entry_events delete admin"
  on public.country_entry_events for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
