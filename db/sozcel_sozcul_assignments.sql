-- Migration: Sözcü Assignment System for Sözcel
-- Run this in your Supabase SQL Editor before deploying the updated admin.html and sozcel.html.

CREATE TABLE IF NOT EXISTS public.sozcel_sozcul_assignments (
  game_date   date        PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sozcel_sozcul_assignments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read assignments (needed to show "Günün Sözcülü" and check own assignments)
CREATE POLICY "Authenticated users can view sozcel_sozcul_assignments"
  ON public.sozcel_sozcul_assignments
  FOR SELECT TO authenticated USING (true);

-- Only admin can create / update / delete assignments
CREATE POLICY "Admin can manage sozcel_sozcul_assignments"
  ON public.sozcel_sozcul_assignments
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
