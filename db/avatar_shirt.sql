-- Layered avatar, part 4: shirt — the odd one out among the layers (see
-- avatar_hair.sql / avatar_hat.sql / avatar_accessory.sql), because it
-- defaults to 'black' for everyone instead of defaulting to none. The
-- column default backfills existing rows too (Postgres fills in the
-- default for a column added with ADD COLUMN, not just new inserts), and
-- the explicit UPDATE below is just belt-and-suspenders for that.

alter table public.profiles
  add column if not exists avatar_shirt text default 'black' check (avatar_shirt in ('black'));

update public.profiles set avatar_shirt = 'black' where avatar_shirt is null;

-- The existing protect_profile_columns trigger does NOT touch this column,
-- so the standard "users update their own row" RLS policy already lets the
-- user write it (same reasoning as avatar_hair.sql/avatar_hat.sql) — e.g.
-- to pick 'Yok' (null) and go bare-chested instead of the default shirt.
