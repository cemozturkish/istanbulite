-- Migration: Tümcel daily puzzles
-- Run this in your Supabase SQL Editor.
--
-- This table was referenced by tumcel.html and admin.html since
-- 9df158c ("Add Tümcel game: sentence fragment puzzle replacing
-- Bağlantılar"), whose commit message noted it as a required table,
-- but no CREATE TABLE was ever actually run against Supabase — hence
-- "Could not find the table 'public.tumcel_puzzles' in the schema
-- cache" when saving a puzzle from the admin panel.

CREATE TABLE IF NOT EXISTS public.tumcel_puzzles (
  puzzle_date date PRIMARY KEY,
  quotes      jsonb NOT NULL
);

ALTER TABLE public.tumcel_puzzles ENABLE ROW LEVEL SECURITY;

-- All authenticated members can read (needed to load the daily puzzle
-- and to look up a member's past tümcül credits).
CREATE POLICY "Authenticated users can view tumcel_puzzles"
  ON public.tumcel_puzzles
  FOR SELECT TO authenticated USING (true);

-- Only admin creates/edits/deletes puzzles.
CREATE POLICY "Admin can manage tumcel_puzzles"
  ON public.tumcel_puzzles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
