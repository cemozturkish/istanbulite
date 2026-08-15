-- =====================================================================
-- sozcel_used_answers v6 — the admin can always intervene.
--
-- After v5 there was no way for anyone, including the admin, to set or
-- correct a day's word from the site. Writes were limited to the assigned
-- Sözcü, their own row, before its deadline (midnight Istanbul at the
-- start of used_on). Which means: a Sözcü who missed the deadline, a word
-- entered wrong, a day the auto-pick landed on something unwanted, or a
-- day with no word at all were all unfixable — the day was locked and
-- stayed locked. The admin's only write on this table was DELETE.
--
-- These policies sit *alongside* the Sözcü ones rather than replacing
-- them. Postgres ORs permissive policies together, so the Sözcü keeps
-- exactly the access v2/v5 gave them, and the admin gains a write path
-- that no deadline closes.
--
-- Run this in Supabase SQL editor, AFTER v5. It's idempotent.
--
-- Note: db/sozcel_used_answers_v3_fix_insert_rls.sql drops *every* policy
-- on this table before recreating its own set. If v3 is ever re-run, run
-- v5 and then this file again after it.
-- =====================================================================

-- The admin may write any day's word, at any time. No sozcul_id match
-- (fixing a word doesn't make the admin its Sözcü — the client preserves
-- whoever the row already belonged to) and no deadline: a word that is
-- wrong on the day it is being played is exactly the case that has to be
-- fixable, and that is the one moment every other policy here refuses.
drop policy if exists "sozcel_used_answers insert admin"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers insert admin"
  on public.sozcel_used_answers for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "sozcel_used_answers update admin"
  on public.sozcel_used_answers;
create policy "sozcel_used_answers update admin"
  on public.sozcel_used_answers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Verify: as the admin, this should list the write policies now in force.
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'sozcel_used_answers'
--    order by cmd, policyname;
