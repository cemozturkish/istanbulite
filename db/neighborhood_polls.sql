-- =====================================================================
-- İlçe Anketleri — district polls behind Kütüphane's ANKET box.
--
-- A question with two options, answered once per member. What makes this
-- different from daily_questions (the joints between the three games) and
-- breaking_news_polls (a reaction to one story) is what the answer is
-- FOR: every vote is filed under the member's own district, so the result
-- is not one citywide percentage but 25 of them — how Beşiktaş answered,
-- how Üsküdar answered. That per-district split is meant to color the
-- districts on the Istanbul map, the way a live election map does: mix
-- each poll's own color_a/color_b by that district's own a/b split. There
-- is no such map drawn yet (project.html's İstanbul at slide 12 is still a
-- flat painted frame, not a traced, paintable one — see CLAUDE.md's "The
-- zoom is DRAWN, not computed") — neighborhood_poll_results() is written
-- so that whenever one exists, coloring it is a read of this function and
-- nothing more. Until then the same numbers print as a plain list.
--
-- Two tables:
--   neighborhood_polls       — the question and its two options, plus the
--                               two colors a future map mixes between.
--                               Admin-written, from the "İlçe Anketleri"
--                               tab.
--   neighborhood_poll_votes  — one row per member per poll, filed under
--                               the district they lived in when they
--                               voted. Insert-only, like question_answers:
--                               an answer is what you thought when you
--                               were asked, not a preference you keep
--                               updating.
--
-- PRIVACY. Same stance as daily_questions: a member reads only their own
-- vote (and the admin reads all of them), never another member's by name.
-- The per-district breakdown a future map or this poll's own result view
-- needs comes from neighborhood_poll_results(), a SECURITY DEFINER
-- function that returns counts per district and no identities.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.neighborhood_polls (
  id            uuid        primary key default gen_random_uuid(),
  question_tr   text        not null,
  question_en   text,
  option_a_tr   text        not null,
  option_a_en   text,
  option_b_tr   text        not null,
  option_b_en   text,
  -- What a future map mixes between for a district, by its own a/b split.
  -- Defaulted to the site's one red and its ink, so a poll entered without
  -- picking colors still comes out looking like the rest of the site.
  color_a       text        not null default '#b93631',
  color_b       text        not null default '#2b2b2b',
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  created_by    uuid        references public.profiles(id) on delete set null
);

create index if not exists neighborhood_polls_active_idx
  on public.neighborhood_polls (active, created_at desc);

create table if not exists public.neighborhood_poll_votes (
  poll_id      uuid        not null references public.neighborhood_polls(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  -- Filed under the district the member was in when they voted, which is
  -- the whole point of this table over question_answers: this is what a
  -- future map colors by.
  neighborhood text        not null references public.neighborhoods(id),
  choice       text        not null,
  created_at   timestamptz not null default now(),
  primary key (poll_id, user_id),
  constraint neighborhood_poll_votes_choice_check check (choice in ('a', 'b'))
);

create index if not exists neighborhood_poll_votes_poll_idx
  on public.neighborhood_poll_votes (poll_id);

alter table public.neighborhood_polls enable row level security;
alter table public.neighborhood_poll_votes enable row level security;

-- ── Polls: everyone signed in reads them, only the admin writes ──
drop policy if exists "neighborhood_polls read" on public.neighborhood_polls;
create policy "neighborhood_polls read"
  on public.neighborhood_polls for select
  to authenticated
  using (true);

drop policy if exists "neighborhood_polls admin write" on public.neighborhood_polls;
create policy "neighborhood_polls admin write"
  on public.neighborhood_polls for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Votes: your own, and the admin's ──
-- Nobody may read another member's vote, and nobody may enumerate the
-- table as a list of who chose what -- see neighborhood_poll_results()
-- below for the aggregate a district's color would actually be read from.
drop policy if exists "neighborhood_poll_votes read own" on public.neighborhood_poll_votes;
create policy "neighborhood_poll_votes read own"
  on public.neighborhood_poll_votes for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Voting is an insert and nothing else -- deliberately no UPDATE policy,
-- matching question_answers: a vote is what you thought when you were
-- asked. The neighborhood has to match the caller's OWN profile row, not
-- whatever the client sends, since a false district would quietly corrupt
-- the very map this data exists to color.
drop policy if exists "neighborhood_poll_votes insert own" on public.neighborhood_poll_votes;
create policy "neighborhood_poll_votes insert own"
  on public.neighborhood_poll_votes for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and neighborhood = (select p.neighborhood from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "neighborhood_poll_votes delete admin" on public.neighborhood_poll_votes;
create policy "neighborhood_poll_votes delete admin"
  on public.neighborhood_poll_votes for delete
  to authenticated
  using (public.is_admin());

-- ── The per-district breakdown ──
-- Every district is returned, even one with no votes yet (the left join),
-- because a future map needs a color for all 25 of them, not just the
-- ones somebody has answered from -- and istanbul_disi isn't a district
-- this app colors. SECURITY DEFINER because the rows behind these counts
-- are exactly the rows the caller is not allowed to read one at a time.
create or replace function public.neighborhood_poll_results(p_poll_id uuid)
returns table (neighborhood text, a_count int, b_count int)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select n.id,
         count(v.user_id) filter (where v.choice = 'a')::int,
         count(v.user_id) filter (where v.choice = 'b')::int
  from public.neighborhoods n
  left join public.neighborhood_poll_votes v
    on v.neighborhood = n.id and v.poll_id = p_poll_id
  where n.id <> 'istanbul_disi'
  group by n.id;
$$;

revoke all on function public.neighborhood_poll_results(uuid) from public;
grant execute on function public.neighborhood_poll_results(uuid) to authenticated;
