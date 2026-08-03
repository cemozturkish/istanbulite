-- =====================================================================
-- Kütüphane v8 — library_articles.source is actually optional now.
--
-- library_categories_v4.sql dropped the old 3-value CHECK constraint on
-- `source` ("admin can pick any string (or none) without a migration")
-- but never dropped the NOT NULL constraint that shipped alongside it in
-- library_articles.sql — so leaving the admin form's "Source / Byline
-- (optional)" field blank still hit a NOT NULL violation on insert.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

alter table public.library_articles alter column source drop not null;
