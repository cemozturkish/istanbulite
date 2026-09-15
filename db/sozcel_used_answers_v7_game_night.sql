-- =====================================================================
-- sozcel_used_answers v7 — the word belongs to a NIGHT, not to a date.
--
-- v5 made the day's word server-authoritative and resolved it with
--     sozcel_istanbul_today() = (now() at time zone 'Europe/Istanbul')::date
-- which rolls the word at MIDNIGHT. That was exactly right while the
-- games ran all day.
--
-- They no longer do. The games are now night-only (NIGHT_GAMES_ENABLED in
-- project.html): playable from sunset to sunrise, with the word for that
-- night chosen by the admin out of the day's suggestions
-- (db/sozcel_word_suggestions.sql). A night SPANS MIDNIGHT — in December
-- it runs 17:37 to 08:22 — so under v5 a member playing at 22:00 and a
-- member playing at 01:00 were handed TWO DIFFERENT WORDS for the same
-- night, and both results landed on one scoreboard.
--
-- The fix is not to teach Postgres where the sun is. It is to let the
-- caller name the night it is playing, because the client already knows
-- exactly — IstDate.editionKey() computes sunrise/sunset for İstanbul and
-- returns the date a night BEGAN on, which is the key both halves of it
-- share.
--
-- This does NOT reintroduce a client-side pick, which is the thing v5
-- exists to prevent and which CLAUDE.md forbids. The database still
-- decides what the word IS: the caller says *which night is being asked
-- for*, and nothing else changes. Reading another night's row was
-- already possible anyway — sozcel_used_answers is SELECT-able by every
-- authenticated user — so this moves no privilege, only a parameter.
--
-- Run in the Supabase SQL editor. Idempotent.
-- =====================================================================

-- The old one-argument signature has to go explicitly: adding a
-- defaulted second parameter leaves TWO candidate functions, and a call
-- with one argument then fails as ambiguous (42725) rather than
-- resolving — which reaches the player as the word being unreachable.
drop function if exists public.sozcel_daily_word(text[]);

create or replace function public.sozcel_daily_word(
  candidates text[] default null,
  p_night date default null
)
returns table (
  used_on date,
  word text,
  definition text,
  syllables text[],
  sozcul_id uuid
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  -- No night named = the calendar date, exactly as v5 behaved. That is
  -- what a page opened outside the app still gets, and it is what every
  -- existing row is keyed on.
  d date := coalesce(p_night, public.sozcel_istanbul_today());
  has_word boolean;
begin
  if auth.uid() is null then
    raise exception 'sozcel_daily_word: authentication required'
      using errcode = '42501';
  end if;

  -- A night is named for the day it began on, so it is never more than
  -- one day either side of the server's own date. Anything further is a
  -- caller asking for a word it has no business creating — refuse to
  -- AUTO-PICK there rather than letting a wrong clock mint words onto
  -- arbitrary days. (Reading such a day is still fine; only the insert
  -- below is fenced.)
  if abs(d - public.sozcel_istanbul_today()) > 1 then
    candidates := null;
  end if;

  select exists (
    select 1 from public.sozcel_used_answers a where a.used_on = d
  ) into has_word;

  if not has_word and candidates is not null and array_length(candidates, 1) > 0 then
    insert into public.sozcel_used_answers (used_on, word)
    select cand.day, cand.candidate
    from (
      select d as day, t.c as candidate
      from unnest(candidates) with ordinality as t(c, ord)
      where t.c is not null
        and length(t.c) > 0
        and not exists (
          select 1 from public.sozcel_used_answers u where u.word = t.c
        )
      order by t.ord
      limit 1
    ) as cand
    on conflict do nothing;
  end if;

  return query
    select a.used_on, a.word, a.definition, a.syllables, a.sozcul_id
    from public.sozcel_used_answers a
    where a.used_on = d;
end;
$$;

revoke all on function public.sozcel_daily_word(text[], date) from public;
grant execute on function public.sozcel_daily_word(text[], date) to authenticated;

notify pgrst, 'reload schema';

-- Verify:
--   select * from public.sozcel_daily_word(null, current_date);
