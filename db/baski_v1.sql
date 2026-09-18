-- =====================================================================
-- THE BASKI — one edition, every kind of thing in it.
--
-- breaking_news already worked this way (db/breaking_news_v3_edition.sql):
-- a story is WRITTEN whenever it is written, and it is PUBLISHED by being
-- given an `edition_date`. Posting is not publishing. This migration does
-- the same thing to the other two kinds the reader meets in a column —
-- ETKİNLİK and ANKET — and gives MEKTUP the one thing it never had, which
-- is somebody to be addressed to.
--
-- The shape is deliberately the SAME SHAPE in all three tables rather than
-- a join table of "things in an edition": `edition_date` + `edition_order`,
-- exactly as breaking_news carries them. A polymorphic edition table would
-- need a type column and a per-type join at read time, on a client whose
-- whole job at that moment is to not wait on the network — and it would
-- put the one fact each loader has to filter on (is this in the edition?)
-- one table further away from the row it is about. Three copies of two
-- columns is the cheap answer, and it is the one already shipped.
--
-- An edition is a DATE, not a (date, gündüz/gece) pair, which is the
-- meaning breaking_news already gave the word and which
-- news_current_edition() already resolves against. The app prints two
-- editions a day and the press bar counts down to whichever comes next,
-- but what the admin ASSEMBLES is a day’s paper: the gündüz/gece split is
-- about which column shows what (see "THE TWO EDITIONS" in CLAUDE.md), not
-- about two separate piles of content to curate.
--
-- "The edition in force" is the NEWEST edition_date at or before the
-- reader’s own day — per kind, resolved by its own function below. So a
-- kind nobody has ever curated resolves to null and its column says so,
-- and a kind curated a week ago goes on holding until the admin sets a
-- newer one. There is no timer and no forced rollover; that is the same
-- rule news_current_edition() states and the reason it takes p_today
-- rather than reading the clock itself (the Istanbul date is the client’s
-- to compute — CLAUDE.md rule 10 — and the server’s timezone is not it).
--
-- Run in Supabase SQL editor. Idempotent.
--
-- NO DOLLAR QUOTING IN THIS FILE, AND THAT IS DELIBERATE. The first cut
-- of it wrote the two functions below with the usual `as $tag$ ... $tag$`
-- body and the Supabase SQL editor refused the whole script with
-- "42601: unterminated dollar-quoted string". The SQL was never wrong --
-- it parses cleanly against the real Postgres grammar -- but the editor
-- splits a script into statements on the client before sending it, and
-- its splitter lost track of the quoting and cut a function in half.
-- Neither of the two functions below needs a dollar-quoted body: a
-- single-quoted one says the same thing, contains no apostrophe to
-- escape and no semicolon to be cut at, and works on every Postgres
-- version. A check constraint that used to be wrapped in a DO block is
-- two plain ALTERs for the same reason (drop-if-exists then add is
-- exactly as idempotent as the block was).
--
-- The rule for the next migration: if a statement does not genuinely
-- need a procedural body, do not give it one.
-- =====================================================================


-- ── ETKİNLİK ─────────────────────────────────────────────────────────
-- An event reaches Kahvehane’s column only through a baskı. Which of the
-- three slots it lands in is still a fact about the EVENT and not about
-- the edition — day+0 / +1 / +2 counted from the edition’s own date, the
-- same bucketing loadEtkinlikActor always did — and `edition_order` is
-- its position inside that one day’s stack, ascending, admin-set. So a
-- baskı can carry three evenings on Saturday and one on Sunday, and the
-- reader goes through Saturday’s three one at a time.
alter table public.events
  add column if not exists edition_date  date,
  add column if not exists edition_order integer not null default 0;

create index if not exists events_edition_idx
  on public.events (edition_date, event_date, edition_order);

-- And an evening gets its English half, on the same terms breaking_news
-- got one (db/breaking_news_v2_bilingual.sql): the Turkish stays required
-- and is what every reader sees by default; the English is used only
-- where the reader’s language_pref is English AND that half was actually
-- written. So an event translated by halves still reads in Turkish
-- rather than going blank, and every row written before this migration
-- behaves exactly as it did.
alter table public.events
  add column if not exists title_en       text,
  add column if not exists description_en text;

-- ── ANKET ────────────────────────────────────────────────────────────
-- Same two columns, same meaning. `active` stays exactly as it is and
-- keeps meaning what it meant — a poll that is closed is closed whether
-- or not it was ever in a baskı — so the gate is BOTH: in the edition in
-- force, and still open.
alter table public.neighborhood_polls
  add column if not exists edition_date  date,
  add column if not exists edition_order integer not null default 0;

create index if not exists neighborhood_polls_edition_idx
  on public.neighborhood_polls (edition_date, edition_order);


-- ── The edition in force, per kind ───────────────────────────────────
-- One function each rather than one generic one, for the same reason the
-- columns are per-table: a single max() across all three would let a
-- baskı carrying only events declare itself the edition in force for the
-- news as well, and the news column would go empty on a day somebody
-- curated evenings. Each kind holds its own last paper until it is given
-- a new one.
--
-- SECURITY DEFINER for the same reason news_current_edition is: the
-- "at or before today" rule lives here once rather than in every page
-- that reads a column. RLS already lets an authenticated reader select
-- these tables, so this grants nothing new — it only keeps the rule in
-- one place.
create or replace function public.events_current_edition(p_today date)
returns date
language sql
stable
security definer
set search_path = public
as 'select max(edition_date) from public.events where edition_date <= p_today';

grant execute on function public.events_current_edition(date) to authenticated;

create or replace function public.polls_current_edition(p_today date)
returns date
language sql
stable
security definer
set search_path = public
as 'select max(edition_date) from public.neighborhood_polls where edition_date <= p_today';

grant execute on function public.polls_current_edition(date) to authenticated;


-- ── MEKTUP — who a letter is addressed to ────────────────────────────
-- A letter is written by a real person and lands in a member’s Posta
-- Kutusu. Until now every letter landed in EVERY member’s, which is the
-- one thing a letter is not: it is addressed. `audience` is the whole of
-- it —
--   `all`          — everybody, which is what every existing row is and
--                    stays (the column defaults to it, so a database
--                    that has not run this migration and one that has
--                    behave identically for rows written before it)
--   `neighborhood` — only members whose CURRENT district is one of the
--                    rows in library_letter_neighborhoods below
--
-- Deliberately not a general "audience query" with operators: the one
-- real case is a district, and a rule language nobody can read is worse
-- than a second row in this check constraint on the day another case
-- turns up.
alter table public.library_letters
  add column if not exists audience text not null default 'all';

alter table public.library_letters
  drop constraint if exists library_letters_audience_check;

alter table public.library_letters
  add constraint library_letters_audience_check
  check (audience in ('all', 'neighborhood'));

-- Which districts a `neighborhood`-audience letter is addressed to. A
-- join table rather than an array column so the district is a real
-- foreign key: a letter addressed to a district that does not exist is a
-- letter nobody will ever be able to explain.
create table if not exists public.library_letter_neighborhoods (
  letter_id    uuid not null references public.library_letters(id) on delete cascade,
  neighborhood text not null references public.neighborhoods(id)   on delete cascade,
  primary key (letter_id, neighborhood)
);

create index if not exists library_letter_neighborhoods_nb_idx
  on public.library_letter_neighborhoods (neighborhood);

alter table public.library_letter_neighborhoods enable row level security;

-- Readable by everyone signed in: the reader’s own client is what filters
-- their postbox, and knowing that a letter was addressed to Beşiktaş is
-- not private in the way its CONTENTS would be. (It is the same stance
-- breaking_news_countries takes — which countries a story is about is
-- part of the story.)
drop policy if exists "letter_nb read for authenticated" on public.library_letter_neighborhoods;
create policy "letter_nb read for authenticated"
  on public.library_letter_neighborhoods for select to authenticated using (true);

drop policy if exists "letter_nb insert admin" on public.library_letter_neighborhoods;
create policy "letter_nb insert admin"
  on public.library_letter_neighborhoods for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "letter_nb delete admin" on public.library_letter_neighborhoods;
create policy "letter_nb delete admin"
  on public.library_letter_neighborhoods for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');


-- ── BACKFILL — nothing goes dark on the day this runs ────────────────
-- The gate is the point of this migration, and a gate applied to a live
-- database with nothing behind it is the reader’s column going blank
-- until somebody notices. So every event that has not already happened,
-- and every poll still open, is filed into one baskı dated today: the
-- state the site is already in, written down in the new terms. From the
-- next baskı on it is all curation.
--
-- `where edition_date is null` is what makes it idempotent AND safe to
-- re-run later — a row the admin has since pulled out of a baskı by hand
-- has a null date again, and re-running this would quietly put it back.
-- It will not: current_date moves, and a second run files it into a NEW
-- baskı rather than the one it was pulled from. That is a real edge and
-- the reason this block is at the bottom, by itself, where it can be
-- commented out before a re-run.
update public.events
   set edition_date = current_date
 where edition_date is null
   and event_date >= (current_date::timestamptz);

update public.neighborhood_polls
   set edition_date = current_date
 where edition_date is null
   and active;
