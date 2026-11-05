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

  // ══════════════════════════════════════════════════════════════════
  // THE ADMIN'S OWN COLOURS — site-wide overrides, and the preview pin
  // ──────────────────────────────────────────────────────────────────
  // admin.html's Renkler section lets the admin change any colour on the
  // site, separately in each of the four states (siyah-beyaz / kahverengi
  // × gündüz / gece). What it publishes is one JSON row,
  // site_palette 'live' (db/site_palette.sql):
  //
  //   { v: 1, states: { 'mono-light': { tokens: { '--ink': '#111' },
  //                                     rules:  [ { sel, prop, val, page } ] },
  //                     'mono-dark': …, 'earth-light': …, 'earth-dark': … } }
  //
  // `tokens` re-declare a :root token in that state; `rules` re-declare one
  // property on one selector (a colour typed straight into a page's own
  // stylesheet, or a token re-pointed on an element rather than on :root).
  // Both become one <style> element at a specificity no palette block can
  // reach (:root:root + both attributes), so the stylesheets themselves
  // stay exactly as written and turning the whole thing off is deleting
  // one row.
  //
  // Cached in localStorage so a page paints in the admin's colours on its
  // first frame; re-read from the database on every load and repainted if
  // it moved. A database without the table answers an error, which keeps
  // whatever was cached (nothing, on a fresh device) -- the site's own
  // colours.
  //
  // THE PREVIEW PIN is the admin's phone: while it is set, this window
  // ignores both the member's palette and the sun and shows the state the
  // admin picked, painted with the admin's unpublished draft. It is never
  // written anywhere -- it lives on the window -- and it is handed down to
  // a same-origin child frame (a game opened inside the app) through
  // window.__istPalettePreview, so a game opened in the preview is in the
  // same state as the app around it.
  const SB_URL = 'https://fgxispjoiynnoqitwpks.supabase.co';
  const SB_KEY = 'sb_publishable_iCNHaPaYLC-WRfmsfNPxYg_x2XJtI9Z';
  const OVERRIDES_KEY = 'istanbulite_palette_overrides';
  const STYLE_ID = 'ist-palette-overrides';

  function readCachedOverrides() {
    try {
      const raw = localStorage.getItem(OVERRIDES_KEY);
      const o = raw ? JSON.parse(raw) : null;
      return o && typeof o === 'object' ? o : null;
    } catch (e) { return null; }
  }
  let published = readCachedOverrides();

  let preview = null;   // { palette, theme, overrides } while pinned
  try {
    if (global.parent && global.parent !== global && global.parent.__istPalettePreview) {
      preview = JSON.parse(JSON.stringify(global.parent.__istPalettePreview));
      global.__istPalettePreview = preview;
    }
  } catch (e) { /* a cross-origin parent: no pin */ }

  function effPalette() { return (preview && VALID.has(preview.palette)) ? preview.palette : current; }
  function effTheme() {
    return (preview && (preview.theme === 'light' || preview.theme === 'dark')) ? preview.theme : currentTheme;
  }

  // The first compound of a selector -- up to the first combinator outside
  // brackets and parens. A selector that already starts on the root
  // (`html.ist-map-ink …`, `:root[data-theme="dark"] …`) has the state
  // attributes merged INTO that compound; anything else is scoped under
  // the root as a descendant.
  function scopeSelector(sel, attrs) {
    sel = String(sel || '').trim();
    let depth = 0, i = 0;
    for (; i < sel.length; i++) {
      const ch = sel[i];
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if (depth === 0 && /[\s>+~]/.test(ch)) break;
    }
    const head = sel.slice(0, i), rest = sel.slice(i);
    if (/^(html|:root)/i.test(head) && !/::/.test(head)) return head + ':root' + attrs + rest;
    return ':root:root' + attrs + ' ' + sel;
  }

  // Which page a page-scoped rule belongs to: a colour typed into one
  // page's own <style> must not land on a same-named class on another.
  function pageName() {
    try {
      const f = (location.pathname.split('/').pop() || 'index.html').replace(/\.html?$/i, '');
      return f || 'index';
    } catch (e) { return ''; }
  }

  function safeVal(v) { return String(v == null ? '' : v).replace(/[;{}<>]/g, ''); }
  function safeName(n) { return /^--[\w-]+$/.test(n) ? n : null; }

  function overridesCSS(over, onlyPage) {
    if (!over || !over.states) return '';
    const page = onlyPage === undefined ? pageName() : onlyPage;
    let css = '';
    for (const key of Object.keys(over.states)) {
      const m = /^(mono|earth)-(light|dark)$/.exec(key);
      if (!m) continue;
      const st = over.states[key] || {};
      const attrs = '[data-palette="' + m[1] + '"][data-theme="' + m[2] + '"]';
      const toks = Object.keys(st.tokens || {}).filter(safeName);
      if (toks.length) {
        css += ':root:root' + attrs + ' {\n' +
          toks.map(k => '  ' + k + ': ' + safeVal(st.tokens[k]) + ' !important;').join('\n') + '\n}\n';
      }
      for (const r of (st.rules || [])) {
        if (!r || !r.sel || !r.prop) continue;
        if (r.page && page !== null && r.page !== page) continue;
        if (!/^(--[\w-]+|[a-z-]+)$/.test(r.prop)) continue;
        css += scopeSelector(r.sel, attrs) + ' { ' + r.prop + ': ' + safeVal(r.val) + ' !important; }\n';
      }
    }
    return css;
  }

  function writeOverrideStyle() {
    try {
      const css = overridesCSS(preview ? preview.overrides : published);
      let el = document.getElementById(STYLE_ID);
      if (!css) { if (el) el.textContent = ''; return; }
      if (!el) {
        el = document.createElement('style');
        el.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(el);
      }
      if (el.textContent !== css) el.textContent = css;
    } catch (e) { /* the site's own colours */ }
  }

  function fetchPublished() {
    try {
      if (!global.fetch) return;
      global.fetch(SB_URL + '/rest/v1/site_palette?id=eq.live&select=overrides', {
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY },
        cache: 'no-store',
      })
        .then(r => (r.ok ? r.json() : null))
        .then(rows => {
          if (!Array.isArray(rows)) return;
          const o = (rows[0] && rows[0].overrides) || null;
          if (JSON.stringify(o) === JSON.stringify(published)) return;
          published = o;
          try {
            if (o) localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
            else localStorage.removeItem(OVERRIDES_KEY);
          } catch (e) { /* ignore */ }
          if (!preview) apply();
        })
        .catch(() => { /* keep the cache */ });
    } catch (e) { /* keep the cache */ }
  }

  // The admin's phone: pin a state and paint a draft, or unpin (null).
  // Handed down to every same-origin child frame that has this module.
  function setPreview(state) {
    preview = state ? JSON.parse(JSON.stringify(state)) : null;
    try { global.__istPalettePreview = preview; } catch (e) { /* ignore */ }
    apply();
    try {
      for (let i = 0; i < global.frames.length; i++) {
        try { const P = global.frames[i].Palette; if (P && P.preview) P.preview(preview); } catch (e) { /* cross-origin */ }
      }
    } catch (e) { /* ignore */ }
  }

  function apply() {
    document.documentElement.setAttribute('data-palette', effPalette());
    document.documentElement.setAttribute('data-theme', effTheme());
    writeOverrideStyle();
    syncThemeColor();
    // The hand-drawn maps read this palette too (map-ink.js). Repainted
    // from here rather than from a watcher of their own, so a sunset
    // moves the city and the page it is drawn on in the same frame.
    try { if (global.IstMapInk) global.IstMapInk.refresh(); } catch (e) { /* ignore */ }
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

  // Mirrors a token from frames.css onto <meta name="theme-color">, so the
  // iOS/Android status bar and Safari's surrounding chrome match the page
  // instead of defaulting to black in dark mode. frames.css loads after
  // this script, so the very first call (before its rules exist) is a
  // no-op -- window's load event below re-fires it once styles are in.
  //
  // Which token depends on what actually sits at the screen's edge. A page
  // carrying the fixed bottom tab bar (`.section-rule`, every carousel and
  // game page) has that bar's own dark --navbar-ink running edge to edge,
  // top and bottom -- so Safari's own toolbar, which sits flush against
  // the bottom of it, has to match --navbar-ink or the seam between the
  // app's own bar and the browser's shows as two different colors. A page
  // with no bottom bar (index.html's login gate, gizlilik.html) has only
  // its own paper at the edge, so it still reads --page-bg.
  function syncThemeColor() {
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) return;
      const token = document.querySelector('.section-rule') ? '--navbar-ink' : '--page-bg';
      const bg = getComputedStyle(document.documentElement)
        .getPropertyValue(token).trim();
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
    if (effPalette() !== 'earth') return url;
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
  fetchPublished();

  global.Palette = {
    setPalette,
    syncFromSupabase,
    avatarSrc,
    // The admin's colour desk (admin.html, Renkler).
    preview: setPreview,
    overridesCSS,
    scopeSelector,
    refetch: fetchPublished,
    get published() { return published; },
    get previewing() { return !!preview; },
    // What is ON SCREEN: the pinned state while the admin's phone is
    // previewing one, otherwise the member's palette and the sun.
    get current() { return effPalette(); },
    get currentTheme() { return effTheme(); },
  };
})(window);
