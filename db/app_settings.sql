-- =====================================================================
-- app_settings — generic admin-managed key/value feature toggle table.
--
-- First (and currently only) row: ('onboarding_enabled', true) — the
-- global on/off switch for the new-account onboarding flow (onboarding.js).
-- When false, IstOnboarding.maybeRun() no-ops for everyone instead of
-- running the welcome/tour flow. Managed from admin.html's Users tab.
--
-- Run this in Supabase SQL editor. It's idempotent.
-- =====================================================================

create table if not exists public.app_settings (
  key         text primary key,
  value       boolean not null,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('onboarding_enabled', true)
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

-- All authenticated members can read (every page checks onboarding_enabled).
drop policy if exists "app_settings read for authenticated" on public.app_settings;
create policy "app_settings read for authenticated"
  on public.app_settings for select
  to authenticated
  using (true);

-- Only admin manages settings.
drop policy if exists "app_settings admin manage" on public.app_settings;
create policy "app_settings admin manage"
  on public.app_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
