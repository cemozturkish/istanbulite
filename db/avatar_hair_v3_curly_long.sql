-- Layered avatar, hair part 3: kıvırcık uzun saç.
--
-- avatar_hair carries a check constraint naming every allowed value, so
-- 'curly-long' is refused by the DATABASE rather than merely going
-- undrawn -- a member picking it would get a write error on a row the
-- client had already re-rendered. avatar_hair_v2.sql did exactly this
-- once before, for 'buzz'; this is the same move with one more value.
--
-- The constraint is REBUILT, never dropped and left off: a column whose
-- value list no longer matches the drawings in assets/avatar/ is how a
-- fifth hairstyle gets added to the picker and silently rejected on save.
--
-- On the NAME. The first three are one length ladder -- buzz < short <
-- long -- and this adds a second axis, texture. It is 'curly-long' and
-- not 'curly' so that a curly SHORT can be drawn later without either
-- renaming this one (a migration plus a backfill of every member row
-- already holding it) or leaving 'curly' meaning whichever of the two
-- happened to be drawn first. 'long' stays unmarked rather than becoming
-- 'straight-long' for symmetry, for the same reason in reverse: renaming
-- it would rewrite live rows and buy nothing.

alter table public.profiles drop constraint if exists profiles_avatar_hair_check;

alter table public.profiles
  add constraint profiles_avatar_hair_check
  check (avatar_hair in ('buzz', 'short', 'long', 'curly-long'));
