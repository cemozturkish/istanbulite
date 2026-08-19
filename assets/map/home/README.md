# Hand-painted home maps

One copy of the Istanbul map per district, with that district coloured in
by hand. Whichever member is looking at Anahane or Kahvehane gets the copy
for the district they live in (`home-map.js`), so "this one is yours" is
part of the drawing instead of a red wash laid over it through the traced
hit-region polygon.

## Adding a district

1. Start from `../istanbul-map.png` and paint the district. Keep the frame
   exactly as it is — **5046 × 2300**, nothing moved, cropped or resized.
   The traced overlay in `anahane.html` / `kahvehane.html` is aligned to
   that frame, so a map drawn at any other size aims every tap wrongly.
2. Save it here as `istanbul-map-<district-id>.png` — the base map's own
   filename with the district's id on the end — using the same kebab-case
   id the database and the SVG polygons use (`bakirkoy`, `besiktas`,
   `gop`, `eyupsultan`, …).
3. Add that id to `PAINTED` in `home-map.js`.

Painted so far: **Bakırköy**.

A district with no file here keeps the older CSS treatment (the red
`.neighborhood.home` tint), so the set can be drawn one district at a time.
