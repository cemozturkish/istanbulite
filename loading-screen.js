// Shared sea-rising loading screen for Istanbulite's entry points
// (index.html and anahane.html).
//
// NOTE: index.html and anahane.html load this with a `?v=N` cache-busting
// suffix (no build step to hash filenames). Bump N in both places whenever
// this file or loading-screen.css changes, so browsers/CDN don't serve a
// stale copy of one alongside a fresh copy of the other — a mismatch here
// (old CSS with new markup, etc.) is what causes visibly broken frames.
//
// Frame advances with real elapsed time,
// capped one frame short of full until the caller calls resolve() — so a
// slow auth check holds mid-fill instead of freezing on the "done" frame.
// Minimum 0.2s/frame (2s total for 10 frames) so a fast auth check still
// plays the full smooth rise instead of jumping straight to the end.
//
// Frames only ever advance to images that have actually finished
// downloading (see `loaded`) — on a slow connection the rise just takes
// a little longer instead of flashing blank/broken frames. The two
// stacked <img> layers crossfade into each other for each new frame so
// the rise reads as smooth motion rather than a slideshow of stills.
//
// Only plays on an actual entry into the site: the first page load of
// this browser tab/session, or an explicit refresh. Clicking between
// pages that are already inside the site (e.g. Kütüphane -> Hane) is a
// full page load too, but it's not "entering" the site, so it's skipped
// there — the auth check still runs, it just doesn't animate.
//
// Usage:
//   const resolveLoading = LoadingScreen.start(() => { ...reveal content... });
//   // later, once the real async work (e.g. auth check) is done:
//   resolveLoading();

(function (global) {
  const FRAME_COUNT = 10;
  const FRAME_MS = 200;
  const MIN_MS = FRAME_COUNT * FRAME_MS;
  const ENTERED_KEY = 'istanbulite_entered';
  const frameSrc = n => `assets/loading/logo-dark-mono-${String(n).padStart(2, '0')}.jpg`;

  function isReload() {
    try {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length) return entries[0].type === 'reload';
      if (performance.navigation) return performance.navigation.type === 1;
    } catch (e) { /* fall through */ }
    return false;
  }

  function shouldPlay() {
    try {
      if (isReload()) return true;
      return sessionStorage.getItem(ENTERED_KEY) !== '1';
    } catch (e) {
      return true; // storage unavailable — fail open, don't silently break entry UX
    }
  }

  function markEntered() {
    try { sessionStorage.setItem(ENTERED_KEY, '1'); } catch (e) { /* ignore */ }
  }

  function start(onFinish) {
    const overlay = document.getElementById('loading-overlay');
    const back = document.getElementById('loading-frame-back');
    const front = document.getElementById('loading-frame-front');
    if (!overlay || !back || !front) { onFinish(); return () => {}; }

    if (!shouldPlay()) {
      overlay.remove();
      let resolved = false;
      return function resolve() {
        if (resolved) return;
        resolved = true;
        onFinish();
      };
    }
    markEntered();

    // Preload every frame and track which ones have actually finished
    // downloading — frame 1 is already showing via the initial markup.
    const loaded = new Array(FRAME_COUNT + 1).fill(false);
    loaded[1] = true;
    for (let i = 2; i <= FRAME_COUNT; i++) {
      const im = new Image();
      im.onload = () => { loaded[i] = true; };
      im.src = frameSrc(i);
    }

    function highestLoadedUpTo(n) {
      let f = 1;
      for (let i = 1; i <= n; i++) { if (loaded[i]) f = i; else break; }
      return f;
    }

    // Crossfade the front layer to a new frame, then promote it onto the
    // back layer once the fade completes so front is ready for the next one.
    front.addEventListener('transitionend', () => {
      if (front.style.opacity !== '1') return;
      back.src = front.src;
      front.style.transition = 'none';
      front.style.opacity = '0';
      void front.offsetWidth; // force reflow before re-enabling the transition
      front.style.transition = '';
    });

    let resolved = false;
    let currentFrame = 1;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const timeFrame = Math.floor(elapsed / FRAME_MS) + 1;
      const cap = resolved ? FRAME_COUNT : FRAME_COUNT - 1;
      const target = highestLoadedUpTo(Math.min(timeFrame, cap));

      if (target !== currentFrame) {
        currentFrame = target;
        front.src = frameSrc(target);
        requestAnimationFrame(() => { front.style.opacity = '1'; });
      }

      if (resolved && elapsed >= MIN_MS && currentFrame >= FRAME_COUNT) {
        overlay.classList.add('loading-overlay-hide');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
        onFinish();
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    return function resolve() { resolved = true; };
  }

  global.LoadingScreen = { start };
})(window);
