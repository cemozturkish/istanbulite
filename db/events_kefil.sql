-- =====================================================================
-- events.kefil_id — ETKİNLİK KEFİLİ: the member who vouches for an event.
--
-- A kefil already means one thing on this site: the existing member who
-- vouches for a newcomer (profiles.referred_by). This is the same word
-- applied to an evening — an Istanbulite puts their name behind it, and
-- the event page prints it on its head ("ETKİNLİK KEFİLİ: BAKIRKÖY'DEN
-- CEM"). How many events a member has vouched for is counted on their
-- profile, the way "Kefil Olduğu" counts the people they vouched for.
-- Later, ratings from the people who went can hang off this column.
--
-- Assigned by the admin only (events are admin-written; the existing
-- update policy already covers the new column). Nullable: most events
-- carry no kefil, and a member who deletes their account simply stops
-- being one rather than taking the event with them.
--
-- Run in Supabase SQL editor after db/baski_v1.sql. Idempotent.
-- =====================================================================

alter table public.events
  add column if not exists kefil_id uuid references public.profiles(id) on delete set null;

create index if not exists events_kefil_id_idx
  on public.events (kefil_id)
  where kefil_id is not null;
