-- =====================================================================
-- Add new Kütüphane sources + per-user article reactions (like/dislike)
--
-- Run in Supabase SQL editor. Idempotent where possible. The check
-- constraint is dropped and recreated to add the new source values.
-- =====================================================================

alter table public.library_articles
  drop constraint if exists library_articles_source_check;
alter table public.library_articles
  add constraint library_articles_source_check check (
    source in (
      'economist',
      'nytimes',
      'ft',
      'codastory',
      'european_correspondent',
      'telegraph',
      'aljazeera'
    )
  );

-- Reactions: one row per (article, user). reaction = 'like' or 'dislike'.
-- Switching reaction = update; toggling off = delete.
create table if not exists public.library_article_reactions (
  article_id uuid not null references public.library_articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('like','dislike')),
  created_at timestamptz not null default now(),
  primary key (article_id, user_id)
);

create index if not exists library_article_reactions_article_idx
  on public.library_article_reactions (article_id);

alter table public.library_article_reactions enable row level security;

drop policy if exists "library_article_reactions read for authenticated"
  on public.library_article_reactions;
create policy "library_article_reactions read for authenticated"
  on public.library_article_reactions for select
  to authenticated
  using (true);

drop policy if exists "library_article_reactions insert own"
  on public.library_article_reactions;
create policy "library_article_reactions insert own"
  on public.library_article_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "library_article_reactions update own"
  on public.library_article_reactions;
create policy "library_article_reactions update own"
  on public.library_article_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "library_article_reactions delete own"
  on public.library_article_reactions;
create policy "library_article_reactions delete own"
  on public.library_article_reactions for delete
  to authenticated
  using (user_id = auth.uid());
