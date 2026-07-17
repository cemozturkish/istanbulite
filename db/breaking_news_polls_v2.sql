-- =====================================================================
-- breaking_news_polls v2 — supports multiple 2-option polls on the same
-- breaking news story. Previously a single poll lived directly on
-- breaking_news (poll_question/poll_option_a/poll_option_b) and votes
-- were keyed by (news_id, user_id), which capped a story at one poll
-- ever. Polls now live in their own table, one row per poll, added and
-- removed the same way breaking_news_sources are. Votes are keyed by
-- (poll_id, user_id) so a member can vote in every poll on a story, not
-- just one.
--
-- This migrates any existing embedded poll + its votes into the new
-- tables, then drops the old embedded-poll columns and vote table. Safe
-- to run more than once (the migration step no-ops once the old columns
-- are gone).
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.breaking_news_polls (
  id uuid primary key default gen_random_uuid(),
  news_id uuid not null references public.breaking_news(id) on delete cascade,
  question text not null,
  option_a text not null,
  option_b text not null,
  created_at timestamptz not null default now()
);

create index if not exists breaking_news_polls_news_id_idx
  on public.breaking_news_polls (news_id, created_at);

alter table public.breaking_news_polls enable row level security;

drop policy if exists "breaking_news_polls read for authenticated" on public.breaking_news_polls;
create policy "breaking_news_polls read for authenticated"
  on public.breaking_news_polls for select
  to authenticated
  using (true);

drop policy if exists "breaking_news_polls insert admin" on public.breaking_news_polls;
create policy "breaking_news_polls insert admin"
  on public.breaking_news_polls for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_polls update admin" on public.breaking_news_polls;
create policy "breaking_news_polls update admin"
  on public.breaking_news_polls for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "breaking_news_polls delete admin" on public.breaking_news_polls;
create policy "breaking_news_polls delete admin"
  on public.breaking_news_polls for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- One vote per user per poll (not per story — a member can now vote in
-- several polls on the same breaking news item).
create table if not exists public.breaking_news_poll_option_votes (
  poll_id uuid not null references public.breaking_news_polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option smallint not null check (option in (1, 2)),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index if not exists breaking_news_poll_option_votes_poll_id_idx
  on public.breaking_news_poll_option_votes (poll_id);

alter table public.breaking_news_poll_option_votes enable row level security;

drop policy if exists "breaking_news_poll_option_votes read for authenticated" on public.breaking_news_poll_option_votes;
create policy "breaking_news_poll_option_votes read for authenticated"
  on public.breaking_news_poll_option_votes for select
  to authenticated
  using (true);

drop policy if exists "breaking_news_poll_option_votes insert own" on public.breaking_news_poll_option_votes;
create policy "breaking_news_poll_option_votes insert own"
  on public.breaking_news_poll_option_votes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "breaking_news_poll_option_votes delete admin" on public.breaking_news_poll_option_votes;
create policy "breaking_news_poll_option_votes delete admin"
  on public.breaking_news_poll_option_votes for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- Fold any pre-existing embedded poll (breaking_news.poll_question, etc.)
-- into a row in breaking_news_polls, carrying its votes along. Guarded on
-- the old column still existing so re-running this file after the drop
-- below is a no-op instead of an error.
do $$
declare
  r record;
  new_poll_id uuid;
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'breaking_news' and column_name = 'poll_question'
  ) then
    for r in
      select bn.id, bn.poll_question, bn.poll_option_a, bn.poll_option_b, bn.created_at
      from public.breaking_news bn
      where bn.poll_question is not null
        and bn.poll_option_a is not null
        and bn.poll_option_b is not null
        and not exists (select 1 from public.breaking_news_polls p where p.news_id = bn.id)
    loop
      insert into public.breaking_news_polls (news_id, question, option_a, option_b, created_at)
      values (r.id, r.poll_question, r.poll_option_a, r.poll_option_b, r.created_at)
      returning id into new_poll_id;

      insert into public.breaking_news_poll_option_votes (poll_id, user_id, option, created_at)
      select new_poll_id, v.user_id, v.option, v.created_at
      from public.breaking_news_poll_votes v
      where v.news_id = r.id
      on conflict do nothing;
    end loop;
  end if;
end $$;

-- Old embedded-poll storage is now fully superseded by breaking_news_polls.
drop table if exists public.breaking_news_poll_votes;

alter table public.breaking_news
  drop column if exists poll_question,
  drop column if exists poll_option_a,
  drop column if exists poll_option_b;
