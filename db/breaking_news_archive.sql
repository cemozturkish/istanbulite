-- =====================================================================
-- breaking_news.archived_at — lets the admin manually hide a breaking
-- news item from Anahane before its normal 72h auto-expiry (see
-- breaking_news.sql / anahane.html loadBreakingNews, which otherwise
-- only hides rows once `updated_at` falls outside the 3-day window).
-- Setting archived_at removes the row from the public feed immediately;
-- clearing it (back to null) un-archives so it reappears if still
-- inside the 72h window.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.breaking_news
  add column if not exists archived_at timestamptz;

create index if not exists breaking_news_archived_at_idx
  on public.breaking_news (archived_at);
