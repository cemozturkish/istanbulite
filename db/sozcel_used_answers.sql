-- =====================================================================
-- sozcel_used_answers — records which Sözcel answer word was used on
-- which Istanbul-local calendar day. Once a word appears here it is
-- excluded from future picks, so the daily answer never repeats unless
-- the admin clears entries from this table.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.sozcel_used_answers (
  used_on date primary key,
  word text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists sozcel_used_answers_word_uidx
  on public.sozcel_used_answers (word);

alter table public.sozcel_used_answers enable row level security;

-- Authenticated users may read all rows (needed so each client can
-- compute the same daily target and exclude already-used words).
drop policy if exists "sozcel_used_answers read for authenticated"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers read for authenticated"
  on public.sozcel_used_answers for select
  to authenticated
  using (true);

-- Any authenticated user may insert today's pick. The primary key on
-- used_on prevents double-recording, and the unique index on word
-- prevents the same word from being recorded twice. Clients pick
-- deterministically from the unused remainder, so concurrent inserts
-- on the same day will agree on the same word.
drop policy if exists "sozcel_used_answers insert authenticated"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers insert authenticated"
  on public.sozcel_used_answers for insert
  to authenticated
  with check (true);

-- Only admin can clear entries (e.g. to start the cycle over).
drop policy if exists "sozcel_used_answers delete admin"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers delete admin"
  on public.sozcel_used_answers for delete
  to authenticated
  using (public.is_admin());
