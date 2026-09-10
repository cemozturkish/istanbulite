// Shared palette helper for Istanbulite.
// Reads `profiles.palette_pref` (cached in localStorage for instant first paint),
// sets data-palette on <html>, and exposes a setter the AYARLAR panel calls.
// Also sets data-theme (Açık/Koyu) — but that one is never a member's
// choice. It follows the sun over Istanbul (IstDate.isDaytime(), see
// ist-date.js): light while it's up, dark once it has set. Every page that
// loads this must also load ist-date.js first.
//
// Values: 'mono' (default — siyah-beyaz) | 'earth' (warm cream / brown).
// Pages declare warm/earth tokens inline; palette.css overrides them when
// data-palette="mono". See palette.css for the override block.

(function (global) {
  const STORAGE_KEY = 'istanbulite_palette_pref';
  const VALID = new Set(['mono', 'earth']);
  // Only a fallback for the instant between page load and IstDate being
  // reachable (or the rare case it errors) — never a choice of its own.
  const THEME_CACHE_KEY = 'istanbulite_theme_cache';

  function readCached() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return VALID.has(v) ? v : 'mono';
    } catch (e) { return 'mono'; }
  }
  function writeCached(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }

  let current = readCached();

  // The sun over Istanbul is the only thing that decides light vs. dark —
  // see ist-date.js's isDaytime(). Falls back to whatever was cached last
  // (and finally to light) only if IstDate itself is unreachable.
  function computeTheme() {
    try {
      if (global.IstDate && global.IstDate.isDaytime) {
        const v = global.IstDate.isDaytime() ? 'light' : 'dark';
        try { localStorage.setItem(THEME_CACHE_KEY, v); } catch (e) { /* ignore */ }
        return v;
      }
    } catch (e) { /* fall through to cache */ }
    try {
      const cached = localStorage.getItem(THEME_CACHE_KEY);
      if (cached === 'light' || cached === 'dark') return cached;
    } catch (e) { /* ignore */ }
    return 'light';
  }

  let currentTheme = computeTheme();

  function apply() {
    document.documentElement.setAttribute('data-palette', current);
    document.documentElement.setAttribute('data-theme', currentTheme);
    syncThemeColor();
  }

  function setPalette(v) {
    if (!VALID.has(v)) v = 'mono';
    current = v;
    writeCached(v);
    apply();
  }

  // Re-derives the theme from the sun's own position and repaints if it
  // moved. Called on a timer and whenever the tab becomes visible again,
  // since a member can easily have the app open across an actual sunset.
  function refreshTheme() {
    const v = computeTheme();
    if (v === currentTheme) return;
    currentTheme = v;
    apply();
  }

  // Mirrors --page-bg (frames.css, varies by palette + light/dark theme)
  // onto <meta name="theme-color">, so the iOS/Android status bar and
  // Safari's surrounding chrome match the page instead of defaulting to
  // black in dark mode. frames.css loads after this script, so the very
  // first call (before its rules exist) is a no-op -- window's load event
  // below re-fires it once styles are in.
  function syncThemeColor() {
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) return;
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue('--page-bg').trim();
      if (bg) meta.setAttribute('content', bg);
    } catch (e) { /* ignore */ }
  }

  try {
    window.addEventListener('load', syncThemeColor);
    // The sun doesn't jump, but a member can leave the app open across an
    // actual sunrise/sunset — a minute's grain is close enough to feel
    // instant without polling harder than the change ever moves.
    setInterval(refreshTheme, 60000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshTheme();
    });
  } catch (e) { /* ignore */ }

  // Historically, avatar preset images shipped in two color variants (e.g.
  // foo.png / foo-earth.png) and this mapped the stored (mono/canonical)
  // filename to whichever variant matched the *viewer's own* palette_pref —
  // never the profile owner's. The only avatar_url value left that still
  // goes through this is the locked Sözcü special (see avatar.js); the
  // layered bald-base/hair-overlay avatar has no color variants yet.
  function avatarSrc(url) {
    if (!url) return url;
    if (current !== 'earth') return url;
    return url.replace(/(\.[^./]+)$/, '-earth$1');
  }

  async function syncFromSupabase(sb, userId) {
    if (!sb || !userId) return;
    try {
      const { data } = await sb.from('profiles')
        .select('palette_pref').eq('id', userId).maybeSingle();
      // If DB has a known value, adopt it. If null/unset, KEEP the cached
      // choice — otherwise a freshly saved 'mono' on one page would flip
      // back to 'earth' on the next page before its update propagates.
      if (data && VALID.has(data.palette_pref)) setPalette(data.palette_pref);
    } catch (e) { /* keep cached value */ }
  }

  // Apply ASAP so the page renders in the right palette/theme without flicker.
  apply();

  global.Palette = {
    setPalette,
    syncFromSupabase,
    avatarSrc,
    get current() { return current; },
    get currentTheme() { return currentTheme; },
  };
})(window);
