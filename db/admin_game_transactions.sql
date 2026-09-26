-- Atomic admin saves. Apply AFTER game_night_slots, game_day_toggles,
-- sozcel_used_answers v6/v7, and sozcel_word_suggestions v2.
-- Deploy this migration BEFORE the admin.html changes. Existing clients
-- remain compatible. Idempotent; no data backfill or policy replacement.
-- SECURITY INVOKER preserves the caller's RLS permissions as a second
-- check alongside is_admin(). One RPC call is one database transaction.

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
  if exists (select 1 from unnest(p_lineup) g where g not in ('sozcel', 'tumcel', 'bulmaca'))
     or (select count(g) <> count(distinct g) from unnest(p_lineup) g) then
    raise exception 'invalid or repeated game' using errcode = '22023';
  end if;

  -- Serialize two editors saving the same night, even before rows exist.
  perform pg_advisory_xact_lock(71001, p_date - date '2000-01-01');
  delete from public.game_night_slots where game_date = p_date;
  insert into public.game_night_slots (game_date, slot, game)
    select p_date, (n - 1)::smallint, g
    from unnest(p_lineup) with ordinality as slots(g, n);

  delete from public.game_day_toggles
    where game_date = p_date and game in (select unnest(p_lineup));
  insert into public.game_day_toggles (game, game_date, disabled_by, disabled_at)
    select g, p_date, auth.uid(), now()
    from unnest(array['sozcel', 'tumcel', 'bulmaca']) g
    where not exists (select 1 from unnest(p_lineup) chosen where chosen = g)
    on conflict (game, game_date) do update
      set disabled_by = excluded.disabled_by, disabled_at = excluded.disabled_at;
end;
$$;

create or replace function public.admin_pick_sozcel_suggestion(
  p_id uuid, p_night date, p_word text, p_definition text, p_syllables text[]
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  suggestion public.sozcel_word_suggestions%rowtype;
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'admin access required' using errcode = '42501';
  end if;
  if p_id is null or p_night is null or p_word is null
     or nullif(btrim(p_definition), '') is null
     or p_syllables is null or cardinality(p_syllables) not between 2 and 3
     or array_ndims(p_syllables) <> 1
     or exists (select 1 from unnest(p_syllables) s where s is null or s !~ '^[A-ZÇĞİÖŞÜ]+$')
     or array_to_string(p_syllables, '') <> p_word then
    raise exception 'word, definition and two or three matching syllables are required' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(71002, p_night - date '2000-01-01');
  select * into suggestion from public.sozcel_word_suggestions where id = p_id for update;
  if not found then
    raise exception 'suggestion no longer exists' using errcode = 'P0002';
  end if;
  if suggestion.status <> 'pending'
     and not (suggestion.status = 'picked' and suggestion.for_night = p_night) then
    raise exception 'suggestion is no longer available for this night' using errcode = '22023';
  end if;

  -- Credit the author from the locked row, never from a browser argument.
  insert into public.sozcel_used_answers (used_on, word, definition, syllables, sozcul_id)
    values (p_night, p_word, btrim(p_definition), p_syllables, suggestion.suggested_by)
    on conflict (used_on) do update
      set word = excluded.word, definition = excluded.definition,
          syllables = excluded.syllables, sozcul_id = excluded.sozcul_id;
  update public.sozcel_word_suggestions set status = 'passed'
    where for_night = p_night and status = 'picked' and id <> p_id;
  update public.sozcel_word_suggestions set status = 'picked', for_night = p_night
    where id = p_id;
end;
$$;

revoke all on function public.admin_set_game_lineup(date, text[]) from public;
revoke all on function public.admin_pick_sozcel_suggestion(uuid, date, text, text, text[]) from public;
grant execute on function public.admin_set_game_lineup(date, text[]) to authenticated;
grant execute on function public.admin_pick_sozcel_suggestion(uuid, date, text, text, text[]) to authenticated;
notify pgrst, 'reload schema';
