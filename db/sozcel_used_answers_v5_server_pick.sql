-- =====================================================================
-- sozcel_used_answers v5 — the daily word becomes server-authoritative.
--
-- Until now every client picked the day's word itself: it read the whole
-- used-word table, filtered the pool, indexed into it with a hash of the
-- Istanbul date, inserted the result — and then kept playing its own
-- pick even when that insert never landed. Two things made that diverge:
--
--   1. The pool size is part of the index (hash % pool.length), so two
--      clients whose snapshot of the used rows differs by a single row
--      compute two completely different words for the same day. The
--      first insert wins the used_on primary key; every other client
--      silently keeps playing a word that is in nobody else's game.
--   2. The date key itself was derived by string-parsing a localized
--      date ("8/13/2026, 12:05:03 AM") back into a Date, which is
--      engine-dependent — a client that misreads it looks up the wrong
--      day's row, finds nothing, and auto-picks on top of a day that
--      already has a word.
--
-- Both go away if the database owns the decision. sozcel_daily_word()
-- resolves the Istanbul date server-side, returns today's row if one
-- exists, and otherwise records the first of the client's proposed
-- candidates that hasn't been used before — atomically, so concurrent
-- first-players of the day converge on one word instead of racing.
-- Clients no longer write today's row at all; they play back exactly
-- what this function returns.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

-- Prerequisites, restated so this file can be run on its own. The
-- function below selects all five of these columns, so if v2/v4 were
-- never applied the CREATE FUNCTION fails outright — and a database left
-- without sozcel_daily_word() is exactly the state in which every player
-- is told the day's word can't be reached.
alter table public.sozcel_used_answers
  add column if not exists definition text;
alter table public.sozcel_used_answers
  add column if not exists syllables text[];
alter table public.sozcel_used_answers
  add column if not exists sozcul_id uuid references public.profiles(id) on delete set null;

-- Today's date in Istanbul, decided by the database rather than by
-- whatever the player's device thinks the date is.
create or replace function public.sozcel_istanbul_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Europe/Istanbul')::date;
$$;

-- Returns today's Sözcel word, creating it from `candidates` if the day
-- has none yet. SECURITY DEFINER so the auto-pick insert doesn't need a
-- blanket client-side INSERT policy (see the tightened policy below);
-- callers must still be signed in.
--
-- `candidates` is the client's ordered preference list (its seeded pick
-- first, then following words from the unused pool). The first candidate
-- not already used on some other day is taken. Passing NULL/'{}' just
-- reads the day's row without ever creating one.
create or replace function public.sozcel_daily_word(candidates text[] default null)
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
  d date := public.sozcel_istanbul_today();
  has_word boolean;
begin
  if auth.uid() is null then
    raise exception 'sozcel_daily_word: authentication required'
      using errcode = '42501';
  end if;

  -- Does the day already have a word (a Sözcü's submission, or an earlier
  -- player's auto-pick)? This is the case for every client after the first
  -- one of the day. Asked as its own question rather than by returning the
  -- row and testing FOUND: a single RETURN QUERY at the end means the
  -- result set can never be emitted twice, whatever FOUND does after a
  -- RETURN QUERY.
  select exists (
    select 1 from public.sozcel_used_answers a where a.used_on = d
  ) into has_word;

  if not has_word and candidates is not null and array_length(candidates, 1) > 0 then
    -- Take the first candidate that has never been used. `on conflict do
    -- nothing` covers both guards at once: the used_on primary key (another
    -- client got here first) and the unique index on word (the candidate
    -- was already the answer on an earlier day). Either way nobody errors
    -- out — the select below settles what the day's word actually is.
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

revoke all on function public.sozcel_istanbul_today() from public;
revoke all on function public.sozcel_daily_word(text[]) from public;
grant execute on function public.sozcel_istanbul_today() to authenticated;
grant execute on function public.sozcel_daily_word(text[]) to authenticated;

-- With the auto-pick handled by the function above, no client has any
-- business inserting a row for today (or any past day) anymore. The only
-- direct insert left is an assigned Sözcü saving their own upcoming
-- word, which mirrors the UPDATE policy exactly: their own row, before
-- its deadline (midnight Istanbul at the start of used_on, i.e. UTC-3h).
-- This is what stops a client whose clock or date parsing is off from
-- writing a word onto a day that already has one.
drop policy if exists "sozcel_used_answers insert authenticated"
  on public.sozcel_used_answers;
drop policy if exists "sozcel_used_answers insert own future word"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers insert own future word"
  on public.sozcel_used_answers for insert
  to authenticated
  with check (
    sozcul_id = auth.uid()
    and now() < (used_on::timestamp at time zone 'utc') - interval '3 hours'
  );

-- PostgREST answers /rest/v1/rpc/* out of a cached schema, so a function
-- it hasn't reloaded yet is a 404 (PGRST202) to the game even though the
-- function exists in the database. Supabase reloads on DDL, but ask
-- explicitly — the cost is nothing and the failure it prevents looks to
-- players like the word being permanently unreachable.
notify pgrst, 'reload schema';

-- Verify: this should print today's Istanbul date and, once a client has
-- opened the game, today's word.
--   select public.sozcel_istanbul_today();
--   select * from public.sozcel_used_answers
--    where used_on = public.sozcel_istanbul_today();
