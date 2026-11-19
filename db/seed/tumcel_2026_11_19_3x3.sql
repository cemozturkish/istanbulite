-- One-off: the first 3×3 Tümcel, for the night of 2026-11-19.
-- Three quotes of three fragments each. tumcel.html reads the board's
-- shape off the row itself (quotes.length × fragments.length), so nothing
-- else has to be told this night is a 3×3.
--
-- Run in the Supabase SQL Editor. Re-running replaces that night's row.
-- The tümcül is the admin (as a free entry in admin.html would make them).

insert into public.tumcel_puzzles (puzzle_date, quotes)
select '2026-11-19'::date, jsonb_build_array(
  jsonb_build_object(
    'color', 'cat3',
    'source', 'Orhan Veli Kanık — İstanbul''u Dinliyorum, 1947',
    'fragments', jsonb_build_array('İstanbul''u', 'dinliyorum,', 'gözlerim kapalı'),
    'full_quote', 'İstanbul''u dinliyorum, gözlerim kapalı',
    'tumcul_id', a.id,
    'suggestion_id', null
  ),
  jsonb_build_object(
    'color', 'cat2',
    'source', 'Anonim türkü — Kâtibim',
    'fragments', jsonb_build_array('Üsküdar''a', 'gider iken', 'aldı da bir yağmur'),
    'full_quote', 'Üsküdar''a gider iken aldı da bir yağmur',
    'tumcul_id', a.id,
    'suggestion_id', null
  ),
  jsonb_build_object(
    'color', 'cat4',
    'source', 'Atasözü',
    'fragments', jsonb_build_array('Komşu', 'komşunun külüne', 'muhtaçtır'),
    'full_quote', 'Komşu komşunun külüne muhtaçtır.',
    'tumcul_id', a.id,
    'suggestion_id', null
  )
)
from (select id from public.profiles where email = 'cemwozturk@gmail.com') a
on conflict (puzzle_date) do update set quotes = excluded.quotes;
