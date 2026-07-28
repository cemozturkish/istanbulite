-- Layered avatar, part 4: shirt — a fourth independent overlay on top of
-- hair/hat/accessory (see avatar_hair.sql / avatar_hat.sql /
-- avatar_accessory.sql), same shape as the others: defaults to null (the
-- plain bare look). 'black' is the one shirt option so far, fully open to
-- everyone — no lock, just like the hair options.

alter table public.profiles
  add column if not exists avatar_shirt text check (avatar_shirt in ('black'));

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as avatar_hair.sql/avatar_hat.sql).
