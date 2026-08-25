-- =====================================================================
-- One-time cleanup: uppercase every politician's name (Turkish-aware,
-- matching admin.html's Kişiler convention -- see the tr_upper() function
-- and uppercase_politician_name trigger added to db/politicians.sql,
-- which keeps future inserts/updates uppercase automatically) and merge
-- any duplicate people this uncovers.
--
-- The bulk imports (db/seed/tbmm_28_donem_import.sql,
-- db/seed/istanbul_mayors_import.sql) deduped by exact (first_name, last_name)
-- match, which missed people already in the table under different casing
-- -- e.g. an admin-entered "SİNEM DEDETAŞ" sitting next to the mayors
-- import's "Sinem Dedetaş" as two separate rows. Uppercasing first makes
-- those collide so the dedupe step below can find and merge them: for
-- each name with more than one row, the oldest row (most likely the one
-- an admin hand-configured with an avatar before any bulk import ran) is
-- kept, its blank party/bio/birth fields are backfilled from a duplicate,
-- any seat pointing at a duplicate is repointed to the keeper, and the
-- duplicate rows are deleted.
--
-- Safe to run more than once: the uppercase step is idempotent, and once
-- there's only one row per (first_name, last_name) the dedupe step is a
-- no-op. Run db/politicians.sql first if tr_upper() doesn't exist yet --
-- this script also (re)defines it so it doesn't depend on run order.
--
-- Run in the Supabase SQL editor.
-- =====================================================================

create or replace function public.tr_upper(t text)
  returns text language sql immutable as $$
  select upper(translate(
    t,
    'abcçdefgğhıijklmnoöprsştuüvyz',
    'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'
  ));
$$;

update public.politicians
set first_name = public.tr_upper(first_name),
    last_name  = public.tr_upper(last_name)
where first_name is distinct from public.tr_upper(first_name)
   or last_name  is distinct from public.tr_upper(last_name);

-- One row per duplicate (loser_id -> keeper_id); keeper is the oldest row
-- for that (first_name, last_name).
create temporary table _politician_dupe_map on commit drop as
with ranked as (
  select id, first_name, last_name,
         row_number() over (partition by first_name, last_name order by created_at asc) as rn
  from public.politicians
)
select l.id as loser_id, k.id as keeper_id
from ranked l
join ranked k on k.first_name = l.first_name and k.last_name = l.last_name and k.rn = 1
where l.rn > 1;

-- One backfill source per keeper (the most recently created duplicate),
-- so a keeper with several duplicates gets a deterministic, single donor
-- row instead of Postgres picking an unspecified one.
create temporary table _politician_backfill on commit drop as
select distinct on (m.keeper_id)
  m.keeper_id, l.party, l.bio, l.birth_date, l.birth_place
from _politician_dupe_map m
join public.politicians l on l.id = m.loser_id
order by m.keeper_id, l.created_at desc;

update public.politicians k
set party       = coalesce(k.party, b.party),
    bio         = coalesce(k.bio, b.bio),
    birth_date  = coalesce(k.birth_date, b.birth_date),
    birth_place = coalesce(k.birth_place, b.birth_place)
from _politician_backfill b
where k.id = b.keeper_id;

update public.political_seats s
set politician_id = m.keeper_id
from _politician_dupe_map m
where s.politician_id = m.loser_id;

update public.tbmm_seats s
set politician_id = m.keeper_id
from _politician_dupe_map m
where s.politician_id = m.loser_id;

delete from public.politicians
where id in (select loser_id from _politician_dupe_map);
