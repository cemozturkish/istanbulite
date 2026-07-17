// Fixes a WKWebView timing bug (Capacitor iOS app only): on every fresh
// page load, env(safe-area-inset-top) reads 0 for a real, measured window
// (~80-200ms in testing) after the document starts executing, then
// self-corrects on its own once the native safe-area value becomes
// available -- no user gesture required, confirmed via on-device
// diagnostics. Forcing a JS reflow does NOT shorten this window; the
// delay is native-side, not a stale WebKit style cache.
//
// Elements whose position depends on env(safe-area-inset-top) (the
// floating profile card and the map below it) start hidden via the
// `ist-safe-area-pending` class on <html> (present in the raw HTML so
// there's no flash of the wrong position), and this script removes that
// class the moment the real value is confirmed -- or after a timeout, so
// devices with a genuinely-zero inset (no notch) aren't stuck waiting.
(function () {
  // Only the native app's WKWebView has shown this delay -- skip the
  // wait entirely on the plain website so mobile Safari visitors never
  // see the extra (unneeded) hidden window.
  if (!window.Capacitor) {
    document.documentElement.classList.remove('ist-safe-area-pending');
    return;
  }

  var MAX_WAIT_MS = 400;

  function measureSafeTop() {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:-9999px;padding-top:env(safe-area-inset-top);';
    document.documentElement.appendChild(probe);
    var v = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    document.documentElement.removeChild(probe);
    return v;
  }

  var start = Date.now();
  function check() {
    if (measureSafeTop() > 0 || Date.now() - start > MAX_WAIT_MS) {
      document.documentElement.classList.remove('ist-safe-area-pending');
      return;
    }
    requestAnimationFrame(check);
  }
  check();
})();
