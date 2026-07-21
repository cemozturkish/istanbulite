-- Cover badges: district-locked stickers a user can place on their profile
-- cover (the white "pano" rectangle behind the avatar in the Profil tab).
-- Stored as the list of badge ids the user has chosen to display, e.g.
-- '{galata,kizkulesi}' — matching the BADGES array in profile-card.js.
-- Unlock logic (badge.district === profiles.birth_place) is enforced
-- client-side only, same as the existing avatar sözcü-count gate.

alter table public.profiles
  add column if not exists cover_badges text[] not null default '{}';

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as db/onboarding.sql's new columns).
