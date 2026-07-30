-- Adds the 'buzz' hair option (assets/avatar/avatar-hair-buzz.png) -- shorter
-- than 'short' but not bald, unlocked by default like every other hair pick.
-- See avatar_hair.sql for the original column + check constraint.

alter table public.profiles drop constraint if exists profiles_avatar_hair_check;
alter table public.profiles
  add constraint profiles_avatar_hair_check check (avatar_hair in ('buzz', 'short', 'long'));
