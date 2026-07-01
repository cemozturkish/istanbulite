// Shared sea-rising loading screen for Istanbulite's entry points
// (index.html and anahane.html). Frame advances with real elapsed time,
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
// Usage:
//   const resolveLoading = LoadingScreen.start(() => { ...reveal content... });
//   // later, once the real async work (e.g. auth check) is done:
//   resolveLoading();

(function (global) {
  const FRAME_COUNT = 10;
  const FRAME_MS = 200;
  const MIN_MS = FRAME_COUNT * FRAME_MS;
  const frameSrc = n => `assets/loading/logo-dark-mono-${String(n).padStart(2, '0')}.jpg`;

  function start(onFinish) {
    const overlay = document.getElementById('loading-overlay');
    const back = document.getElementById('loading-frame-back');
    const front = document.getElementById('loading-frame-front');
    if (!overlay || !back || !front) { onFinish(); return () => {}; }

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
