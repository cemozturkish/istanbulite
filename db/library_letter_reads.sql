-- =====================================================================
-- library_letter_reads — per-user record of the letters a member has
-- already opened in Posta Kutusu.
--
-- What it drives is the red count on the Posta Kutusu box: the box wears
-- the number of letters this member has never opened, and a letter drops
-- out of that count the moment they open it. Kept server-side rather than
-- in localStorage precisely because the count is a claim about the
-- person, not about the device -- a letter read on the phone must not
-- still be waiting on the laptop.
--
-- Modelled on admin_notification_reads, which does the same job for the
-- admin popup.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

create table if not exists public.library_letter_reads (
  user_id   uuid        not null references auth.users(id) on delete cascade,
  letter_id uuid        not null references public.library_letters(id) on delete cascade,
  read_at   timestamptz not null default now(),
  primary key (user_id, letter_id)
);

create index if not exists library_letter_reads_user_idx
  on public.library_letter_reads (user_id);

alter table public.library_letter_reads enable row level security;

-- A member can see only their own read receipts. There is no reading of
-- anyone else's: who read which letter is nobody's business but theirs.
drop policy if exists "library_letter_reads select own" on public.library_letter_reads;
create policy "library_letter_reads select own"
  on public.library_letter_reads for select
  to authenticated
  using (user_id = auth.uid());

-- A member can only mark a letter read for themselves.
drop policy if exists "library_letter_reads insert own" on public.library_letter_reads;
create policy "library_letter_reads insert own"
  on public.library_letter_reads for insert
  to authenticated
  with check (user_id = auth.uid());

-- Deleting your own receipt is how a letter goes back to unread.
drop policy if exists "library_letter_reads delete own" on public.library_letter_reads;
create policy "library_letter_reads delete own"
  on public.library_letter_reads for delete
  to authenticated
  using (user_id = auth.uid());
