-- =====================================================================
-- guncel_puzzles — GÜNCEL, the fourth game: "which of these happened
-- yesterday?"
--
-- Sixteen events on a 4×4 board. A few of them happened on the day
-- before the puzzle's own day; the rest happened earlier (last week,
-- last month, years ago). The reader presses the ones they think are
-- yesterday's. A wrong press says when that thing really happened
-- ("Bu geçen yıl oldu") and costs one of four lives -- Connections'
-- hearts, on a question about the news.
--
-- One row per day, keyed by `puzzle_date` the way tumcel_puzzles and
-- bulmaca_puzzles are: guncel.html reads it off IstDate.gameNightSeed().
--
-- `cards` is an array of exactly 16 objects:
--   { "text": "…", "text_en": "…" | null, "date": "YYYY-MM-DD" }
-- `date` is when the event really happened. Nothing stores which cards
-- are the answers: a card is an answer when its date is the puzzle's
-- own day or the day before it, so the game and the admin's editor work
-- the answer out of the same fact the "when it really happened" line
-- is printed from -- the two can never disagree.
--
-- Also widens the four places a game key is fenced to the three games
-- that existed until now (game_results, game_day_toggles,
-- game_night_slots and, if it carries one, game_state), and redefines
-- admin_set_game_lineup so the admin can stand Güncel in a slot.
--
-- Run in Supabase SQL editor AFTER db/admin_game_transactions.sql.
-- Idempotent.
-- =====================================================================

create table if not exists public.guncel_puzzles (
  puzzle_date date        primary key,
  cards       jsonb       not null
                          check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) = 16),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.guncel_puzzles enable row level security;

drop policy if exists "Authenticated users can view guncel_puzzles" on public.guncel_puzzles;
create policy "Authenticated users can view guncel_puzzles"
  on public.guncel_puzzles
  for select to authenticated using (true);

drop policy if exists "Admin can manage guncel_puzzles" on public.guncel_puzzles;
create policy "Admin can manage guncel_puzzles"
  on public.guncel_puzzles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.set_guncel_puzzles_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_guncel_puzzles_updated_at on public.guncel_puzzles;
create trigger set_guncel_puzzles_updated_at
  before update on public.guncel_puzzles
  for each row execute function public.set_guncel_puzzles_updated_at();

-- ── Let 'guncel' through every fence a game key stands behind ──
-- The existing CHECKs were declared inline, so their names are whatever
-- Postgres generated. Find each one by what it says (it names 'tumcel')
-- rather than guessing its name, drop it, and put back one that also
-- names 'guncel'. game_state is not in db/ at all (it was created by
-- hand), so it is only touched if it exists and was fenced to begin with.
do $$
declare
  r record;
  state_was_fenced boolean := false;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, c.conrelid
    from pg_constraint c
    where c.contype = 'c'
      and c.conrelid = any (array[
        to_regclass('public.game_results'),
        to_regclass('public.game_day_toggles'),
        to_regclass('public.game_night_slots'),
        to_regclass('public.game_state')
      ])
      and pg_get_constraintdef(c.oid) ilike '%tumcel%'
  loop
    if r.conrelid = to_regclass('public.game_state') then
      state_was_fenced := true;
    end if;
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;

  alter table public.game_results add constraint game_results_game_check
    check (game in ('sozcel', 'bulmaca', 'tumcel', 'guncel', 'baglantilar'));
  alter table public.game_day_toggles add constraint game_day_toggles_game_check
    check (game in ('sozcel', 'tumcel', 'bulmaca', 'guncel'));
  alter table public.game_night_slots add constraint game_night_slots_game_check
    check (game in ('sozcel', 'tumcel', 'bulmaca', 'guncel'));
  if state_was_fenced then
    execute 'alter table public.game_state add constraint game_state_game_check
      check (game in (''sozcel'', ''bulmaca'', ''tumcel'', ''guncel'', ''baglantilar''))';
  end if;
end $$;

-- ── The lineup save, now knowing four games ──
-- Identical to db/admin_game_transactions.sql except for the list of
-- games: any of the four may stand in either slot, and every game NOT
-- in the night's lineup gets a toggle-off row.
create or replace function public.admin_set_game_lineup(p_date date, p_lineup text[])
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if p_date is null or p_lineup is null or cardinality(p_lineup) <> 2
     or array_ndims(p_lineup) <> 1 then
    raise exception 'a date and exactly two slots are required' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_lineup) g where g not in ('sozcel', 'tumcel', 'bulmaca', 'guncel'))
     or (select count(g) <> count(distinct g) from unnest(p_lineup) g) then
    raise exception 'invalid or repeated game' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(71001, p_date - date '2000-01-01');
  delete from public.game_night_slots where game_date = p_date;
  insert into public.game_night_slots (game_date, slot, game)
    select p_date, (n - 1)::smallint, g
    from unnest(p_lineup) with ordinality as slots(g, n);

  delete from public.game_day_toggles
    where game_date = p_date and game in (select unnest(p_lineup));
  insert into public.game_day_toggles (game, game_date, disabled_by, disabled_at)
    select g, p_date, auth.uid(), now()
    from unnest(array['sozcel', 'tumcel', 'bulmaca', 'guncel']) g
    where not exists (select 1 from unnest(p_lineup) chosen where chosen = g)
    on conflict (game, game_date) do update
      set disabled_by = excluded.disabled_by, disabled_at = excluded.disabled_at;
end;
$$;

revoke all on function public.admin_set_game_lineup(date, text[]) from public;
grant execute on function public.admin_set_game_lineup(date, text[]) to authenticated;
notify pgrst, 'reload schema';
