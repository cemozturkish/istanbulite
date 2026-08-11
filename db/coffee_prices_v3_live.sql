-- =====================================================================
-- coffee_prices v3 — the Kahve Endeksi goes live, like a market board.
--
-- v2 stored one flat price per venue, so the index was a static list. A
-- real index moves: a venue that has closed for the night is *off* the
-- board entirely, and a venue running a discount trades at the discount
-- price for exactly as long as the discount lasts. This migration adds
-- the two nuances that make that possible, both edited from admin.html's
-- "Kahve" tab:
--
--   1. `hours`       — the weekly opening schedule. Outside it the venue
--                      is closed and drops out of the ranking.
--   2. `happy_*`     — a scheduled discount ("Jay's is cheaper until
--                      18:00 on weekdays"). Inside the window the venue
--                      trades at `happy_price` instead of `price`.
--
-- Everything is additive and nullable, so existing rows keep behaving
-- exactly as they did: `hours is null` means "hours unknown", which the
-- client treats as always open, and a null `happy_price` means no
-- discount. The evaluation itself lives in coffee-index.js — this file
-- only defines the shape and the sanity constraints.
--
-- `hours` shape (jsonb object, keys are JS Date#getDay() indices as
-- strings, 0 = Sunday … 6 = Saturday):
--
--   {"1": {"open": "08:00", "close": "22:00"},
--    "2": {"open": "08:00", "close": "22:00"},
--    "0": null}
--
-- A key that is missing or null means closed all day. A window whose
-- close is at or before its open (e.g. 20:00 → 02:00) spans midnight.
-- SQL NULL and `{}` both mean "hours not recorded" — the client keeps
-- such a venue listed at all times rather than letting an empty object
-- quietly erase it from the board (the admin form refuses to save one).
--
-- Run in Supabase SQL editor, after coffee_prices_v2_admin_only.sql.
-- Idempotent.
-- =====================================================================

alter table public.coffee_prices
  -- Weekly opening schedule; null = unknown, treated as always open.
  add column if not exists hours       jsonb,
  -- Discounted price, charged only inside the happy window below.
  add column if not exists happy_price numeric(6,2),
  -- Weekdays the discount runs on, as getDay() indices. Null/empty =
  -- every day.
  add column if not exists happy_days  smallint[],
  -- Discount window. A null start means "from opening" (00:00).
  add column if not exists happy_start time,
  add column if not exists happy_end   time,
  -- Optional short reason shown next to the discounted price
  -- ("Öğrenciye", "Mutlu saatler").
  add column if not exists happy_label text;

-- `hours` must be a json object if present — the client indexes into it
-- by weekday key and an array or scalar would silently read as closed.
alter table public.coffee_prices
  drop constraint if exists coffee_prices_hours_is_object;
alter table public.coffee_prices
  add constraint coffee_prices_hours_is_object
  check (hours is null or jsonb_typeof(hours) = 'object');

-- Same range as `price`: a discount is still a price.
alter table public.coffee_prices
  drop constraint if exists coffee_prices_happy_price_range;
alter table public.coffee_prices
  add constraint coffee_prices_happy_price_range
  check (happy_price is null or (happy_price > 0 and happy_price <= 5000));

-- A discount without an end time would never expire, which is the one
-- thing this whole migration exists to prevent. Require the pair.
alter table public.coffee_prices
  drop constraint if exists coffee_prices_happy_needs_end;
alter table public.coffee_prices
  add constraint coffee_prices_happy_needs_end
  check ((happy_price is null) = (happy_end is null));

-- Weekday indices only, matching the `hours` keys. `<@` ("is contained
-- by") is true when every element of the left array appears in the right
-- one, and trivially true for an empty array -- the same test as
-- unnesting the column, but without a subquery, which a check constraint
-- may not contain.
alter table public.coffee_prices
  drop constraint if exists coffee_prices_happy_days_range;
alter table public.coffee_prices
  add constraint coffee_prices_happy_days_range
  check (happy_days is null or happy_days <@ array[0,1,2,3,4,5,6]::smallint[]);

alter table public.coffee_prices
  drop constraint if exists coffee_prices_happy_label_len;
alter table public.coffee_prices
  add constraint coffee_prices_happy_label_len
  check (happy_label is null or char_length(btrim(happy_label)) between 1 and 40);

-- RLS is unchanged from v2: everyone reads, only the admin writes. The
-- new columns are covered by those same policies automatically.
