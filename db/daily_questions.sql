-- =====================================================================
-- Günün Soruları — the question between two games.
--
-- The three games are a sequence now, and the sequence has questions in
-- it: play Sözcel, answer a question, play Tümcel, answer another, play
-- Bulmaca, answer the last one. The questions are the point of the
-- sequence rather than a garnish on it — they are how the site learns
-- what its members actually think, one small answer at a time, from
-- people who are already here rather than from a survey nobody opens.
--
-- Two tables:
--   daily_questions  — what is asked on a given Istanbul day, and which
--                      game it comes after. Admin-written.
--   question_answers — one row per member per question. Written once,
--                      never edited: this is a record of what somebody
--                      answered that day, not a preference they keep
--                      updating.
--
-- PRIVACY. A member may read **only their own** answers. There is no
-- policy that lets one member read another's, and none that lets anyone
-- enumerate the table — the tally the card prints after you answer comes
-- from question_tally(), a SECURITY DEFINER function that returns two
-- integers and no identities. Kütüphane's news polls show who voted;
-- these do not, because a poll about a news story is a public opinion
-- and these are closer to the member themselves.
--
-- NO DATA, NO GATE. Every gate the client applies is conditional on a
-- question existing for that day (see GATES in game-locks.js): a day the
-- admin left empty behaves exactly as the site did before this file, and
-- the games open normally. A feature that locks the app when its content
-- table is empty is a feature that takes the app down.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.daily_questions (
  id            uuid        primary key default gen_random_uuid(),
  question_date date        not null,
  -- The game this question comes *after*. It is the sequence position:
  -- the next game in the order stays locked until this is answered.
  after_game    text        not null,
  body_tr       text        not null,
  body_en       text,
  option_a_tr   text        not null,
  option_a_en   text,
  option_b_tr   text        not null,
  option_b_en   text,
  created_at    timestamptz not null default now(),
  created_by    uuid        references public.profiles(id) on delete set null,
  constraint daily_questions_after_game_check
    check (after_game in ('sozcel', 'tumcel', 'bulmaca')),
  -- One question per game per day: the sequence has three slots, and a
  -- second question in a slot would have no place to be asked.
  constraint daily_questions_slot_uniq unique (question_date, after_game)
);

create index if not exists daily_questions_date_idx
  on public.daily_questions (question_date);

create table if not exists public.question_answers (
  question_id uuid        not null references public.daily_questions(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  choice      text        not null,
  answered_at timestamptz not null default now(),
  primary key (question_id, user_id),
  constraint question_answers_choice_check check (choice in ('a', 'b'))
);

create index if not exists question_answers_user_idx
  on public.question_answers (user_id);

alter table public.daily_questions enable row level security;
alter table public.question_answers enable row level security;

-- ── Questions: everyone signed in reads them, only the admin writes ──
drop policy if exists "daily_questions read" on public.daily_questions;
create policy "daily_questions read"
  on public.daily_questions for select
  to authenticated
  using (true);

drop policy if exists "daily_questions admin write" on public.daily_questions;
create policy "daily_questions admin write"
  on public.daily_questions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Answers: your own, and the admin's ──
-- The admin can read every answer because collecting them is the whole
-- reason the questions exist; nobody else can read anyone's but their
-- own, and nobody at all can read them as a list of who thinks what.
drop policy if exists "question_answers read own" on public.question_answers;
create policy "question_answers read own"
  on public.question_answers for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Answering is an insert and nothing else. There is deliberately no
-- UPDATE policy: an answer is what you thought when you were asked, and
-- a row that can be rewritten later is not that.
drop policy if exists "question_answers insert own" on public.question_answers;
create policy "question_answers insert own"
  on public.question_answers for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "question_answers delete own" on public.question_answers;
create policy "question_answers delete own"
  on public.question_answers for delete
  to authenticated
  using (public.is_admin());

-- ── The tally ──
-- Two integers, no identities: what the card prints back once you have
-- answered ("of everyone who answered, this many think what you think").
-- SECURITY DEFINER because the rows it counts are exactly the rows the
-- caller is not allowed to read.
create or replace function public.question_tally(p_question_id uuid)
returns table (a_count int, b_count int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*) filter (where choice = 'a')::int,
         count(*) filter (where choice = 'b')::int
  from public.question_answers
  where question_id = p_question_id;
$$;

revoke all on function public.question_tally(uuid) from public;
grant execute on function public.question_tally(uuid) to authenticated;
