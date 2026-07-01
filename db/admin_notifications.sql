-- =====================================================================
-- admin_notifications — one-shot mascot messages posted by the admin.
--
-- The admin posts a message; every logged-in user sees the most-recent
-- active notification once, dismissed with a tap. The "seen once" state
-- is kept client-side in localStorage keyed by notification id, so no
-- per-user write table is needed.
--
-- body    — Turkish text, always required.
-- body_en — Optional English alternative. Users on more_english see it
--           when set; empty/null falls back to body.
--
-- active=false hides a notification without deleting it.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.admin_notifications (
  id         uuid        primary key default gen_random_uuid(),
  body       text        not null check (char_length(body) between 1 and 500),
  body_en    text        check (body_en is null or char_length(body_en) between 1 and 500),
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

-- Idempotent add for databases that already ran the earlier version.
alter table public.admin_notifications
  add column if not exists body_en text
    check (body_en is null or char_length(body_en) between 1 and 500);

create index if not exists admin_notifications_active_created_idx
  on public.admin_notifications (active, created_at desc);

alter table public.admin_notifications enable row level security;

drop policy if exists "admin_notifications read for authenticated" on public.admin_notifications;
create policy "admin_notifications read for authenticated"
  on public.admin_notifications for select
  to authenticated
  using (true);

drop policy if exists "admin_notifications insert admin" on public.admin_notifications;
create policy "admin_notifications insert admin"
  on public.admin_notifications for insert
  to authenticated
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "admin_notifications update admin" on public.admin_notifications;
create policy "admin_notifications update admin"
  on public.admin_notifications for update
  to authenticated
  using  ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');

drop policy if exists "admin_notifications delete admin" on public.admin_notifications;
create policy "admin_notifications delete admin"
  on public.admin_notifications for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'cemwozturk@gmail.com');
