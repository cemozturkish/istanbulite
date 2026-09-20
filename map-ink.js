// ══════════════════════════════════════════════════════════════
// THE DRAWINGS READ THE PALETTE — map-ink.js
// ──────────────────────────────────────────────────────────────
// The hand-drawn maps used to be the one thing on the site that ignored
// the palette: the same near-white paper and black ink whether the reader
// was on the earth palette at noon or the mono one after sunset. They
// looked like a photograph of a drawing laid over the app rather than
// part of it.
//
// They are not photographs. Measured, every map in assets/map/ is a
// handful of FLAT grays plus one red — 1483 distinct colours in
// istanbul-map-mobile.png, but 93% of its pixels sit within 8/255 of one
// of four tones, and the rest is the antialiasing between them. So each
// tone can be bound to a token instead of being repainted:
//
//   #ffffff  sayfa      the page band above the Türkiye map
//   #f7f7f7  DENİZ      the water — and İstanbul's own page ground
//   #d9d9d9  kara       land, the neighbouring countries
//   #c6c6c6  TÜRKİYE    the country itself, drawn a step darker than its
//                       neighbours, so it gets a token of its own
//   #b4b4b4  kenar      the extruded side of the 3D edge
//   #000000  çizgi      the outline
//   #ba433f  kırmızı    the Ankara star, the marks, a painted home ilçe
//
// The ladder is what the drawing MEANS, so its ORDER is load-bearing: the
// sea is the lightest tone in both maps and must stay the lightest in
// every palette. Night is not an invert — the whole ladder slides down
// and keeps its order — because a map whose sea is darker than its land
// is a map of somewhere else.
//
// ── Why a filter and not four sets of PNGs, or masks ──
// Recolouring the artwork offline means one set of files per palette per
// theme: four copies of 7.2 MB, and a src swap at sunrise and sunset,
// which is the "<img> goes blank until the new bytes decode" trap
// home-map.js already documents. Splitting each map into per-tone alpha
// layers is exact but multiplies the flip book's 24 decoded frames by
// four. This costs nothing on disk and nothing at rest: measured on a
// harness reproducing the book exactly — 24 stacked frames, opacity the
// only thing that changes — at 390×844@3 on a 4×-throttled CPU, scrubbing
// the whole book and back left the median frame at 16.7 ms (identical
// unfiltered) and p95 within 0.4 ms. What it does cost is one
// rasterisation the first time each frame is painted, which is a handful
// of frames on the first pass and free ever after.
//
// ── The two primitives ──
// feColorMatrix flattens the drawing to its luminance, then
// feComponentTransfer maps that luminance through the ladder — a plain
// table lookup, one entry per 8-bit gray, so every anchor above lands
// exactly on a sample and the output is the token to the last bit.
//
// ── Two ladders, one mechanism ──
// The maps are not the only hand-drawn grays on the site. The avatar
// family (assets/avatar-*.png, avatar-background.png) is the same thing
// again, measured the same way and even cleaner: four flat tones and
// nothing else — #f9f9f9 the figure's own paper, #dcdbdb the ground it
// stands on, #5b5b5b the jail stripes, #181818 the ink that draws the
// outline, the hair, the glasses and the shirt alike. So LADDERS below
// carries both, and adding a third drawn family is a row in that table.
//
// The avatar's ladder is deliberately NOT the page's. It is a stamp: a
// figure printed on its own paper, and that paper stays light at night
// while the page around it goes dark. Measured, that is not a taste —
// the avatar's ink sits 13.2:1 off its own paper by day, and on a night
// page even pure black reaches 3.9:1, so an avatar dimmed with the page
// is an avatar nobody can read.
//
// The red is CHROMATIC and would be flattened onto that ramp, so it is
// lifted out first and merged back on top. Its mask has to be something
// feColorMatrix can express, i.e. linear in R/G/B: R − (G+B)/2 is zero on
// any gray by construction and 0.474 on the drawn #ba433f, so ×2.1 makes
// it a coverage mask and nothing else in the drawing can trip it.
//
// ── Where the filter hangs, and why it is built by hand ──
// In the BODY, with DOM calls rather than innerHTML. A filter is resolved
// off the render tree, and <head> is display:none with children an engine
// need never attach — Chromium resolves a definition from there, which is
// no evidence at all for WebKit, and WebKit is what ~90% of this app runs
// on. Same argument for the construction: setting innerHTML on an SVG
// element runs an SVG fragment through the HTML parser, which is exactly
// the sort of thing engines disagree about. Neither shortcut was worth an
// untestable difference, so neither is taken.
// ══════════════════════════════════════════════════════════════

(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  // The class the maps' own `filter:` rule is gated on (palette.css). It
  // is added only once the filter is actually in the document and its
  // tables are written: a `filter: url()` pointing at a filter that is
  // not there is, per spec, an element that does not render — and a map
  // that vanishes because a shared script failed to load is a worse
  // failure than a map that stays gray.
  const READY_CLASS = 'ist-map-ink';

  // ── The kill switch ──
  // `?ink=0` anywhere in the app turns every ladder off and remembers it;
  // `?ink=1` turns them back on. It exists because this is the one thing
  // on the site that cannot be measured where it is written: the filters
  // are free in Chromium at every revision measured -- flip-book scrub,
  // a 305-cell petek under a depth drag, layer count and surface memory
  // alike -- and ~90% of readers are in WebKit, which has no build here
  // to check against. So the reader carries the A/B in their pocket
  // instead of anybody guessing: open the app, note it, add ?ink=0,
  // note it again. Remembered in localStorage rather than read from the
  // query each time, because index.html redirects to project.html and
  // drops the query on the way.
  const KILL_KEY = 'istanbulite_map_ink_off';

  function killed() {
    try {
      const v = new URLSearchParams(location.search).get('ink');
      if (v === '0' || v === 'off') { localStorage.setItem(KILL_KEY, '1'); return true; }
      if (v === '1' || v === 'on') { localStorage.removeItem(KILL_KEY); return false; }
      return localStorage.getItem(KILL_KEY) === '1';
    } catch (e) { return false; }
  }

  // Each drawn family's own tones, as 8-bit grays, DESCENDING — and the
  // token each one reads. Order matters twice: it is the ladder, and the
  // ramp below walks it from the lightest end down. `red` is the one
  // chromatic layer, and only the maps have one.
  const LADDERS = [
    {
      id: 'ist-map-ink',
      tones: [255, 247, 217, 198, 180, 0],
      vars: ['--map-page', '--map-sea', '--map-land',
             '--map-turkiye', '--map-edge', '--map-ink'],
      red: '--map-red',
    },
    {
      id: 'ist-avatar-ink',
      tones: [249, 220, 91, 24],
      vars: ['--av-paper', '--av-ground', '--av-jail', '--av-ink'],
      red: null,
    },
    // The loading screen: the sea rising in the logo. Three tones and
    // nothing else -- the ground it is drawn on, the sea itself, and the
    // letterforms -- measured off the ten frames the same way. It is
    // deliberately per PALETTE and not per theme: this is a curtain, not
    // a page, and it is dark in both. The earth sea is the same #7d6553
    // that is the night map's water and the night page's paper, because
    // it is the same sea in all three places.
    {
      id: 'ist-loading-ink',
      tones: [255, 125, 0],
      vars: ['--load-logo', '--load-sea', '--load-ground'],
      red: null,
    },
    // Sözcel's own mark (assets/sozcel-logo.png): two flat tones on a
    // transparent canvas, measured the same way -- near-white fill and
    // near-black ink, nothing else. Unlike the avatar's ladder this one
    // IS the page's: it reads --lit/--ink, the same pair the card it
    // stands on is built from (see project.html's own note on it), so
    // the mark comes out black on mono, brown ink on the earth palette's
    // own paper, and follows day/night the same way the card does.
    {
      id: 'ist-sozcel-ink',
      tones: [253, 1],
      vars: ['--lit', '--ink'],
      red: null,
    },
  ];

  // ══════════════════════════════════════════════════════════════
  // THE FRAME'S OWN SHADING — a ladder per ring color, not one ladder
  // ──────────────────────────────────────────────────────────────
  // frame.png is not a flat silhouette: it is drawn with a lit face and
  // a shadow face, two flat grays (61 and 24 out of 255 — measured the
  // same way as every ladder above), which is what gives the hexagon its
  // bevel. Used as a plain CSS mask, none of that ever rendered: a mask
  // only reads a PNG's alpha, and what actually painted inside it was a
  // single flat --hexframe-stroke color (frames.css) — the shading was
  // there in the file and nowhere on screen.
  //
  // Putting it back is not one ladder, because --hexframe-stroke is not
  // one color: it is reassigned per hexagon to mean something — the
  // petek's five-tone distance ladder (you / bonded / other / an open
  // seat) and red for whoever is named on the top bar (profile-card.css).
  // A luminance-remap filter has to know its colors ahead of time, so
  // there is one small ladder per distinct ring color the site actually
  // uses, each built from that ONE color: itself for the lit face, and
  // that same color darkened by the drawing's own ratio (24/61) for the
  // shadow face. Add a new ring color, add a row here.
  const FRAME_SHADE = 24 / 61;
  const FRAME_TONES = [61, 24];
  const FRAME_LADDERS = [
    { id: 'ist-frame-ink',         var: '--ink',                  tones: FRAME_TONES, shade: FRAME_SHADE },
    { id: 'ist-frame-red',         var: '--ink-red',              tones: FRAME_TONES, shade: FRAME_SHADE },
    { id: 'ist-frame-hive-me',     var: '--ist-hive-ring-me',     tones: FRAME_TONES, shade: FRAME_SHADE },
    { id: 'ist-frame-hive-bonded', var: '--ist-hive-ring-bonded', tones: FRAME_TONES, shade: FRAME_SHADE },
    { id: 'ist-frame-hive-other',  var: '--ist-hive-ring-other',  tones: FRAME_TONES, shade: FRAME_SHADE },
    { id: 'ist-frame-hive-open',   var: '--ist-hive-ring-open',   tones: FRAME_TONES, shade: FRAME_SHADE },
  ];
  // Sözcel's board/keyboard are deliberately absent: pinned to #000
  // (frames.css), where "itself" and "darkened further" are both just
  // black — there is nothing for a bevel to show, so that ring stays the
  // plain flat mask forever rather than carrying a filter that would be
  // a no-op. See frames.css's own note on it.
  const FRAME_READY_CLASS = 'ist-frame-ink';

  // One entry per 8-bit gray. Not a round number picked for looks: every
  // tone above is k/255, so at this size each lands exactly on a sample
  // and no anchor is reached by interpolation.
  const STEPS = 256;

  // id -> { filter, funcs, flood }
  let built = null;

  // '#rgb' / '#rrggbb' / 'rgb(r, g, b)' -> [r, g, b] in 0..1
  function parseColorLiteral(s) {
    if (s[0] === '#') {
      const h = s.slice(1);
      if (h.length === 3) return [0, 1, 2].map(i => parseInt(h[i] + h[i], 16) / 255);
      if (h.length === 6) return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
      return null;
    }
    const m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null;
  }

  // Everything the maps and avatars ever declare is a literal hex or
  // rgb(), so parseColorLiteral is all that is needed for them. The
  // frame ladder reads tokens like --ist-hive-ring-me, which is
  // `var(--ink)`, and --ist-hive-ring-bonded, which is a color-mix() of
  // two more vars -- and getComputedStyle().getPropertyValue() on a
  // CUSTOM property does NOT resolve nested var() references or
  // evaluate functions like color-mix(): it hands back the text as
  // specified, `var()` and all. A canvas 2D context's fillStyle parses
  // the full CSS <color> grammar but has no notion of custom properties
  // either, so it cannot make sense of that raw text.
  //
  // What DOES resolve every var() in the chain, and color-mix() with
  // it, is the browser's own cascade -- so hand the raw string to a
  // real CSS property instead of a custom one: assign it to `color` on
  // a hidden probe element sitting in the document, then read back
  // getComputedStyle(probe).color, which is always a plain
  // rgb()/rgba() string in every engine. That is the one thing this
  // needs to be true, whatever `s` turns out to be.
  function colorProbe() {
    if (parseColor._probe) return parseColor._probe;
    if (!document.body) return null;
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    document.body.appendChild(d);
    parseColor._probe = d;
    return d;
  }

  function parseColor(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const direct = parseColorLiteral(s);
    if (direct) return direct;
    try {
      const probe = colorProbe();
      if (!probe) return null;
      probe.style.color = '';
      probe.style.color = s;
      if (!probe.style.color) return null; // an invalid value is never assigned
      return parseColorLiteral(getComputedStyle(probe).color);
    } catch (e) { return null; }
  }

  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function buildOne(spec, defs) {
    // sRGB, not the linearRGB filters default to: every ladder was
    // measured off its artwork's own 8-bit values, so the lookup has to
    // happen in the space those values are written in.
    const filter = el('filter', {
      id: spec.id, 'color-interpolation-filters': 'sRGB',
      x: 0, y: 0, width: '100%', height: '100%',
    });
    const LUM = '0.2126 0.7152 0.0722 0 0 ';
    // The alpha row PASSES ALPHA THROUGH ('0 0 0 1 0'), and that is not a
    // formality. Forcing it opaque ('0 0 0 0 1') is harmless on the maps,
    // which fill their box with no transparency at all -- and it destroys
    // the avatars, which are transparent PNGs: every pixel outside the
    // drawing becomes opaque, and since transparent black has luminance 0
    // the whole 1024x1536 canvas floods with the darkest tone on the
    // ladder. What you get is a solid ink-coloured hexagon with the
    // figure knocked out of it, which reads as a deliberate inversion
    // rather than as a bug -- so it is worth stating.
    filter.appendChild(el('feColorMatrix', {
      type: 'matrix', result: 'lum', values: LUM + LUM + LUM + '0 0 0 1 0',
    }));
    const tr = el('feComponentTransfer', { in: 'lum', result: 'tones' });
    const funcs = {};
    for (const ch of ['R', 'G', 'B']) {
      funcs[ch] = el('feFunc' + ch, { type: 'table', tableValues: '0 1' });
      tr.appendChild(funcs[ch]);
    }
    filter.appendChild(tr);
    let flood = null;
    if (spec.red) {
      filter.appendChild(el('feColorMatrix', {
        in: 'SourceGraphic', type: 'matrix', result: 'redmask',
        values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.1 -1.05 -1.05 0 0',
      }));
      flood = el('feFlood', { 'flood-color': '#ba433f', result: 'redfill' });
      filter.appendChild(flood);
      filter.appendChild(el('feComposite', {
        in: 'redfill', in2: 'redmask', operator: 'in', result: 'red',
      }));
      const merge = el('feMerge', {});
      merge.appendChild(el('feMergeNode', { in: 'tones' }));
      merge.appendChild(el('feMergeNode', { in: 'red' }));
      filter.appendChild(merge);
    }
    defs.appendChild(filter);
    return { filter, funcs, flood };
  }

  // Built with DOM calls and hung in the BODY, and both halves of that are
  // deliberate rather than style. `svg.innerHTML` parses an SVG fragment
  // through the HTML parser and is the kind of thing engines disagree
  // about; and a filter is resolved off the render tree, so a definition
  // sitting inside <head> -- which the UA stylesheet gives display:none,
  // and whose children an engine is free never to attach -- is a
  // definition an engine may never see. Chromium resolves it from there;
  // that is not evidence for WebKit, which is what ~90% of this app runs
  // on. The body always attaches, so it needs no such argument.
  //
  // Returns false when there is no body yet -- this module runs from
  // <head>, before one exists. Nothing is claimed in that case: refresh()
  // simply does not add the ready class, and the DOMContentLoaded pass
  // below builds it for real.
  function build() {
    if (built) return true;
    if (!document.body) return false;
    const svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true' });
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    const defs = el('defs', {});
    built = {};
    // Both families share one <defs> -- buildOne() only cares about a
    // spec's id/tones/red, so a frame ladder (single var + a derived
    // shadow tone) builds through the exact same machinery as a map or
    // avatar ladder (several vars, one per tone). Sharing the DOM only
    // saves an element; it does NOT couple their readiness -- see
    // refresh() for why those stay two independent gates.
    for (const spec of LADDERS) built[spec.id] = buildOne(spec, defs);
    for (const spec of FRAME_LADDERS) built[spec.id] = buildOne(spec, defs);
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return true;
  }

  // The ladder, sampled. A pixel between two adjacent tones is the blend
  // of them the antialiasing actually made, so each step down the ladder
  // is a plain ramp between one tone's luminance and the next.
  function tables(tones, cols) {
    const out = [[], [], []];
    for (let i = 0; i < STEPS; i++) {
      const L = i / (STEPS - 1);
      const c = cols[0].slice();
      for (let j = 1; j < tones.length; j++) {
        const hi = tones[j - 1] / 255, lo = tones[j] / 255;
        const a = Math.min(1, Math.max(0, (hi - L) / (hi - lo)));
        for (let k = 0; k < 3; k++) c[k] = c[k] * (1 - a) + cols[j][k] * a;
      }
      for (let k = 0; k < 3; k++) out[k].push(c[k].toFixed(4));
    }
    return out.map(a => a.join(' '));
  }

  function writeLadder(spec, cols, red) {
    const b = built[spec.id];
    const t = tables(spec.tones, cols);
    b.funcs.R.setAttribute('tableValues', t[0]);
    b.funcs.G.setAttribute('tableValues', t[1]);
    b.funcs.B.setAttribute('tableValues', t[2]);
    if (b.flood) b.flood.setAttribute('flood-color', red);
  }

  // Re-reads the tokens and rewrites the lookup. Called by palette.js
  // every time the palette or the sun moves, so a sunset repaints the
  // maps in the same frame it repaints everything else.
  function refresh() {
    try {
      // Switched off: neither ready class is added, so every drawing
      // renders exactly as it was drawn -- the same degradation both
      // classes guarantee when this module fails to load at all.
      if (killed()) {
        document.documentElement.classList.remove(READY_CLASS);
        document.documentElement.classList.remove(FRAME_READY_CLASS);
        return;
      }
      const cs = getComputedStyle(document.documentElement);

      // ── The maps, avatars, loading screen and Sözcel's mark ──
      // Unchanged: all or nothing across this whole family, so the ready
      // class can never mean "half of them are painted".
      const mainWant = [];
      let mainOk = true;
      for (const spec of LADDERS) {
        const cols = spec.vars.map(v => parseColor(cs.getPropertyValue(v)));
        const red = spec.red ? String(cs.getPropertyValue(spec.red) || '').trim() : '';
        if (cols.some(c => !c) || (spec.red && !red)) { mainOk = false; break; }
        mainWant.push({ spec, cols, red });
      }

      // ── The frame's own ring colors ──
      // A SEPARATE gate, on purpose: a color that fails to resolve here
      // (an engine too old for color-mix and its canvas fallback both,
      // a page that never declared one of these six vars) must not be
      // able to take the maps and avatars down with it, and the reverse.
      // Two independent ladders sharing one mechanism, not one bigger one.
      const frameWant = [];
      let frameOk = true;
      for (const spec of FRAME_LADDERS) {
        const base = parseColor(cs.getPropertyValue(spec.var));
        if (!base) { frameOk = false; break; }
        frameWant.push({ spec, cols: [base, base.map(c => c * spec.shade)], red: '' });
      }

      if (!mainOk && !frameOk) return;
      if (!build()) return; // no body yet -- neither family can be written

      if (mainOk) {
        for (const { spec, cols, red } of mainWant) writeLadder(spec, cols, red);
        document.documentElement.classList.add(READY_CLASS);
      }
      if (frameOk) {
        for (const { spec, cols, red } of frameWant) writeLadder(spec, cols, red);
        document.documentElement.classList.add(FRAME_READY_CLASS);
      }
    } catch (e) { /* the drawings stay as drawn */ }
  }

  // Two reasons this cannot be a single call from <head>: there is no
  // body to hang the filter in yet, and palette.css may not have arrived
  // for its tokens to be read. Both are settled by DOMContentLoaded; the
  // load pass is the belt and braces.
  refresh();
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refresh);
    } else {
      refresh();
    }
    window.addEventListener('load', refresh);
  } catch (e) { /* ignore */ }

  global.IstMapInk = {
    refresh, READY_CLASS, LADDERS, KILL_KEY,
    FRAME_READY_CLASS, FRAME_LADDERS,
  };
})(window);
