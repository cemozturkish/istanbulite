-- =====================================================================
-- 2-option polls on breaking_news items. Admin sets a question and both
-- option labels when posting (or leaves all three blank for no poll).
-- One vote per user, locked once cast (no changing/removing a vote).
-- Votes are readable by all authenticated users so result bars can be
-- computed client-side.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.breaking_news
  add column if not exists poll_question text,
  add column if not exists poll_option_a text,
  add column if not exists poll_option_b text;

create table if not exists public.breaking_news_poll_votes (
  news_id uuid not null references public.breaking_news(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option smallint not null check (option in (1, 2)),
  created_at timestamptz not null default now(),
  primary key (news_id, user_id)
);

create index if not exists breaking_news_poll_votes_news_id_idx
  on public.breaking_news_poll_votes (news_id);

alter table public.breaking_news_poll_votes enable row level security;

drop policy if exists "breaking_news_poll_votes read for authenticated" on public.breaking_news_poll_votes;
create policy "breaking_news_poll_votes read for authenticated"
  on public.breaking_news_poll_votes for select
  to authenticated
  using (true);

drop policy if exists "breaking_news_poll_votes insert own" on public.breaking_news_poll_votes;
create policy "breaking_news_poll_votes insert own"
  on public.breaking_news_poll_votes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "breaking_news_poll_votes delete admin" on public.breaking_news_poll_votes;
create policy "breaking_news_poll_votes delete admin"
  on public.breaking_news_poll_votes for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
