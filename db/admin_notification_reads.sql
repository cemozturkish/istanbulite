-- =====================================================================
-- admin_notification_reads — per-user record of admin notifications
-- that a user has already been shown.
--
-- Cross-device gate so that a user who saw a notification on their
-- phone does not see it again on their laptop. Populated client-side
-- when admin-notification.js renders the popup; the localStorage cache
-- still exists as a fast-path but is no longer authoritative.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.admin_notification_reads (
  user_id         uuid        not null references auth.users(id) on delete cascade,
  notification_id uuid        not null references public.admin_notifications(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, notification_id)
);

create index if not exists admin_notification_reads_user_idx
  on public.admin_notification_reads (user_id);

alter table public.admin_notification_reads enable row level security;

-- A user can see only their own read receipts.
drop policy if exists "admin_notification_reads select own" on public.admin_notification_reads;
create policy "admin_notification_reads select own"
  on public.admin_notification_reads for select
  to authenticated
  using (user_id = auth.uid());

-- A user can only mark notifications as read for themselves.
drop policy if exists "admin_notification_reads insert own" on public.admin_notification_reads;
create policy "admin_notification_reads insert own"
  on public.admin_notification_reads for insert
  to authenticated
  with check (user_id = auth.uid());
