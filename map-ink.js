// ══════════════════════════════════════════════════════════════
// THE MAP READS THE PALETTE — map-ink.js
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
// The red is CHROMATIC and would be flattened onto that ramp, so it is
// lifted out first and merged back on top. Its mask has to be something
// feColorMatrix can express, i.e. linear in R/G/B: R − (G+B)/2 is zero on
// any gray by construction and 0.474 on the drawn #ba433f, so ×2.1 makes
// it a coverage mask and nothing else in the drawing can trip it.
// ══════════════════════════════════════════════════════════════

(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  const FILTER_ID = 'ist-map-ink';
  // The class the maps' own `filter:` rule is gated on (palette.css). It
  // is added only once the filter is actually in the document and its
  // tables are written: a `filter: url()` pointing at a filter that is
  // not there is, per spec, an element that does not render — and a map
  // that vanishes because a shared script failed to load is a worse
  // failure than a map that stays gray.
  const READY_CLASS = 'ist-map-ink';

  // The drawing's own tones, as 8-bit grays, DESCENDING — and the token
  // each one reads. Order matters twice: it is the ladder, and the ramp
  // below walks it from the lightest end down.
  const TONES = [255, 247, 217, 198, 180, 0];
  const VARS = ['--map-page', '--map-sea', '--map-land',
                '--map-turkiye', '--map-edge', '--map-ink'];
  const RED_VAR = '--map-red';

  // One entry per 8-bit gray. Not a round number picked for looks: every
  // tone above is k/255, so at this size each lands exactly on a sample
  // and no anchor is reached by interpolation.
  const STEPS = 256;

  let filter = null, funcs = null, flood = null;

  // '#rgb' / '#rrggbb' / 'rgb(r, g, b)' -> [r, g, b] in 0..1
  function parseColor(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (s[0] === '#') {
      const h = s.slice(1);
      if (h.length === 3) return [0, 1, 2].map(i => parseInt(h[i] + h[i], 16) / 255);
      if (h.length === 6) return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
      return null;
    }
    const m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : null;
  }

  function build() {
    if (filter) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    // sRGB, not the linearRGB filters default to: the ladder was measured
    // off the artwork's own 8-bit values, so the lookup has to happen in
    // the space those values are written in.
    svg.innerHTML =
      '<defs><filter id="' + FILTER_ID + '" color-interpolation-filters="sRGB" ' +
        'x="0" y="0" width="100%" height="100%">' +
        '<feColorMatrix type="matrix" result="lum" values="' +
          '0.2126 0.7152 0.0722 0 0 ' +
          '0.2126 0.7152 0.0722 0 0 ' +
          '0.2126 0.7152 0.0722 0 0 ' +
          '0 0 0 0 1"/>' +
        '<feComponentTransfer in="lum" result="tones">' +
          '<feFuncR type="table" tableValues="0 1"/>' +
          '<feFuncG type="table" tableValues="0 1"/>' +
          '<feFuncB type="table" tableValues="0 1"/>' +
        '</feComponentTransfer>' +
        '<feColorMatrix in="SourceGraphic" type="matrix" result="redmask" values="' +
          '0 0 0 0 0 ' +
          '0 0 0 0 0 ' +
          '0 0 0 0 0 ' +
          '2.1 -1.05 -1.05 0 0"/>' +
        '<feFlood flood-color="#ba433f" result="redfill"/>' +
        '<feComposite in="redfill" in2="redmask" operator="in" result="red"/>' +
        '<feMerge><feMergeNode in="tones"/><feMergeNode in="red"/></feMerge>' +
      '</filter></defs>';
    // <head> is where this can go at parse time, before <body> exists —
    // a filter is a definition, not a drawing, and resolves from there.
    (document.head || document.documentElement).appendChild(svg);
    filter = svg.querySelector('#' + FILTER_ID);
    funcs = {
      R: filter.querySelector('feFuncR'),
      G: filter.querySelector('feFuncG'),
      B: filter.querySelector('feFuncB'),
    };
    flood = filter.querySelector('feFlood');
  }

  // The ladder, sampled. A pixel between two adjacent tones is the blend
  // of them the antialiasing actually made, so each step down the ladder
  // is a plain ramp between one tone's luminance and the next.
  function tables(cols) {
    const out = [[], [], []];
    for (let i = 0; i < STEPS; i++) {
      const L = i / (STEPS - 1);
      const c = cols[0].slice();
      for (let j = 1; j < TONES.length; j++) {
        const hi = TONES[j - 1] / 255, lo = TONES[j] / 255;
        const a = Math.min(1, Math.max(0, (hi - L) / (hi - lo)));
        for (let k = 0; k < 3; k++) c[k] = c[k] * (1 - a) + cols[j][k] * a;
      }
      for (let k = 0; k < 3; k++) out[k].push(c[k].toFixed(4));
    }
    return out.map(a => a.join(' '));
  }

  // Re-reads the tokens and rewrites the lookup. Called by palette.js
  // every time the palette or the sun moves, so a sunset repaints the
  // maps in the same frame it repaints everything else.
  function refresh() {
    try {
      const cs = getComputedStyle(document.documentElement);
      const cols = VARS.map(v => parseColor(cs.getPropertyValue(v)));
      const red = String(cs.getPropertyValue(RED_VAR) || '').trim();
      // No tokens, no filter: a page that never declared the ladder keeps
      // the drawings exactly as they were drawn.
      if (!red || cols.some(c => !c)) return;
      build();
      const t = tables(cols);
      funcs.R.setAttribute('tableValues', t[0]);
      funcs.G.setAttribute('tableValues', t[1]);
      funcs.B.setAttribute('tableValues', t[2]);
      flood.setAttribute('flood-color', red);
      document.documentElement.classList.add(READY_CLASS);
    } catch (e) { /* the maps stay as drawn */ }
  }

  refresh();
  // palette.css may not have arrived when this first runs; the tokens are
  // read again once the stylesheets are in.
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', refresh);
    }
    window.addEventListener('load', refresh);
  } catch (e) { /* ignore */ }

  global.IstMapInk = { refresh, FILTER_ID, READY_CLASS };
})(window);
