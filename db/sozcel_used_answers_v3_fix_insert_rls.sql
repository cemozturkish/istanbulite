-- =====================================================================
-- sozcel_used_answers v3 — fixes an assigned Sözcü getting "new row
-- violates row-level security policy (USING expression) for table
-- sozcel_used_answers" when submitting their day's word.
--
-- That specific error text only comes from Postgres when a policy
-- applicable to INSERT has a USING clause but no WITH CHECK clause —
-- Postgres then falls back to using USING as the check. Neither policy
-- in sozcel_used_answers.sql / sozcel_used_answers_v2.sql does that
-- (insert is "with check (true)"; update has both clauses explicit),
-- so the live table must have picked up an extra ad-hoc policy outside
-- of these migration files, same as sozcul_id/definition once did.
--
-- This drops every existing policy on the table (whatever its name)
-- and recreates the intended set from scratch with explicit WITH CHECK
-- on every write policy, so no USING-only ambiguity can creep back in.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'sozcel_used_answers'
  loop
    execute format('drop policy if exists %I on public.sozcel_used_answers', pol.policyname);
  end loop;
end $$;

-- Authenticated users may read all rows (needed so each client can
-- compute the same daily target and exclude already-used words).
create policy "sozcel_used_answers read for authenticated"
  on public.sozcel_used_answers for select
  to authenticated
  using (true);

-- Any authenticated user may insert today's pick (the deterministic
-- random-pick flow) or an assigned Sözcü's chosen word. The primary
-- key on used_on and unique index on word guard against duplicates.
create policy "sozcel_used_answers insert authenticated"
  on public.sozcel_used_answers for insert
  to authenticated
  with check (true);

-- The assigned Sözcü may update their own day's word/definition freely
-- until its deadline (midnight Istanbul, i.e. UTC-3h, at the start of
-- used_on) passes. After that the row is locked.
create policy "sozcel_used_answers update own before deadline"
  on public.sozcel_used_answers for update
  to authenticated
  using (
    sozcul_id = auth.uid()
    and now() < (used_on::timestamp at time zone 'utc') - interval '3 hours'
  )
  with check (
    sozcul_id = auth.uid()
    and now() < (used_on::timestamp at time zone 'utc') - interval '3 hours'
  );

-- Only admin can clear entries (e.g. to start the cycle over).
create policy "sozcel_used_answers delete admin"
  on public.sozcel_used_answers for delete
  to authenticated
  using (public.is_admin());
