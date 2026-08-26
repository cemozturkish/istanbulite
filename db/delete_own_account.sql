-- Self-service account deletion (App Store Guideline 5.1.1v: apps with
-- account creation must let the user delete their account in-app).
--
-- Deleting the auth.users row cascades to public.profiles (id references
-- auth.users(id) on delete cascade, per CLAUDE.md), which in turn cascades
-- to every table that references profiles(id) on delete cascade
-- (neighborhood_comments, article_comments, game_results, event_rsvps,
-- library_articles_v2/v3 author/user rows, breaking_news_polls,
-- admin_notification_reads, tumcel_quote_suggestions, etc).
--
-- The one relationship that does NOT cascade cleanly is profiles.referred_by
-- (self-referencing FK: other members' referred_by points at this user).
-- Its ON DELETE behavior isn't defined in any file under db/ (the base
-- profiles table predates this folder), so rather than guess the
-- constraint's action, this function defensively nulls out referred_by on
-- anyone who was sponsored by the account being deleted, before deleting.
-- That's a safe no-op if the FK already does ON DELETE SET NULL, and a
-- required step if it's NO ACTION/RESTRICT.
--
-- Run this once in the Supabase SQL editor.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles
  set referred_by = null
  where referred_by = auth.uid();

  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
