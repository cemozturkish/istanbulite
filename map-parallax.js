// ══════════════════════════════════════════════════════════════
// Map parallax — on a phone the city drifts under the page as the
// device tilts, and nothing else moves.
//
// The map is the one thing on all three carousel pages that is scenery
// rather than content: everything else (the two bars, the feeds, the
// sheets) is printed ON the screen, while the map is what the screen is
// a window onto. This module makes that literal — tilt the phone and
// the drawing behind the window shifts against you, the way the view
// through a real window does. It is scenery only: the profile bar, the
// tab bar, the columns and every sheet stay exactly where they are.
//
// What actually moves is the ARTWORK, never its window. .map-panel is
// the window and is never touched; each drawing inside it (the photo,
// and the traced SVG overlay that carries the hit-regions) gets the
// same transform, so a district stays under the shape that answers a
// tap on it — a parallax that moved the picture out from under its own
// hit-regions would quietly mis-aim every tap on the map.
//
// The room to move into comes from OVERSCAN: the artwork is drawn a few
// percent larger than its window, and the drift is clamped to exactly
// half of that surplus per side, so the edge of the drawing can never
// come into view no matter how far the phone is tilted.
//
// Mobile only, and only where the device actually reports its own
// orientation. On iOS 13+ the reading is permission-gated and the
// request has to come from a user gesture, so this asks once on the
// first tap and remembers the answer; a refusal disables the effect
// for good rather than asking again on every launch.
// ══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  // Degrees of tilt away from the neutral pose that reach the full offset.
  // Roughly the range a phone moves through while being read without the
  // reader thinking of it as tilting the phone.
  const MAX_TILT = 22;

  // The artwork is drawn this much larger than the window that shows it.
  // Half the surplus sits on each side, and that half IS the maximum
  // drift (see measure()) — which is what makes exposing an edge
  // impossible rather than merely unlikely.
  const OVERSCAN = 1.045;

  // Per-frame low-pass on the drift. The raw sensor is jittery enough that
  // following it directly reads as a vibrating map rather than a moving one.
  const EASE = 0.09;

  // How hard the neutral pose is dragged along once the tilt has run PAST
  // the end of its range. Ordinary tilts leave the neutral pose alone, so
  // the map doesn't creep while it's being watched; but a reader who lies
  // down or hands the phone over has genuinely changed what "level" means
  // for them, and that is the one case the old neutral pose can no longer
  // describe — so it follows, over a couple of seconds.
  const REPOSE = 0.02;

  // px — a step smaller than this isn't worth a paint.
  const MIN_STEP = 0.12;

  // Matches the site's mobile breakpoint everywhere else.
  const MOBILE_MAX = 768;

  const PERM_KEY = 'ist-motion-permission';

  // ── Groups: one per .map-panel, holding every drawing that has to move
  // with it and the window's own measurements. ──
  let groups = [];
  let live = false;      // sensor readings are arriving and being applied
  let listening = false;

  // Normalized drift, -1..1 in each axis; `cur` chases `tgt`.
  let tgtX = 0, tgtY = 0, curX = 0, curY = 0;
  // The pose the reader is holding the phone in, in screen-space degrees.
  let baseX = null, baseY = null;
  let frame = 0;

  function reducedMotion() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function isPhone() {
    return global.innerWidth <= MOBILE_MAX;
  }

  // Session storage, not local: the answer only has to survive the swipes
  // between the three pages, and a reader who turns motion access back on in
  // Settings should get the map moving again on their next launch rather
  // than being remembered as a refusal for good. Re-asking costs nothing —
  // iOS answers a settled refusal itself, without showing anything.
  function readPerm() {
    try { return sessionStorage.getItem(PERM_KEY); } catch (e) { return null; }
  }
  function writePerm(v) {
    try { sessionStorage.setItem(PERM_KEY, v); } catch (e) {}
  }

  // The point the artwork is pinned to, which is the point the overscan has
  // to be scaled ABOUT: scaling a drawing that hangs from the top of its
  // window around the window's centre lifts it off that top edge and crops
  // it there. The photo says so in its object-position, the traced overlay
  // in its preserveAspectRatio — the two are always drawn to match (see the
  // .map-photo / .map-svg rules on each page), so reading each element's
  // own answer keeps a panel's layers registered by construction.
  function anchorOf(el) {
    if (el.tagName === 'IMG') {
      const pos = (getComputedStyle(el).objectPosition || '').trim();
      return /(^|\s)(0%|0px|top)$/.test(pos) ? 'top' : 'center';
    }
    const par = el.getAttribute('preserveAspectRatio') || '';
    return /YMin/.test(par) ? 'top' : 'center';
  }

  function collect() {
    const found = [];
    document.querySelectorAll('.map-panel').forEach((panel) => {
      const els = new Set();
      panel.querySelectorAll('img.map-photo, svg.map-svg').forEach(el => els.add(el));
      // Kütüphane's phone overlay is a SIBLING of the panel, not a child of
      // it (it has to escape the panel's stacking context to be touchable at
      // all — see its markup comment there). It is still the same drawing
      // laid over the same box, so it moves with it or the countries stop
      // matching their coastlines.
      const parent = panel.parentElement;
      if (parent) parent.querySelectorAll(':scope > svg.map-svg').forEach(el => els.add(el));
      if (!els.size) return;
      found.push({
        panel,
        layers: Array.from(els).map(el => ({ el, anchor: anchorOf(el) })),
        maxX: 0, maxY: 0, lastX: NaN, lastY: NaN,
      });
    });
    groups = found;
    measure();
  }

  // The window's own box — .map-panel is never transformed, so its rect is
  // always the untouched one. Every layer covers exactly this box (the
  // in-panel ones by inset:0, Kütüphane's sibling overlay by being fixed to
  // the same full-screen rect), so one measurement serves all of them.
  function measure() {
    for (const g of groups) {
      const r = g.panel.getBoundingClientRect();
      g.maxX = r.width * (OVERSCAN - 1) / 2;
      g.maxY = r.height * (OVERSCAN - 1) / 2;
    }
  }

  function apply() {
    for (const g of groups) {
      const x = curX * g.maxX;
      const y = curY * g.maxY;
      if (Math.abs(x - g.lastX) < MIN_STEP && Math.abs(y - g.lastY) < MIN_STEP) continue;
      g.lastX = x; g.lastY = y;
      for (const layer of g.layers) {
        layer.el.style.transform =
          'translate3d(' + x.toFixed(2) + 'px, ' + y.toFixed(2) + 'px, 0) scale(' + OVERSCAN + ')';
      }
    }
  }

  function step() {
    frame = 0;
    const dx = tgtX - curX;
    const dy = tgtY - curY;
    curX += dx * EASE;
    curY += dy * EASE;
    apply();
    // Keep the loop alive only while there is somewhere left to go — a phone
    // lying still on a table should not be repainting the map 60 times a
    // second.
    if (Math.abs(dx) > 0.0008 || Math.abs(dy) > 0.0008) frame = requestAnimationFrame(step);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(step);
  }

  // The sensor reports the DEVICE's axes; what the drift needs is the
  // SCREEN's. They coincide in portrait and swap in landscape.
  function toScreenAxes(beta, gamma) {
    const angle = (global.screen && global.screen.orientation && global.screen.orientation.angle) ||
                  global.orientation || 0;
    switch (angle) {
      case 90:  return { x: beta,   y: -gamma };
      case 180: return { x: -gamma, y: -beta  };
      case 270:
      case -90: return { x: -beta,  y: gamma  };
      default:  return { x: gamma,  y: beta   };
    }
  }

  // beta wraps at ±180, so a pose either side of the wrap is a small tilt
  // apart, not a 350° one.
  function wrap(d) {
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }
  function clamp1(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const s = toScreenAxes(e.beta, e.gamma);

    // The first reading defines "level": whatever pose the phone was already
    // being held in when the effect started is the middle of the range, so a
    // reader lying on a sofa gets the same amount of map on either side as
    // one sitting upright.
    if (baseX === null) { baseX = s.x; baseY = s.y; }

    const ox = wrap(s.x - baseX);
    const oy = wrap(s.y - baseY);

    // Against the tilt: dropping the right edge of the phone should show
    // more of the map's right side, which means the drawing slides left —
    // the same way the view through a window moves when you lean.
    tgtX = -clamp1(ox / MAX_TILT);
    tgtY = -clamp1(oy / MAX_TILT);

    // Only a tilt held past the end of the range moves the neutral pose.
    if (Math.abs(ox) > MAX_TILT) baseX += (ox - Math.sign(ox) * MAX_TILT) * REPOSE;
    if (Math.abs(oy) > MAX_TILT) baseY += (oy - Math.sign(oy) * MAX_TILT) * REPOSE;

    if (!live) firstReading();
    schedule();
  }

  // The overscan arrives with the first reading rather than at load: until
  // the sensor has actually answered, the map has no business being drawn at
  // anything other than its own size. Eased in once, so it grows into place
  // instead of popping, and the easing is dropped immediately afterwards —
  // a transition left on would lag the drift behind the phone.
  function firstReading() {
    live = true;
    for (const g of groups) {
      for (const layer of g.layers) {
        layer.el.style.transformOrigin = layer.anchor === 'top' ? '50% 0%' : '50% 50%';
        layer.el.style.willChange = 'transform';
        layer.el.style.transition = 'transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1)';
      }
    }
    setTimeout(() => {
      for (const g of groups) {
        for (const layer of g.layers) layer.el.style.transition = '';
      }
    }, 520);
  }

  function clearLayers() {
    for (const g of groups) {
      g.lastX = g.lastY = NaN;
      for (const layer of g.layers) {
        layer.el.style.transform = '';
        layer.el.style.transformOrigin = '';
        layer.el.style.willChange = '';
        layer.el.style.transition = '';
      }
    }
  }

  function startListening() {
    if (listening) return;
    listening = true;
    global.addEventListener('deviceorientation', onOrient);
  }
  function stopListening() {
    if (!listening) return;
    listening = false;
    global.removeEventListener('deviceorientation', onOrient);
  }

  // iOS 13+ gates the reading behind a permission that can only be asked for
  // from inside a user gesture. Asked once per session, on the first tap
  // anywhere — never on load, which is both a rule (the request is dropped
  // outside a gesture) and a courtesy (a system dialog before the reader has
  // touched anything). The native app needs NSMotionUsageDescription in
  // ios/App/App/Info.plist for this same prompt.
  function ensurePermission() {
    const D = global.DeviceOrientationEvent;
    if (!D) return Promise.resolve(false);
    if (typeof D.requestPermission !== 'function') return Promise.resolve(true);
    if (readPerm() === 'denied') return Promise.resolve(false);
    return new Promise((resolve) => {
      const ask = () => {
        document.removeEventListener('touchend', ask, true);
        document.removeEventListener('click', ask, true);
        let p;
        try { p = D.requestPermission(); } catch (e) { resolve(false); return; }
        Promise.resolve(p).then((res) => {
          writePerm(res);
          resolve(res === 'granted');
        }).catch(() => resolve(false));
      };
      document.addEventListener('touchend', ask, true);
      document.addEventListener('click', ask, true);
    });
  }

  let started = false;
  function start() {
    if (started) return;
    if (!isPhone() || reducedMotion()) return;
    if (!('DeviceOrientationEvent' in global)) return;
    started = true;
    collect();
    ensurePermission().then((ok) => {
      if (!ok) { started = false; return; }
      startListening();
    });
  }

  // A virtual navigation (router.js) swaps #ist-content wholesale, so the
  // map that is on screen after one is a different node from the one that
  // was drifting before it. Re-collect, and carry the current drift onto the
  // new drawing without the entrance easing — the page is already sliding,
  // and a map easing separately inside it reads as two arrivals.
  function refresh() {
    if (!started) { start(); return; }
    collect();
    if (!live) return;
    for (const g of groups) {
      for (const layer of g.layers) {
        layer.el.style.transformOrigin = layer.anchor === 'top' ? '50% 0%' : '50% 50%';
        layer.el.style.willChange = 'transform';
      }
    }
    apply();
  }

  global.addEventListener('resize', () => {
    if (!started) { start(); return; }
    if (!isPhone()) {
      stopListening();
      clearLayers();
      started = false;
      live = false;
      return;
    }
    measure();
    apply();
  });

  global.addEventListener('orientationchange', () => {
    // The screen's axes just changed under the sensor's, so the pose that was
    // "level" no longer means anything — take the next reading as the new one.
    baseX = baseY = null;
    setTimeout(() => { measure(); apply(); }, 250);
  });

  // A phone in a pocket is still tilting; nothing needs drawing while the
  // page isn't being looked at.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopListening();
    } else if (started && readPerm() !== 'denied') {
      baseX = baseY = null; // they may be holding it differently now
      startListening();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  global.IstMapParallax = { refresh, measure };
})(window);
