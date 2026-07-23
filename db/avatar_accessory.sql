-- Layered avatar, part 3: a third independent overlay — accessories — on
-- top of hair and hat (see avatar_hair.sql / avatar_hat.sql). 'glasses' is
-- the only option so far and ships locked (no unlock condition yet — see
-- AVATAR_ACCESSORY_OPTIONS in profile-card.js, which marks it `locked: true`
-- unconditionally rather than gating it on a count like the Sözcü hat).

alter table public.profiles
  add column if not exists avatar_accessory text check (avatar_accessory in ('glasses'));

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as avatar_hair.sql/avatar_hat.sql) — not
-- that it matters yet, since the picker refuses to ever save 'glasses'
-- while it's locked.
