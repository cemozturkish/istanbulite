-- =====================================================================
-- library_articles: add author + published_at
-- library_article_comments: per-article threaded comments (1 level)
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.library_articles
  add column if not exists author text;

alter table public.library_articles
  add column if not exists published_at timestamptz;

-- Comments on library articles.
create table if not exists public.library_article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.library_articles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists library_article_comments_article_created_idx
  on public.library_article_comments (article_id, created_at);

alter table public.library_article_comments enable row level security;

-- Any signed-in member may read comments.
drop policy if exists "library_article_comments read for authenticated"
  on public.library_article_comments;
create policy "library_article_comments read for authenticated"
  on public.library_article_comments for select
  to authenticated
  using (true);

-- A user may post comments only as themselves.
drop policy if exists "library_article_comments insert own"
  on public.library_article_comments;
create policy "library_article_comments insert own"
  on public.library_article_comments for insert
  to authenticated
  with check (author_id = auth.uid());

-- Users may delete their own comments; admin may delete any.
drop policy if exists "library_article_comments delete own or admin"
  on public.library_article_comments;
create policy "library_article_comments delete own or admin"
  on public.library_article_comments for delete
  to authenticated
  using (
    author_id = auth.uid()
    or (auth.jwt() ->> 'email') = 'cemwozturk@gmail.com'
  );

-- No edits from clients. Admin can update if needed.
drop policy if exists "library_article_comments update admin"
  on public.library_article_comments;
create policy "library_article_comments update admin"
  on public.library_article_comments for update
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
