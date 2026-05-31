-- =====================================================================
-- Kütüphane v5 — six fixed shelves with countdown deadlines.
--
-- The Kütüphane is reshaped into a Duolingo-flavoured reading lobby. Six
-- shelves (positions 1–6) live in the right column; each one is a
-- limited-time "exhibition" with its own deadline and admin-chosen name.
-- Articles are filed under exactly one shelf and may carry their own
-- per-article read-by deadline.
--
-- New article structure supports section checkpoints (split by `---` on
-- its own line) and inline vocab tooltips (`[[word::definition]]`) — the
-- body text encodes both so the reader just parses on render. An optional
-- `poll` jsonb shape is `{ question: text, options: [text, ...] }`.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- ── library_shelves: the six fixed slots ────────────────────────────
create table if not exists public.library_shelves (
  id integer primary key check (id between 1 and 6),
  name_tr text not null default '',
  subtitle_tr text not null default '',
  deadline timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.library_shelves_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists library_shelves_set_updated_at on public.library_shelves;
create trigger library_shelves_set_updated_at
  before update on public.library_shelves
  for each row execute function public.library_shelves_set_updated_at();

-- Seed the six fixed rows. Names start empty; the admin fills them in.
insert into public.library_shelves (id) values (1), (2), (3), (4), (5), (6)
on conflict (id) do nothing;

alter table public.library_shelves enable row level security;

drop policy if exists "library_shelves read for authenticated" on public.library_shelves;
create policy "library_shelves read for authenticated"
  on public.library_shelves for select to authenticated using (true);

drop policy if exists "library_shelves update admin" on public.library_shelves;
create policy "library_shelves update admin"
  on public.library_shelves for update to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- Inserts/deletes locked down — six rows is the whole world for this table.
drop policy if exists "library_shelves insert admin" on public.library_shelves;
create policy "library_shelves insert admin"
  on public.library_shelves for insert to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "library_shelves delete admin" on public.library_shelves;
create policy "library_shelves delete admin"
  on public.library_shelves for delete to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

-- ── library_articles: shelf binding, deadline, poll ─────────────────
alter table public.library_articles
  add column if not exists shelf_id integer references public.library_shelves(id) on delete set null,
  add column if not exists deadline timestamptz,
  add column if not exists poll jsonb;

create index if not exists library_articles_shelf_position_idx
  on public.library_articles (shelf_id, position);

-- ── library_article_poll_votes: one row per (article, user) ─────────
-- Records which option each user picked so they see results after voting
-- and can switch choice. `option_index` references the article's poll.options array.
create table if not exists public.library_article_poll_votes (
  article_id uuid not null references public.library_articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists library_article_poll_votes_article_idx
  on public.library_article_poll_votes (article_id);

alter table public.library_article_poll_votes enable row level security;

drop policy if exists "poll_votes read for authenticated" on public.library_article_poll_votes;
create policy "poll_votes read for authenticated"
  on public.library_article_poll_votes for select to authenticated using (true);

drop policy if exists "poll_votes insert own" on public.library_article_poll_votes;
create policy "poll_votes insert own"
  on public.library_article_poll_votes for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "poll_votes update own" on public.library_article_poll_votes;
create policy "poll_votes update own"
  on public.library_article_poll_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "poll_votes delete own" on public.library_article_poll_votes;
create policy "poll_votes delete own"
  on public.library_article_poll_votes for delete to authenticated
  using (user_id = auth.uid());
