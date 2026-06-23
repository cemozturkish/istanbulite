-- Onboarding columns on profiles.
-- onboarded_at: null until the user finishes the welcome flow; set to now() on completion.
-- palette_pref: 'mono' (black/white edgy) or 'earth' (beige/brown warm).
-- mascot: 'cat' (paired with mono) or 'dog' (paired with earth) — picked implicitly by palette.

alter table public.profiles
  add column if not exists onboarded_at timestamptz,
  add column if not exists palette_pref text check (palette_pref in ('mono','earth')),
  add column if not exists mascot text check (mascot in ('cat','dog'));

-- The existing protect_profile_columns trigger does NOT touch these new columns,
-- so the standard "users update their own row" RLS policy already lets the user write them.
