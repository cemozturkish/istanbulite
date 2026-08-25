-- =====================================================================
-- OLAYLAR v6 — paper positions after the canvas grew.
--
-- The board's own frame (assets/map/kutuphane-map-mobile.png, the four
-- assets/olaylar/<id>.png drawings, and the traced world map SVG) grew
-- from 1080x1920 to 1080x2420 -- 300px of blank margin added at the top
-- (so Rusya/Ukrayna clear the profile bar) and 200px at the bottom. The
-- code (OLAY_MAP_H in kutuphane.html, OLAY_PICK_H in admin.html) and
-- every traced country polygon were updated to match, but paper_x/paper_y
-- (db/world_events_v3_paper.sql) are AUTHOR-PICKED data, stored against
-- the old frame -- nothing in code can migrate those, only this can.
--
-- The padding was added at the top only (paper_x/the width is untouched),
-- so every existing paper_y needs the same +300 the artwork's own y-axis
-- got, or its string will end 300px below where the paper now hangs.
--
-- Run this ONCE, after deploying the resized artwork/code, never before
-- (running it against the old frame's still-live paper_y would double
-- the offset). Safe to re-run only if every paper_y is null.
-- =====================================================================

update public.world_events
  set paper_y = paper_y + 300
  where paper_y is not null;
