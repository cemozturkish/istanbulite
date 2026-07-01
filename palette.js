// Shared palette helper for Istanbulite.
// Reads `profiles.palette_pref` (cached in localStorage for instant first paint),
// sets data-palette on <html>, and exposes a setter the AYARLAR panel calls.
//
// Values: 'earth' (default — warm cream / brown) | 'mono' (siyah-beyaz).
// Pages declare warm/earth tokens inline; palette.css overrides them when
// data-palette="mono". See palette.css for the override block.

(function (global) {
  const STORAGE_KEY = 'istanbulite_palette_pref';
  const VALID = new Set(['mono', 'earth']);

  function readCached() {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return VALID.has(v) ? v : 'earth';
    } catch (e) { return 'earth'; }
  }
  function writeCached(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }

  let current = readCached();

  function apply() {
    document.documentElement.setAttribute('data-palette', current);
  }

  function setPalette(v) {
    if (!VALID.has(v)) v = 'earth';
    current = v;
    writeCached(v);
    apply();
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

  // Apply ASAP so the page renders in the right palette without flicker.
  apply();

  global.Palette = {
    setPalette,
    syncFromSupabase,
    get current() { return current; },
  };
})(window);
