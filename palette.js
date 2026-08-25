// Shared palette helper for Istanbulite.
// Reads `profiles.palette_pref` (cached in localStorage for instant first paint),
// sets data-palette on <html>, and exposes a setter the AYARLAR panel calls.
// Does the same for `profiles.theme_pref` (Görünüm, Açık/Koyu) as data-theme.
//
// Values: 'mono' (default — siyah-beyaz) | 'earth' (warm cream / brown).
// Pages declare warm/earth tokens inline; palette.css overrides them when
// data-palette="mono". See palette.css for the override block.
//
// theme_pref: 'light' (default) | 'dark'. Mono has no dark variant, so
// data-theme only ever changes anything under data-palette="earth" — see
// the `:root[data-palette="earth"][data-theme="…"]` blocks in frames.css.
// Without it, earth's appearance just followed the OS's prefers-color-scheme
// with no way to override it, so a member's own Açık/Koyu pick in the
// profile sheet was stored but never actually applied.

(function (global) {
  const STORAGE_KEY = 'istanbulite_palette_pref';
  const VALID = new Set(['mono', 'earth']);
  const THEME_STORAGE_KEY = 'istanbulite_theme_pref';
  const VALID_THEME = new Set(['light', 'dark']);

  function readCached() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return VALID.has(v) ? v : 'mono';
    } catch (e) { return 'mono'; }
  }
  function writeCached(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }
  function readCachedTheme() {
    try {
      const v = localStorage.getItem(THEME_STORAGE_KEY);
      return VALID_THEME.has(v) ? v : 'light';
    } catch (e) { return 'light'; }
  }
  function writeCachedTheme(v) {
    try { localStorage.setItem(THEME_STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }

  let current = readCached();
  let currentTheme = readCachedTheme();

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

  function setTheme(v) {
    if (!VALID_THEME.has(v)) v = 'light';
    currentTheme = v;
    writeCachedTheme(v);
    apply();
  }

  // Mirrors --page-bg (frames.css, varies by palette + OS light/dark
  // scheme) onto <meta name="theme-color">, so the iOS/Android status
  // bar and Safari's surrounding chrome match the page instead of
  // defaulting to black in dark mode. frames.css loads after this
  // script, so the very first call (before its rules exist) is a
  // no-op -- window's load event below re-fires it once styles are in.
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
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', syncThemeColor);
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
        .select('palette_pref, theme_pref').eq('id', userId).maybeSingle();
      // If DB has a known value, adopt it. If null/unset, KEEP the cached
      // choice — otherwise a freshly saved 'mono' on one page would flip
      // back to 'earth' on the next page before its update propagates.
      if (data && VALID.has(data.palette_pref)) setPalette(data.palette_pref);
      // Same race as palette_pref above: only adopt a known DB value,
      // otherwise keep the cached choice (which already defaults to
      // 'light', matching how profile-card.js normalizes a null column).
      if (data && VALID_THEME.has(data.theme_pref)) setTheme(data.theme_pref);
    } catch (e) { /* keep cached value */ }
  }

  // Apply ASAP so the page renders in the right palette without flicker.
  apply();

  global.Palette = {
    setPalette,
    setTheme,
    syncFromSupabase,
    avatarSrc,
    get current() { return current; },
    get currentTheme() { return currentTheme; },
  };
})(window);
