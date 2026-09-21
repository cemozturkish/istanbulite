-- =====================================================================
-- sozcel_word_suggestions v2 — AN OFFER IS NOT FLEETING
--
-- v1 bound every offer to ONE NIGHT (`for_night`, with two per-night
-- unique constraints), and admin.html marked every other offer for that
-- night 'passed' the moment one was picked. So a member who wrote a word
-- on Tuesday morning had it quietly killed by Tuesday's pick and was
-- asked again on Wednesday whether to re-send it — the city was writing
-- into a bucket that was emptied every evening.
--
-- That is the wrong object. A suggestion is a thing a member OFFERS to
-- the app; it belongs in a POOL, and it sits there until it is picked or
-- until they take it back. Nothing else may remove it — not a night
-- going by, not somebody else's word being chosen.
--
-- This is also exactly what tumcel_quote_suggestions has always been (a
-- standing pool with no `for_night` at all), so after this the two
-- suggestion tables are one kind of thing rather than two.
--
-- Run in the Supabase SQL editor, AFTER db/sozcel_word_suggestions.sql.
-- Idempotent.
-- =====================================================================

-- ── 1. `for_night` stops being a requirement and becomes a RECORD ──
-- Kept rather than dropped, and it still means something: on a PICKED
-- row it is the night that word was actually placed on (admin.html
-- writes it there when it picks), which is what lets a member's own box
-- say "seçildi — bu gece bu oynanıyor" on the day it happens. A pending
-- offer is for no night in particular, which is the whole point, so it
-- carries null.
alter table public.sozcel_word_suggestions
  alter column for_night drop not null;

comment on column public.sozcel_word_suggestions.for_night is
  'The night this word was PICKED for, written by the admin at the moment '
  'of picking. Null while the offer is sitting in the pool -- an offer is '
  'not made for a particular night (see db/sozcel_word_suggestions_v2_standing_pool.sql).';

-- ── 2. The two per-night unique constraints go ──
-- They said "one offer per member per NIGHT" and "one word per NIGHT",
-- which in a pool means nothing at all: every pending row has a null
-- for_night, and null is never equal to null, so both constraints would
-- silently stop constraining anything. Dropped by definition rather than
-- by name, because a database that ran v1 before the constraints were
-- named in the file may carry either spelling.
do $$
declare c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.sozcel_word_suggestions'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%for_night%'
  loop
    execute format('alter table public.sozcel_word_suggestions drop constraint %I', c.conname);
  end loop;
end $$;

-- ── 3. What the old rows become ──
-- Every pending row is carried into the pool as it stands: an offer that
-- was never picked is an offer, and the whole complaint this file answers
-- is that those were being thrown away. Only the rows that cannot
-- coexist under the new indexes are stood down, and each is stood down
-- the way that loses the least:
--
--   a) the same word pending twice — the EARLIEST offer holds the word,
--      because whoever wrote it first is who the pool credits;
--   b) one member with several live offers — the NEWEST is kept, because
--      that is what they currently think.
--
-- Both write 'passed', not a delete: the member can still see that the
-- word was not taken, and the record of who offered what survives.
with ranked as (
  select id, row_number() over (partition by word order by suggested_at, id) as rn
  from public.sozcel_word_suggestions
  where status = 'pending'
)
update public.sozcel_word_suggestions s
   set status = 'passed'
  from ranked r
 where r.id = s.id and r.rn > 1;

with ranked as (
  select id, row_number() over (partition by suggested_by order by suggested_at desc, id desc) as rn
  from public.sozcel_word_suggestions
  where status = 'pending'
)
update public.sozcel_word_suggestions s
   set status = 'passed'
  from ranked r
 where r.id = s.id and r.rn > 1;

-- ── 4. The same two rules, now about the POOL rather than about a night ──
-- Partial indexes, over the live rows only: a word that was picked in
-- March must not stop the pool from holding it again (it cannot be played
-- twice anyway -- sozcel_used_answers.word is unique across all days, and
-- the client checks that table before offering), and a member whose word
-- was picked is free to offer another the same minute.
create unique index if not exists sozcel_word_suggestions_one_live_per_member
  on public.sozcel_word_suggestions (suggested_by) where status = 'pending';

create unique index if not exists sozcel_word_suggestions_live_word
  on public.sozcel_word_suggestions (word) where status = 'pending';

-- The admin's list is the pool, oldest first (see loadSozcelSuggestions):
-- an offer that has waited longest is the one that must not be starved.
create index if not exists sozcel_word_suggestions_pool_idx
  on public.sozcel_word_suggestions (status, suggested_at);

-- ── 5. The insert fence loses its deadline ──
-- v1 refused a row whose for_night was already past, which was the whole
-- of "you cannot offer for a night that has begun". There is no night to
-- be late for now: an offer is for the pool, and the only thing the
-- policy still has to say is that a member writes their own row.
drop policy if exists "sozcel_word_suggestions insert own"
  on public.sozcel_word_suggestions;
create policy "sozcel_word_suggestions insert own"
  on public.sozcel_word_suggestions for insert
  to authenticated
  with check (suggested_by = auth.uid());

-- The delete policy is unchanged and is the "unless the user revokes"
-- half of this whole file, restated here only so the two halves are
-- readable together: a member takes back their own PENDING offer, and a
-- picked one is the night's word and no longer theirs to take.
drop policy if exists "sozcel_word_suggestions delete own pending"
  on public.sozcel_word_suggestions;
create policy "sozcel_word_suggestions delete own pending"
  on public.sozcel_word_suggestions for delete
  to authenticated
  using ((suggested_by = auth.uid() and status = 'pending') or public.is_admin());

-- ── 6. How big the pool is, without naming anything in it ──
-- Replaces sozcel_suggestion_count(date), which asked about one night and
-- now answers 0 for every night (a pending row has no night). Same shape:
-- SECURITY DEFINER, one integer, no words and no identities, so the box
-- can say "43 kelime bekliyor" while the words themselves stay unreadable
-- by the read policy (a suggestion is a candidate ANSWER -- see v1's own
-- note on why this table is not world-readable).
--
-- A NEW NAME rather than a defaulted argument on the old one: two
-- candidate functions differing only by a default make a one-argument
-- call ambiguous (42725) rather than resolving, which is the trap
-- sozcel_daily_word already documents. The old function is left in place
-- for the window in which a cached client still calls it.
create or replace function public.sozcel_pool_count()
returns integer
language sql
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.sozcel_word_suggestions s
  where s.status = 'pending';
$$;

revoke all on function public.sozcel_pool_count() from public;
grant execute on function public.sozcel_pool_count() to authenticated;

-- PostgREST answers /rest/v1/rpc/* from a cached schema, so a function it
-- has not reloaded is a 404 to the client even though it exists here.
notify pgrst, 'reload schema';

-- Verify:
--   select public.sozcel_pool_count();
--   select word, status, for_night, suggested_at
--     from public.sozcel_word_suggestions order by suggested_at;
