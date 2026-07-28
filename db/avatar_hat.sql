-- Layered avatar, part 2: the locked Sözcü reward becomes a hat overlay
-- ('crown', assets/avatar/avatar-hat-crown.png) stacked on top of the bald
-- base + hair the same way avatar_hair already layers on (see
-- avatar_hair.sql) — independent of whichever hair is picked underneath —
-- instead of a single full-image override. See avatar.js / profile-card.js
-- AVATAR_HAT_OPTIONS.

alter table public.profiles
  add column if not exists avatar_hat text check (avatar_hat in ('crown'));

-- Backfill: anyone whose avatar_url still points at the old Sözcü special
-- full-image gets the crown hat instead, keeping whatever hair they already
-- had picked. avatar_url is left in place (unused going forward, but not
-- dropped) rather than removed outright.
update public.profiles set avatar_hat = 'crown' where avatar_url = 'assets/avatar/avatar-sozcu.png';
update public.profiles set avatar_url = null     where avatar_url = 'assets/avatar/avatar-sozcu.png';

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as avatar_hair.sql).
