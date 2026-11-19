-- ══════════════════════════════════════════════════════════════
-- THE KEFIL GATE IS PARKED: anyone can sign up, and the admin is
-- their kefil.
--
-- index.html no longer asks for a kefil code (KEFIL_REQUIRED = false)
-- and sends none. handle_new_user() — an AFTER INSERT trigger on
-- auth.users that lives only in Supabase, never committed here — still
-- validates raw_user_meta_data.referral_code and links referred_by. So
-- rather than rewrite that function blind, this BEFORE INSERT trigger
-- fills the code in with the admin's own referral_code whenever the
-- signup arrived without one. BEFORE triggers run before any AFTER
-- trigger, so handle_new_user sees an ordinary, valid code.
--
-- A signup that does carry a code keeps it.
--
-- Unpark: drop this trigger and set KEFIL_REQUIRED = true in index.html.
--   drop trigger if exists kefil_default_admin on auth.users;
--
-- Idempotent.
-- ══════════════════════════════════════════════════════════════

create or replace function public.kefil_default_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if coalesce(trim(new.raw_user_meta_data ->> 'referral_code'), '') = '' then
    select p.referral_code into v_code
      from public.profiles p
      join auth.users u on u.id = p.id
     where lower(u.email) = 'cemwozturk@gmail.com'
     limit 1;

    if v_code is not null then
      new.raw_user_meta_data :=
        coalesce(new.raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('referral_code', v_code);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists kefil_default_admin on auth.users;
create trigger kefil_default_admin
  before insert on auth.users
  for each row execute function public.kefil_default_admin();
