-- Layered avatar: profiles.avatar_url is now only ever the locked Sözcü
-- special (a single full-image override, unchanged) or null. Everyone else's
-- avatar is the bald base (assets/avatar/avatar-base.png) with an optional
-- transparent hair overlay picked here — 'short'/'long' match
-- assets/avatar/avatar-hair-short.png / assets/avatar/avatar-hair-long.png, null = kel
-- (bald, no overlay). See avatar.js / profile-card.js AVATAR_HAIR_OPTIONS.

alter table public.profiles
  add column if not exists avatar_hair text check (avatar_hair in ('short', 'long'));

-- Backfill existing picks from the old single-image avatar_url scheme, then
-- clear avatar_url for everyone except the Sözcü special (which keeps using
-- avatar_url as its full-image override).
update public.profiles set avatar_hair = 'long'  where avatar_url = 'assets/avatar-long.png';
update public.profiles set avatar_hair = 'short' where avatar_url = 'assets/avatar-short.png';
update public.profiles set avatar_url = null
  where avatar_url in ('assets/avatar-long.png', 'assets/avatar-short.png', 'assets/avatar-bald.png');

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as db/onboarding.sql's new columns).
