-- =====================================================================
-- sozcel_word_suggestions — the city proposes tonight's word, the admin
-- picks one.
--
-- The İstanbul level prints two editions (see CLAUDE.md, "THE İSTANBUL
-- LEVEL PRINTS TWO EDITIONS"): from sunrise the app ASKS, from sunset it
-- ANSWERS. This is that rule applied to the games — by day Kahvehane's
-- games column collects a word from anyone who wants to offer one, and
-- at sunset the same three boxes are the games themselves, one of them
-- playing whichever word the admin chose.
--
-- Modelled on tumcel_quote_suggestions (db/tumcel_quote_suggestions.sql),
-- which is the same object for Tümcel's quotes, with ONE deliberate
-- difference — see the RLS note below. Run in the Supabase SQL editor;
-- idempotent.
-- =====================================================================

create table if not exists public.sozcel_word_suggestions (
  id           uuid        primary key default gen_random_uuid(),
  -- The night this is FOR, named for the day it began on — the same key
  -- IstDate.editionKey() returns, because a night spans midnight and
  -- both halves of it have to file under one date.
  for_night    date        not null,
  -- Lowercase, the way sozcel_kelime_listesi.txt holds them, so a
  -- suggestion and a pool word are the same string.
  word         text        not null,
  -- Optional: why this word. The admin is choosing between words, and a
  -- line of reasoning is most of what makes one choosable.
  note         text,
  suggested_by uuid        not null references public.profiles(id) on delete cascade,
  suggested_at timestamptz not null default now(),
  status       text        not null default 'pending'
                 check (status in ('pending', 'picked', 'passed')),
  -- ONE suggestion per member per night: this is an offer, not a channel
  -- to fill. Changing your mind is deleting yours and making another.
  unique (for_night, suggested_by),
  -- And two members cannot offer the same word for the same night, so the
  -- admin's list is a list of distinct choices rather than a tally.
  unique (for_night, word)
);

create index if not exists sozcel_word_suggestions_night_idx
  on public.sozcel_word_suggestions (for_night, status);

alter table public.sozcel_word_suggestions enable row level security;

-- ── THE ONE DIFFERENCE FROM tumcel_quote_suggestions ──
-- That table is readable by every authenticated user (`using (true)`).
-- This one MUST NOT BE. A Tümcel quote suggestion is a quote; a Sözcel
-- word suggestion is a candidate ANSWER, and the admin picks tonight's
-- word out of exactly this table. World-readable, the whole candidate
-- pool — and after the pick, the answer itself — is sitting in a table
-- any signed-in member can select from before the game has been played.
-- So a member reads their own row and nobody else's, which is the same
-- stance question_answers and neighborhood_poll_votes take, here for
-- game integrity rather than for privacy.
drop policy if exists "sozcel_word_suggestions read own or admin"
  on public.sozcel_word_suggestions;
create policy "sozcel_word_suggestions read own or admin"
  on public.sozcel_word_suggestions for select
  to authenticated
  using (suggested_by = auth.uid() or public.is_admin());

-- A member offers their own word, and only for a night that has not
-- already begun: `for_night` is the day a night STARTS on, so the last
-- moment to offer is that day's own sunset. Sunset is not something SQL
-- should be computing, so the fence here is the coarser, safer one —
-- not for a night already in the past. The client offers only during the
-- day edition anyway (the box is not there at night).
drop policy if exists "sozcel_word_suggestions insert own"
  on public.sozcel_word_suggestions;
create policy "sozcel_word_suggestions insert own"
  on public.sozcel_word_suggestions for insert
  to authenticated
  with check (
    suggested_by = auth.uid()
    and for_night >= ((now() at time zone 'Europe/Istanbul')::date)
  );

-- Vazgeç: a member withdraws their own offer while it is still pending.
-- A picked one is the night's word and is no longer theirs to take back.
drop policy if exists "sozcel_word_suggestions delete own pending"
  on public.sozcel_word_suggestions;
create policy "sozcel_word_suggestions delete own pending"
  on public.sozcel_word_suggestions for delete
  to authenticated
  using ((suggested_by = auth.uid() and status = 'pending') or public.is_admin());

-- Only the admin marks one picked or passed. Picking one marks every
-- other offer for that night 'passed' (admin.html's pickSozcelSuggestion),
-- which is what lets a member's own app tell "not picked" from "not
-- decided yet" the next morning and ask whether to send the same word
-- again — a night left quietly pending forever says neither.
drop policy if exists "sozcel_word_suggestions update admin"
  on public.sozcel_word_suggestions;
create policy "sozcel_word_suggestions update admin"
  on public.sozcel_word_suggestions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── How many the city offered, without naming any of them ──
-- The box wants to say "43 kelime önerildi" — a fact about the city that
-- every member may know — while the words themselves stay unreadable by
-- the policy above. Same shape as question_tally(): SECURITY DEFINER, one
-- integer, no identities and no content.
create or replace function public.sozcel_suggestion_count(p_night date)
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.sozcel_word_suggestions s
  where s.for_night = p_night;
$$;

revoke all on function public.sozcel_suggestion_count(date) from public;
grant execute on function public.sozcel_suggestion_count(date) to authenticated;

-- PostgREST answers /rest/v1/rpc/* from a cached schema, so a function it
-- has not reloaded is a 404 to the client even though it exists here.
notify pgrst, 'reload schema';

-- Verify:
--   select public.sozcel_suggestion_count(current_date);
--   select * from public.sozcel_word_suggestions order by suggested_at desc;
