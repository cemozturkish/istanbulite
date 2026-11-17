-- =====================================================================
-- guncel_pick_rates — how many players pressed each Güncel card
--
-- For the daily Instagram post (instagram.html): every answer card of a
-- board is printed with the share of players who picked it, as a red bar
-- on top of the card, most picked first.
--
-- What a player pressed is only in game_state.state.picks (card indices
-- into guncel_puzzles.cards, in the order pressed — see guncel.html's
-- saveState). game_results.guesses keeps right/wrong per press but not
-- which card, and game_state is each member's own row, so the admin's
-- client cannot count across players. This counts for them: per card, how
-- many FINISHED boards (state.over) pressed it, and how many finished
-- boards there are. Counts only, no identities, and to the admin alone.
--
-- game_state was created by hand (it is not in db/), so its `date` is
-- compared as text in both spellings it may hold: the YYYY-M-D seed the
-- game writes, and the padded ISO a date-typed column would print.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create or replace function public.guncel_pick_rates(p_seed text, p_iso text)
returns table (card int, picks bigint, players bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  with boards as (
    select row_number() over () as id, gs.state::jsonb -> 'picks' as p
    from public.game_state gs
    where gs.game = 'guncel'
      and gs.date::text in (p_seed, p_iso)
      and coalesce((gs.state::jsonb ->> 'over')::boolean, false)
      and jsonb_typeof(gs.state::jsonb -> 'picks') = 'array'
  ),
  total as (select count(*) as n from boards),
  pressed as (
    -- distinct per board: a card pressed twice (it cannot be, but a
    -- hand-edited state could say so) counts once for that board.
    select distinct b.id, e.value::int as i
    from boards b
    cross join lateral jsonb_array_elements_text(b.p) as e(value)
    where e.value ~ '^\d+$'
  )
  select pr.i, count(*), t.n
  from pressed pr cross join total t
  group by pr.i, t.n
  order by pr.i;
end;
$$;

revoke all on function public.guncel_pick_rates(text, text) from public, anon;
grant execute on function public.guncel_pick_rates(text, text) to authenticated;
