-- =====================================================================
-- Kütüphane — OLAYLAR: the papers for Gazze and İran ve ABD.
--
-- Both olaylar now have a drawing on the board
-- (assets/olaylar/gazze.png, assets/olaylar/iran-abd.png), so each one
-- has a line that ends somewhere and a colour that was actually drawn.
-- db/world_events_seed.sql carries the same three values, but that file
-- rewrites every column of every olay -- including blurbs the admin may
-- have rewritten in the portal since it was last run -- so this touches
-- the three fields the drawings decided and nothing else.
--
-- Requires db/world_events_v3_paper.sql and db/world_events_v4_color.sql.
-- Run in Supabase SQL editor. Idempotent.
-- =====================================================================

-- The stroke runs south-west out of Gazze across Sina; the paper hangs
-- at its far end, in the empty desert, so the string reads as running
-- from the note back up into Gazze.
update public.world_events
   set paper_x = 406, paper_y = 1412, color = '#4c8059'
 where id = 'gazze';

-- Six strokes fanning between İran and İsrail; the paper hangs at the
-- İran end -- the open end of the fan -- so the strings run out of the
-- note and west rather than piling up on the İsrail coast.
update public.world_events
   set paper_x = 1010, paper_y = 950, color = '#7c7c7c'
 where id = 'iran-abd';
