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
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cover_badges'
  ) then
    alter table public.profiles add column cover_badges jsonb not null default '[]'::jsonb;
  elsif (
    select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'cover_badges'
  ) = 'ARRAY' then
    alter table public.profiles
      alter column cover_badges type jsonb
      using (
        coalesce(
          (select jsonb_agg(jsonb_build_object('id', elem, 'x', 50, 'y', 50)) from unnest(cover_badges) as elem),
          '[]'::jsonb
        )
      );
    alter table public.profiles alter column cover_badges set default '[]'::jsonb;
  end if;
end $$;

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as db/onboarding.sql's new columns).
