-- =====================================================================
-- Kütüphane v7 — inline page images, replacing the v6 cover image.
--
-- Photos belong inside the article/chapter pages themselves, not as a
-- single cover thumbnail. The Editorial Desk now inserts images as
-- [[img::URL]] tokens directly in a page's body text (same pattern as
-- the existing [[vote::...]] and [[word::definition]] tokens), so the
-- v6 image_url column is no longer used.
--
-- The article-images Storage bucket and its policies (created in v6)
-- are unchanged and still used for uploads — only the column goes away.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.library_articles
  drop column if exists image_url;
