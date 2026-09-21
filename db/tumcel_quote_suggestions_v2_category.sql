-- Migration: category on Tümcel quote suggestions ("Cümle Öner")
-- Run this in your Supabase SQL Editor. Idempotent.
--
-- A quote suggestion used to arrive with only its body and its source.
-- The admin already sorts every quote a puzzle carries into one of four
-- categories when building it (tc-color-N in admin.html: Sözlü, Ezgi,
-- Yazılı, Halk Ağzı) -- so asking the MEMBER for that same category at
-- the moment they offer the sentence, rather than only at the desk, is
-- one fact travelling with the suggestion instead of being guessed at
-- twice. Picking a suggestion pre-fills the puzzle's own color select
-- with it; the admin can still change it before saving.
--
-- The four values are exactly admin.html's own tc-color-N option values,
-- so the two can never drift apart -- there is one vocabulary for "what
-- kind of quote is this," not two.

alter table public.tumcel_quote_suggestions
  add column if not exists category text
    check (category in ('cat1', 'cat2', 'cat3', 'cat4'));

comment on column public.tumcel_quote_suggestions.category is
  'cat1 Sözlü · cat2 Ezgi · cat3 Yazılı · cat4 Halk Ağzı -- same vocabulary as admin.html''s tc-color-N pickers. Nullable: an older suggestion offered before this column existed carries none.';

-- PostgREST answers from a cached schema; a column it has not reloaded
-- is invisible to the client even though it exists here.
notify pgrst, 'reload schema';

-- Verify:
--   select id, body, category from public.tumcel_quote_suggestions order by suggested_at desc limit 5;
