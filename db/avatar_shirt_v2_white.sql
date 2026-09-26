-- Layered avatar, shirt part 2: the white t-shirt.
--
-- avatar_shirt.sql shipped with `check (avatar_shirt in ('black'))`, so
-- 'white' is refused by the DATABASE rather than merely going undrawn --
-- which is what makes this a migration and not a client-side addition
-- like a new hair value (avatar_hair has no such constraint). A member
-- picking the new shirt without this would get a write error on a row
-- the client had already re-rendered optimistically.
--
-- The constraint is rebuilt rather than dropped: a value list that no
-- longer matches the drawings in assets/avatar/ is how a fifth shirt gets
-- added to the picker and silently rejected on save, which is the failure
-- this file exists because of.

do $$
declare
  c text;
begin
  -- The check was created unnamed, so Postgres generated its name; find
  -- whichever constraint currently constrains this column rather than
  -- guessing at 'profiles_avatar_shirt_check'.
  select con.conname into c
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
   where con.conrelid = 'public.profiles'::regclass
     and con.contype = 'c'
     and att.attname = 'avatar_shirt'
   limit 1;

  if c is not null then
    execute format('alter table public.profiles drop constraint %I', c);
  end if;
end $$;

alter table public.profiles
  add constraint profiles_avatar_shirt_check
  check (avatar_shirt in ('black', 'white'));
