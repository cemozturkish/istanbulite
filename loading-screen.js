// Shared sea-rising loading screen for Istanbulite's entry points
// (index.html and anahane.html). Frame advances with real elapsed time,
// capped one frame short of full until the caller calls resolve() — so a
// slow auth check holds mid-fill instead of freezing on the "done" frame.
// Minimum 0.2s/frame (2s total for 10 frames) so a fast auth check still
// plays the full smooth rise instead of jumping straight to the end.
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
    const img = document.getElementById('loading-frame');
    if (!overlay || !img) { onFinish(); return () => {}; }

    for (let i = 1; i <= FRAME_COUNT; i++) new Image().src = frameSrc(i);

    let resolved = false;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const timeFrame = Math.floor(elapsed / FRAME_MS) + 1;
      const cap = resolved ? FRAME_COUNT : FRAME_COUNT - 1;
      const frame = Math.min(timeFrame, cap);
      img.src = frameSrc(frame);

      if (resolved && elapsed >= MIN_MS && frame >= FRAME_COUNT) {
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
