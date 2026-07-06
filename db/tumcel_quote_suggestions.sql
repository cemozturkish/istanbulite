-- Migration: Tümcel quote suggestions ("Alıntı Öner")
-- Run this in your Supabase SQL Editor.
--
-- This table was referenced by tumcel.html and admin.html since
-- b54bdc9 ("Tümcel: member quote suggestions feed the daily puzzle")
-- but no CREATE TABLE was ever provided to run against Supabase, so
-- the table has never existed — the admin's "Öneriden seç" dropdown
-- has always come back empty because the query silently fails.

CREATE TABLE IF NOT EXISTS public.tumcel_quote_suggestions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  body         text        NOT NULL,
  source       text        NOT NULL,
  suggested_by uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggested_at timestamptz NOT NULL DEFAULT now(),
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked')),
  UNIQUE (body)
);

ALTER TABLE public.tumcel_quote_suggestions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (needed to show pending suggestions
-- in the admin picker and to check global body uniqueness on submit).
CREATE POLICY "Authenticated users can view tumcel_quote_suggestions"
  ON public.tumcel_quote_suggestions
  FOR SELECT TO authenticated USING (true);

-- Members insert their own suggestion.
CREATE POLICY "Members can insert own tumcel_quote_suggestions"
  ON public.tumcel_quote_suggestions
  FOR INSERT TO authenticated WITH CHECK (suggested_by = auth.uid());

-- Members can delete (Vazgeç) their own pending suggestion.
CREATE POLICY "Members can delete own tumcel_quote_suggestions"
  ON public.tumcel_quote_suggestions
  FOR DELETE TO authenticated USING (suggested_by = auth.uid());

-- Only admin flips a suggestion to 'picked' when saving a puzzle.
CREATE POLICY "Admin can update tumcel_quote_suggestions"
  ON public.tumcel_quote_suggestions
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
