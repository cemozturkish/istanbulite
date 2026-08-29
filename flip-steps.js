// ══════════════════════════════════════════════════════════════
// THE STEP TABLES — flip-steps.js
//
// This is the authoring file. One entry per journey; inside it, a step
// count and a cast. Each actor names a real element on the page it
// belongs to and where it stands at whichever steps you care about.
//
// ── How poses work ──
// A pose is relative to where the element ACTUALLY sits on its own page,
// so { x: 0, y: 0, scale: 1, opacity: 1 } means "exactly where it lives".
// That is why step 0 always lines up with the real page by construction
// rather than by anyone measuring anything.
//
// You do not have to write every step. A pose at step 0 and one at step
// 6 means the element travels evenly between them; steps after the last
// pose you gave simply hold it there. Write the moments that matter.
//
//   x, y      pixels from its real place (+y is down)
//   scale     1 is its real size
//   opacity   1 is solid, 0 is gone
//   rot       degrees, if something should tilt
//
// ── The one rule ──
// Step 0 has to look like the level being left and the last step like
// the level being arrived at, because those are the two frames that
// hand over to a real page. Everything in between is yours.
// ══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  const JOURNEYS = {
    // Türkiye -> İstanbul. `steps` should match the number of drawings
    // in assets/map/zoom/ (map-frames.js's own count); they are the same
    // journey seen two ways -- the drawings are the map, these are
    // everything printed over it.
    'kutuphane>kahvehane': {
      steps: 12,
      actors: [
        // Kütüphane's two doors, top corners. They are the first thing
        // to go: you are diving past the national layer, so they lift
        // away and out of the corners they sit in.
        { from: '#lib-box-olaylar', poses: {
          0: { x: 0, y: 0, opacity: 1 },
          3: { x: -14, y: -18, opacity: 0.85, scale: 0.94 },
          6: { x: -40, y: -54, opacity: 0, scale: 0.8 },
        } },
        { from: '#lib-box-mektuplar', poses: {
          0: { x: 0, y: 0, opacity: 1 },
          3: { x: 14, y: -18, opacity: 0.85, scale: 0.94 },
          6: { x: 40, y: -54, opacity: 0, scale: 0.8 },
        } },
        // The news column: the whole national feed, sliding down and out
        // of the way as the city comes up to meet the reader.
        { from: '#dunya-news-feed', poses: {
          0: { x: 0, y: 0, opacity: 1 },
          2: { x: 0, y: 10, opacity: 0.9 },
          5: { x: 0, y: 90, opacity: 0, scale: 0.97 },
        } },
      ],
    },
  };

  function key(from, to) { return from + '>' + to; }

  // A journey and its reverse are one table: going back is the same
  // steps counted from the other end, so there is never a second table
  // to keep in sync with the first.
  function find(from, to) {
    const fwd = JOURNEYS[key(from, to)];
    if (fwd) return { def: fwd, reverse: false };
    const back = JOURNEYS[key(to, from)];
    if (back) return { def: back, reverse: true };
    return null;
  }

  global.IstFlipSteps = { find, JOURNEYS };
})(window);
