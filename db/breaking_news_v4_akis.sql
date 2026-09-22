-- =====================================================================
-- breaking_news v4 — TWO EDITIONS A DAY, and the AKIŞ the reader stays in.
--
-- Two changes, and they are the same change seen from the two ends of
-- the paper: the admin can now print twice a day, and the reader can now
-- say which developing story they want to keep receiving.
--
-- 1. THE EDITION HAS A HALF (`edition_half`). Until now an edition was a
--    DATE and nothing else, so the sabah postası and the akşam gazetesi
--    of one day were the same pile: everything curated for the evening
--    was already standing in the reader's column at breakfast, and there
--    was no way for the admin to hold a story back for the second paper.
--    The two words are `ist-date.js`'s OWN ('gun' / 'gece', from
--    editionKey()), never a third vocabulary for the same sun — which
--    also means a night is named for the day it BEGAN on here too, so a
--    story curated at 01:00 in December belongs to the evening before.
--
--    Rows written before this migration become 'gun': they predate the
--    split and were visible from the morning, so the morning paper is
--    the reading that changes nothing for them.
--
-- 2. THE EDITIONS ACCRETE, so the reader needs an AKIŞ (news_series_verdict).
--    A new edition no longer REPLACES the one before it — it stacks on
--    top, and a story stays in the column until the reader throws it away
--    or it ages past 'evvelsi gün'. Which leaves one question the app
--    could not previously ask: when the same developing thing produces a
--    second haber days later, who still wants it?
--
--    That is what `breaking_news_series` has been for since it was added,
--    and this is the first time it does anything for a reader. A throw
--    to the RIGHT (AKIŞTA KAL) is `follow = true`; a throw to the LEFT
--    (YETER) is `follow = false` and every later haber in that seri is
--    filtered out of that reader's column for good.
--
--    Note what is NOT here: there is no delivery mechanism, because none
--    is needed. A later haber in a seri is an ordinary story in an
--    ordinary edition that everyone in the window is shown anyway. The
--    only thing a verdict can do is take one AWAY. Following is the
--    default and the right throw merely records it — which is what keeps
--    "writing is not publishing" intact: nothing here lets a story reach
--    a reader without the admin putting it on the paper.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ── 1. The half ──
alter table public.breaking_news
  add column if not exists edition_half text not null default 'gun';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'breaking_news_edition_half_chk'
  ) then
    alter table public.breaking_news
      add constraint breaking_news_edition_half_chk
      check (edition_half in ('gun', 'gece'));
  end if;
end $$;

-- The feed reads a WINDOW of editions now (three days of them), newest
-- first, so the half and the date are one sort key and the old index no
-- longer covers it.
create index if not exists breaking_news_edition_window_idx
  on public.breaking_news (edition_date, edition_half, category, edition_order);

-- `news_current_edition` is deliberately LEFT ALONE. It still answers
-- what it always answered — the newest edition_date at or before a given
-- day — and the admin's own press bar still resolves against it. The
-- reader's column no longer calls it at all: it asks for a three-day
-- window rather than a single edition, so there is nothing for a "which
-- one edition is current" resolver to tell it.

-- ── 2. The reader's verdict on an akış ──
create table if not exists public.news_series_verdict (
  user_id    uuid not null references auth.users(id) on delete cascade,
  series_id  uuid not null references public.breaking_news_series(id) on delete cascade,
  follow     boolean not null,
  decided_at timestamptz not null default now(),
  primary key (user_id, series_id)
);

alter table public.news_series_verdict enable row level security;

-- Deliberately NOT insert-only, unlike question_answers and
-- neighborhood_poll_votes. Those record what somebody THOUGHT when they
-- were asked, and a row that can be rewritten later is not that. This is
-- not an opinion — it is a standing preference about what the app may go
-- on handing them, and a preference you cannot change is a trap. So the
-- verdict is upserted, and throwing a later haber in the same seri the
-- other way reverses it.
drop policy if exists "own verdict select" on public.news_series_verdict;
create policy "own verdict select" on public.news_series_verdict
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own verdict insert" on public.news_series_verdict;
create policy "own verdict insert" on public.news_series_verdict
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own verdict update" on public.news_series_verdict;
create policy "own verdict update" on public.news_series_verdict
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own verdict delete" on public.news_series_verdict;
create policy "own verdict delete" on public.news_series_verdict
  for delete to authenticated using (user_id = auth.uid());

-- A member reads their OWN rows and nobody else's -- and there is no
-- admin policy here at all, which is the one place this table diverges
-- from question_answers (author + admin). A mute list is not an opinion
-- somebody offered, it is the record of what a member refuses to hear
-- about, and that is precisely the kind of thing this app promises not
-- to keep on anybody (see "No DMs -- ever" in CLAUDE.md: it does not
-- need to interpret your data or use it against your future endeavors).
-- Nothing on the site aggregates it, so nothing needs to read it.
