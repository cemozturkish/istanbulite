-- =====================================================================
-- hive_slots v2 — the code week turns over on Sunday, not Monday.
--
-- v1 took its week from date_trunc('week', …), which is Monday-based in
-- Postgres, matching the profile's weekly game grid. The hane code is not
-- that kind of week: it is the rhythm of seeing people, and that week
-- turns over on Sunday. Everything else about the exchange is unchanged
-- — one code per member per week, only the live week's codes resolve, a
-- placement still stands for 7 days from the moment it is made.
--
-- The turnover is the only thing this file changes; hive_my_code(),
-- hive_claim_code() and the tables all read the week through this one
-- function, so redefining it is the whole migration.
--
-- Codes already issued under the Monday key are simply not this week's
-- codes anymore, so every member is handed a fresh one the next time
-- they open their honeycomb — which is what "the codes renew" means.
-- Nothing has to be deleted for that; the old rows just stop resolving.
-- Placements are untouched: they carry their own expires_at.
--
-- Run in Supabase SQL editor, after db/hive_slots.sql. Idempotent.
-- =====================================================================

-- The Sunday on or before today, Istanbul time. extract(dow) is 0 on
-- Sunday, so subtracting it walks back to the start of the week — no
-- date_trunc, which has Monday baked in and cannot be told otherwise.
create or replace function public.hive_week_start()
returns date
language sql
stable
as $$
  select (d - extract(dow from d)::int)
  from (select (now() at time zone 'Europe/Istanbul')::date as d) as today;
$$;
