// Pinch-to-zoom + drag-to-pan for the interactive Istanbul map
// (.map-panel > .map-zoom-layer, wrapping map-photo/map-svg so the image
// and the hit-region overlay always move together). 1x/no-offset is the
// floor -- pinching back out (or just not touching it) always lands
// exactly on the existing default view, and panning is clamped so the
// map can never show a gap past its own edge.
//
// Single-finger touches only pan once already zoomed in -- at rest
// (scale 1) they're left alone entirely, so tapping a district and
// swiping to switch tabs both keep working exactly as before.
//
// At rest the map sits in its normal small in-flow square, same as
// always. Neither hane nor kahvehane's page is meant to scroll, so once
// zoomed in .map-panel switches to position:fixed at its own current
// on-screen rect (see setZoomedMode) -- that escapes it from the grid
// entirely, exactly like the desktop layout's own full-bleed map already
// does, so the larger scaled content can spill past its little square
// into the rest of the screen without ever growing the page's own
// scrollable area. .col-left/.col-right sit above it in z-index (see
// each page's CSS) so news/events (or comments/games) stay visible,
// covering the map wherever they overlap it -- which is fine, expected.
(function (global) {
  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const MOVE_THRESHOLD = 6; // px of screen movement before a 1-finger touch counts as a drag, not a tap

  function initMapZoom(panel) {
    // A virtual navigation can call this again on a .map-panel it already
    // wired up (e.g. re-entering a cached page) -- guard so a revisit
    // doesn't double-register touch listeners on the same node.
    if (panel.dataset.mapZoomInit) return;
    panel.dataset.mapZoomInit = '1';

    const layer = panel.querySelector('.map-zoom-layer');
    if (!layer) return;

    let scale = 1, tx = 0, ty = 0;
    let panelW = 0, panelH = 0;
    let gesture = null;
    let zoomedMode = false;

    function measure() {
      if (zoomedMode) return; // fixed rect is pinned to the pre-zoom measurement, see setZoomedMode
      const r = panel.getBoundingClientRect();
      panelW = r.width;
      panelH = r.height;
    }
    measure();
    window.addEventListener('resize', () => { measure(); apply(); });

    // panel's parent (<main>, on every page that uses this) has no
    // explicit height of its own -- it's sized purely by .map-panel's
    // normal-flow height. Once the panel escapes to position:fixed
    // below, a parent with nothing else inside it collapses to ~0. On
    // anahane, where the whole page (#main-site) is what scrolls, that
    // collapse shrinks the scrollable content height out from under a
    // user who had scrolled into the news feed, and the browser clamps
    // their scroll position back up toward the top the instant it
    // happens -- reserving the parent's height explicitly here keeps
    // that from ever having anything to collapse into.
    function setZoomedMode(on) {
      if (on === zoomedMode) return;
      zoomedMode = on;
      const parentEl = panel.parentElement;
      if (on) {
        const r = panel.getBoundingClientRect();
        if (parentEl) parentEl.style.height = r.height + 'px';
        panel.style.top = r.top + 'px';
        panel.style.left = r.left + 'px';
        panel.style.width = r.width + 'px';
        panel.style.height = r.height + 'px';
        panel.classList.add('ist-zoomed');
      } else {
        panel.classList.remove('ist-zoomed');
        panel.style.top = panel.style.left = panel.style.width = panel.style.height = '';
        if (parentEl) parentEl.style.height = '';
      }
    }

    function clamp() {
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      setZoomedMode(scale > 1.001);
      // Once zoomed, .map-panel escapes to a fixed position (see above)
      // and can be covered by the rest of the page, so the pannable
      // content needs to cover the full viewport wherever it might peek
      // through -- not just its own little square. At scale 1 this
      // reduces to the original panelW/panelH bound (no pan allowed),
      // matching the un-zoomed default exactly.
      const coverW = Math.max(panelW, window.innerWidth);
      const coverH = Math.max(panelH, window.innerHeight);
      const maxX = Math.max(0, panelW * scale - coverW);
      const maxY = Math.max(0, panelH * scale - coverH);
      tx = Math.min(0, Math.max(-maxX, tx));
      ty = Math.min(0, Math.max(-maxY, ty));
    }

    function apply() {
      clamp();
      layer.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    }

    function touchPoints(e) {
      const r = panel.getBoundingClientRect();
      return Array.from(e.touches).map(t => ({ x: t.clientX - r.left, y: t.clientY - r.top }));
    }
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }

    // Anchors the gesture to whatever layer-space point is currently
    // under the touch(es), so zooming/panning tracks the fingers exactly
    // instead of drifting.
    function beginGesture(points, continuing) {
      const m = points.length === 2 ? mid(points[0], points[1]) : points[0];
      gesture = {
        count: points.length,
        startScale: scale,
        startDist: points.length === 2 ? dist(points[0], points[1]) : null,
        anchor: { x: (m.x - tx) / scale, y: (m.y - ty) / scale },
        startPoint: points[0],
        // Pinches, and a finger count change mid-gesture (e.g. lifting
        // one finger during a pinch), continue the existing drag rather
        // than re-requiring MOVE_THRESHOLD of movement before panning
        // resumes.
        moved: points.length === 2 || !!continuing,
      };
    }

    panel.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        e.stopPropagation();
        beginGesture(touchPoints(e));
      } else if (e.touches.length === 1) {
        if (scale > 1.001) {
          // Might be a pan (if zoomed) or just a tap -- keep the page's
          // swipe-to-navigate listener out either way, but don't
          // preventDefault yet so a genuine tap still fires its click.
          e.stopPropagation();
          beginGesture(touchPoints(e));
        } else {
          gesture = null;
        }
      } else {
        gesture = null;
      }
    }, { passive: false });

    panel.addEventListener('touchmove', (e) => {
      if (!gesture) return;
      const points = touchPoints(e);
      if (points.length !== gesture.count) {
        beginGesture(points, gesture.moved);
        return;
      }

      if (!gesture.moved) {
        if (dist(points[0], gesture.startPoint) < MOVE_THRESHOLD) return;
        gesture.moved = true;
      }
      e.preventDefault();

      const m = points.length === 2 ? mid(points[0], points[1]) : points[0];
      let newScale = gesture.startScale;
      if (points.length === 2) {
        newScale = gesture.startScale * (dist(points[0], points[1]) / gesture.startDist);
      }
      scale = newScale;
      tx = m.x - scale * gesture.anchor.x;
      ty = m.y - scale * gesture.anchor.y;
      apply();
    }, { passive: false });

    function onTouchEnd(e) {
      if (!gesture) return;
      const points = touchPoints(e);
      if (points.length > 0) {
        beginGesture(points, gesture.moved);
      } else {
        gesture = null;
      }
    }
    panel.addEventListener('touchend', onTouchEnd, { passive: true });
    panel.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  document.querySelectorAll('.map-panel').forEach(initMapZoom);

  // Exposed so a virtual navigation (see router.js) can (re-)initialize a
  // fresh .map-panel node after swapping #ist-content -- otherwise pinch
  // zoom would silently stop working the first time a user swipes away
  // from and back to a page with an interactive map.
  global.MapZoom = { init: initMapZoom };
})(window);
