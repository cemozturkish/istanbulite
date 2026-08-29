// ══════════════════════════════════════════════════════════════
// THE DRAWN ZOOM — map-frames.js
//
// The depth axis (Türkiye <-> İstanbul <-> mahalle) is not a scale
// transform on a photograph. It is a strip of drawings, played.
//
// The maps on this site are hand-painted. A mathematical zoom of one can
// only do the one boring thing: get bigger. It also has to choose between
// pixelating (raster) and losing the hand (traced to vector). A drawn
// journey has neither problem and gains the thing neither can offer --
// control of every in-between. The coastline can open before the
// districts do; the Bosphorus can arrive early.
//
// This module is only the projector. It knows nothing about what is on
// the frames and does not care how many there are: drop 8 in and it is
// hand animation on twos, drop 20 in and it is video. That number is a
// style decision, made with a thumb, and the code must never encode it.
//
// ── How it runs ──
// A vertical drag SCRUBS: progress 0..1 maps onto frame 0..N-1, so
// dragging slowly flips through the drawings one at a time. That is
// better than the continuous scale it replaces -- the reader actually
// sees each one. On release the remainder is played out at a fixed rate,
// or run backwards if the gesture was abandoned.
//
// ── Two things that fail silently if forgotten ──
// 1. An <img> whose src changes goes blank until the new bytes are
//    decoded (the same trap home-map.js documents as "the city
//    flickering out"). So every frame is a node of its own, decoded
//    before the gesture can start, and playing is only ever a change of
//    opacity -- never a src swap, and never a decode in the middle of a
//    drag.
// 2. The traced hit-region overlay cannot follow hand-drawn frames --
//    re-tracing the districts per frame is not a thing anyone will do.
//    It is hidden for the length of the journey and restored at the far
//    end. Taps mid-zoom mean nothing anyway.
// ══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  // ── The manifest ──
  // One entry per journey actually drawn. The reverse direction is not a
  // second entry: it is these frames played backwards, which costs
  // nothing and cannot drift from the way in.
  //
  // İstanbul <-> mahalle is deliberately absent. That transition would
  // need one journey PER DISTRICT (25 of them) if it were a geographic
  // zoom -- but the mahalle level carries no map at all (there is no
  // geometry in public.mahalles), so it is not a zoom into a place and
  // does not want drawings of one. It falls back to the scale transform.
  const JOURNEYS = [
    {
      from: 'kutuphane', to: 'kahvehane',
      // %d is the frame index, zero-padded to two.
      src: 'assets/map/zoom/tr-ist-%02d.jpg',
      count: 12,
    },
  ];

  const loading = {};  // key -> Promise, in flight or settled
  const decoded = {};  // key -> HTMLImageElement[], only once every frame is ready
  let live = null;     // the session currently on screen, if any

  function key(a, b) { return a + '>' + b; }

  function find(from, to) {
    for (let i = 0; i < JOURNEYS.length; i++) {
      const j = JOURNEYS[i];
      if (j.from === from && j.to === to) return { journey: j, reverse: false };
      if (j.from === to && j.to === from) return { journey: j, reverse: true };
    }
    return null;
  }

  function frameSrc(journey, i) {
    return journey.src.replace(/%0(\d)d/, function (_, w) {
      return String(i).padStart(Number(w), '0');
    });
  }

  // Decode every frame before anything can ask to see one. Resolves to
  // the decoded nodes in journey order; a single failure fails the whole
  // journey, which is correct -- half a strip of drawings is not a
  // transition, and the scale transform is a perfectly good fallback.
  function preload(journey) {
    const k = key(journey.from, journey.to);
    if (loading[k]) return loading[k];
    const imgs = [];
    for (let i = 0; i < journey.count; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = frameSrc(journey, i);
      img.className = 'ist-mapframe';
      img.alt = '';
      imgs.push(img);
    }
    // The resolved value is kept in a plain map, not read back off the
    // promise: begin() runs inside a touch handler, where there is no
    // await to be had and a microtask is already too late.
    loading[k] = Promise.all(imgs.map(function (img) {
      return img.decode ? img.decode() : Promise.resolve();
    })).then(function () { decoded[k] = imgs; return imgs; });
    loading[k].catch(function () { delete loading[k]; });
    return loading[k];
  }

  // Warm whatever the reader can reach in one gesture from here. Called
  // at idle, never on load: the page's own art comes first.
  function warm(slug) {
    JOURNEYS.forEach(function (j) {
      if (j.from === slug || j.to === slug) preload(j).catch(function () {});
    });
  }

  // ── The box the frames are drawn into: the whole screen ──
  // Not the map panel's box, which is the obvious choice and the wrong
  // one: the two levels do not share it (Kütüphane's map is the whole
  // screen, Kahvehane's a square hero), so a strip measured onto it
  // would start in one shape and have to end in another, and every
  // frame would land somewhere slightly different from the last.
  //
  // The frames are drawn on ONE canvas at ONE aspect (9:16, see
  // assets/map/zoom/README.md) and laid over the viewport with
  // object-fit: cover -- so they are registered with each other by
  // construction, which is the only property the drawings actually need
  // from the code. Whatever the phone's own aspect is, all of them are
  // cropped identically, so nothing shifts between one frame and the
  // next.
  //
  // The two bars stay in front of it: this sits at z-index 7, they are
  // at 400/401 (see "THE TWO BARS ARE OMNIPRESENT" in frames.css).
  function stripBox() {
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    if (w < 1 || h < 1) return null;
    return { top: 0, left: 0, width: w, height: h };
  }

  function hitRegions() {
    return Array.prototype.slice.call(document.querySelectorAll('svg.map-svg'));
  }

  // ── A session: one journey, on screen, being scrubbed ──
  function begin(from, to) {
    const hit = find(from, to);
    if (!hit) return null;
    const k = key(hit.journey.from, hit.journey.to);
    // Only if the frames are already decoded. A journey that has to
    // fetch mid-gesture would stall under the finger, and stalling is
    // exactly what this whole mechanism exists to avoid -- so an
    // un-warmed journey silently falls back to the scale transform.
    const imgs = decoded[k];
    if (!imgs) return null;
    const box = stripBox();
    if (!box) return null;

    if (live) live.end();

    const wrap = document.createElement('div');
    wrap.className = 'ist-mapframes';
    wrap.style.top = box.top + 'px';
    wrap.style.left = box.left + 'px';
    wrap.style.width = box.width + 'px';
    wrap.style.height = box.height + 'px';
    imgs.forEach(function (img) { wrap.appendChild(img); });
    document.body.appendChild(wrap);

    const regions = hitRegions();
    regions.forEach(function (el) { el.style.visibility = 'hidden'; });

    let shown = -1;
    const n = imgs.length;

    function show(i) {
      i = Math.max(0, Math.min(n - 1, i));
      if (i === shown) return;
      if (shown >= 0) imgs[shown].style.opacity = '0';
      imgs[i].style.opacity = '1';
      shown = i;
    }

    const session = {
      // p is the journey's own progress, always 0 = `from`, 1 = `to`.
      paint: function (p) {
        p = Math.max(0, Math.min(1, p));
        const t = hit.reverse ? 1 - p : p;
        show(Math.round(t * (n - 1)));
      },
      // Run the rest of the strip out at a steady rate. Resolves when
      // the last frame is up, so the caller can hand over to the
      // navigation with nothing left mid-flight.
      play: function (fromP, toP, ms) {
        return new Promise(function (resolve) {
          const t0 = performance.now();
          const span = Math.max(1, ms);
          (function step(now) {
            const a = Math.min(1, (now - t0) / span);
            session.paint(fromP + (toP - fromP) * a);
            if (a < 1) requestAnimationFrame(step);
            else resolve();
          })(t0);
        });
      },
      // Held over the arriving page for a beat and faded, so the last
      // drawing hands over to the real map instead of cutting to it.
      settle: function (ms) {
        wrap.style.transition = 'opacity ' + ms + 'ms linear';
        wrap.style.opacity = '0';
        setTimeout(function () { session.end(); }, ms + 40);
      },
      end: function () {
        if (live === session) live = null;
        regions.forEach(function (el) { el.style.visibility = ''; });
        // The nodes go back to the cache rather than being dropped:
        // decoding them again is the one cost this module exists to
        // avoid paying twice.
        imgs.forEach(function (img) { img.style.opacity = '0'; });
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      },
      count: n,
    };
    session.paint(0);
    live = session;
    return session;
  }

  // Whether a journey is ready to be scrubbed right now.
  function ready(from, to) {
    const hit = find(from, to);
    if (!hit) return false;
    return !!decoded[key(hit.journey.from, hit.journey.to)];
  }

  global.IstMapFrames = {
    warm: warm,
    ready: ready,
    begin: begin,
    journeys: JOURNEYS,
  };
})(window);
