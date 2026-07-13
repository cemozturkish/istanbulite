-- =====================================================================
-- Kütüphane v6 — cover images for articles.
--
-- Adds library_articles.image_url and a public Storage bucket
-- (article-images) the Editorial Desk uploads cover photos to. Reads
-- are public (images are served straight from the CDN URL); writes are
-- admin-only, matching every other admin-gated policy in this repo.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.library_articles
  add column if not exists image_url text;

-- ── Storage bucket ───────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('article-images', 'article-images', true)
on conflict (id) do nothing;

drop policy if exists "article-images public read" on storage.objects;
create policy "article-images public read"
  on storage.objects for select
  to public
  using (bucket_id = 'article-images');

drop policy if exists "article-images admin insert" on storage.objects;
create policy "article-images admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'article-images' and (auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "article-images admin update" on storage.objects;
create policy "article-images admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'article-images' and (auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check (bucket_id = 'article-images' and (auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "article-images admin delete" on storage.objects;
create policy "article-images admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'article-images' and (auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
