-- =====================================================================
-- neighborhoods_v2_missing_districts — the lookup table only ever
-- carried 25 of Istanbul's 39 official ilçe. The birth-neighborhood
-- and current-residence dropdowns on index.html are populated straight
-- from this table (see loadNeighborhoods() in index.html), so a member
-- born in — or living in — one of the missing 14 had nowhere to click:
-- Adalar, Arnavutköy, Avcılar, Beylikdüzü, Büyükçekmece, Çatalca,
-- Esenyurt, Kartal, Pendik, Sancaktepe, Silivri, Sultanbeyli, Şile,
-- Tuzla.
--
-- This adds those 14 rows. `on conflict do nothing` so re-running it
-- after someone has hand-edited a row never clobbers their edit.
--
-- What this does NOT fix, on purpose — out of scope for this file:
-- these districts have no traced hit-region on the Kahvehane/Anahane
-- SVG maps (assets/map/istanbul-map.svg only covers the original 25),
-- so a member whose current residence is one of these 14 can sign up
-- and use the app, but their own district will not highlight on the
-- map and home-map.js has no painted home map for them yet. See
-- CLAUDE.md's "Add a new neighborhood" task for what that second step
-- needs. The hardcoded NB_NAMES / NEIGHBORHOOD_NAMES fallback maps
-- duplicated across several pages (profile-card.js, kahvehane.html,
-- project.html, sozcel.html, admin.html, bulmaca.html) are a display
-- fallback for when the live fetch hasn't landed yet — they are not
-- what index.html's dropdown reads from and are left alone here.
--
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

insert into public.neighborhoods (id, name_tr) values
  ('adalar',       'Adalar'),
  ('arnavutkoy',   'Arnavutköy'),
  ('avcilar',      'Avcılar'),
  ('beylikduzu',   'Beylikdüzü'),
  ('buyukcekmece', 'Büyükçekmece'),
  ('catalca',      'Çatalca'),
  ('esenyurt',     'Esenyurt'),
  ('kartal',       'Kartal'),
  ('pendik',       'Pendik'),
  ('sancaktepe',   'Sancaktepe'),
  ('silivri',      'Silivri'),
  ('sultanbeyli',  'Sultanbeyli'),
  ('sile',         'Şile'),
  ('tuzla',        'Tuzla')
on conflict (id) do nothing;
