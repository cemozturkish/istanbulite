-- Cover badges: district-locked stickers a user can place (and freely
-- drag around) on their profile cover (the white "pano" rectangle behind
-- the avatar in the Profil tab). Stored as a jsonb array of
-- {"id": "galata", "x": 20, "y": 22} objects — id matches the BADGES array
-- in profile-card.js, x/y are percentages (0-100) of the cover's width/
-- height so a saved position scales sensibly across the overlay sheet and
-- the narrower read-only popup. Unlock logic
-- (badge.district === profiles.birth_place) is enforced client-side only,
-- same as the existing avatar sözcü-count gate.
--
-- Safe to run whether cover_badges doesn't exist yet, or already exists
-- as the earlier plain text[] of ids (pre-drag-and-drop) — the latter is
-- migrated in place, defaulting each existing badge to a center position.

do $$
declare
  col_type text;
begin
  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'cover_badges';

  if col_type is null then
    -- Fresh install: column doesn't exist yet.
    alter table public.profiles add column cover_badges jsonb not null default '[]'::jsonb;

  elsif col_type = 'ARRAY' then
    -- Column exists as the earlier plain text[] of ids (pre-drag-and-drop).
    -- `alter column ... type jsonb using (...)` can't contain a correlated
    -- subquery — Postgres rejects it with "cannot use subquery in
    -- transform expression" even though it's just unnesting and
    -- re-aggregating the same column — so convert via a side column +
    -- UPDATE instead, which has no such restriction.
    alter table public.profiles add column if not exists cover_badges_jsonb jsonb;

    update public.profiles set cover_badges_jsonb = (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', elem, 'x', 50, 'y', 50)),
        '[]'::jsonb
      )
      from unnest(cover_badges) as elem
    );

    alter table public.profiles drop column cover_badges;
    alter table public.profiles rename column cover_badges_jsonb to cover_badges;
    alter table public.profiles
      alter column cover_badges set default '[]'::jsonb,
      alter column cover_badges set not null;
  end if;
end $$;

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as db/onboarding.sql's new columns).
