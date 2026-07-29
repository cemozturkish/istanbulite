// ══════════════════════════════════════════════════════════════
// Shared shell for the Kütüphane / Hane / Kahvehane carousel.
//
// Owns the single Supabase client: no carousel page may declare its own
// `sb` / SUPABASE_URL / SUPABASE_ANON_KEY anymore — redeclaring a `const`
// with the same name as a second top-level statement in the same document
// throws a SyntaxError (`Identifier 'sb' has already been declared`), which
// is exactly what happens today if two of these pages' scripts ever ran in
// the same document. Also owns the shared clock (one setInterval instead of
// one per page) and a page-lifecycle registry that upcoming virtual
// navigation (client-side swap instead of a full reload) will drive.
//
// Include this script in <head>, right after the supabase-js@2 CDN tag and
// before i18n.js/palette.js — it must not be `defer` since profile-card.js/
// onboarding.js (both deferred) read IstRouter.sb when they run.
// ══════════════════════════════════════════════════════════════
(function (global) {
  const SUPABASE_URL = 'https://fgxispjoiynnoqitwpks.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_iCNHaPaYLC-WRfmsfNPxYg_x2XJtI9Z';
  const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const PAGES = ['kutuphane', 'anahane', 'kahvehane'];

  function currentPage() {
    const path = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    return PAGES.includes(path) ? path : PAGES[0];
  }

  // For pages that just want "redirect to index.html if not signed in"
  // (today's kutuphane.html/kahvehane.html behavior). anahane.html manages
  // its own login/signup overlay and session check, so it should not call
  // this — it would race anahane's own checkSession().
  async function requireSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { window.location.href = 'index.html'; return null; }
    return { session, user: session.user };
  }

  // ── Shared clock ──
  // Ticks the universal #time-line/#day-line/#date-line once per session
  // instead of once per page load. Pages that need extra per-tick work
  // (e.g. kahvehane's scoreboard countdown) register via onTick() instead
  // of running their own setInterval, so navigating away and back doesn't
  // accumulate duplicate timers.
  const tickListeners = [];
  function onTick(cb) { if (typeof cb === 'function') tickListeners.push(cb); }
  function offTick(cb) {
    const i = tickListeners.indexOf(cb);
    if (i !== -1) tickListeners.splice(i, 1);
  }
  function updateDateTime() {
    const now = new Date();
    const opts = { timeZone: 'Europe/Istanbul' };
    const en = global.I18N ? global.I18N.isEnglish() : false;
    const locale = en ? 'en-US' : 'tr-TR';
    const day = now.toLocaleDateString(locale, { ...opts, day: 'numeric' });
    const month = now.toLocaleDateString(locale, { ...opts, month: 'long' });
    const weekday = now.toLocaleDateString(locale, { ...opts, weekday: 'long' });
    const time = now.toLocaleTimeString(locale, { ...opts, hour: '2-digit', minute: '2-digit', hour12: en });
    const dateEl = document.getElementById('date-line');
    const dayEl = document.getElementById('day-line');
    const timeEl = document.getElementById('time-line');
    if (dateEl) dateEl.textContent = (day + ' ' + month).toUpperCase();
    if (dayEl) dayEl.textContent = weekday.toUpperCase();
    if (timeEl) timeEl.textContent = time;
  }
  function tick() {
    updateDateTime();
    tickListeners.forEach(cb => { try { cb(); } catch (e) { console.error(e); } });
  }
  function initClock() {
    updateDateTime();
    setInterval(tick, 60000);
    // i18n.js loads synchronously right after this script, so by
    // DOMContentLoaded it's guaranteed to be present.
    if (global.I18N) global.I18N.onChange(updateDateTime);
  }
  if (document.readyState !== 'loading') initClock();
  else document.addEventListener('DOMContentLoaded', initClock);

  // ── Page lifecycle registry ──
  // Each carousel page registers its mount/unmount pair here. Virtual
  // navigation (swapping #ist-content instead of a full reload) drives
  // this registry; until that lands, pages still invoke their own mount()
  // directly on load and register here only so the wiring is ready.
  const pages = {};
  function registerPage(name, lifecycle) { pages[name] = lifecycle; }

  // ── Virtual (client-side) navigation ──
  // Capacitor-only (see navigateTo's own guard): a real page load
  // (location.href) always has a moment where WKWebView shows nothing
  // painted yet, which read as a flash, and destroys/rebuilds the
  // floating profile card on every single swipe. This swaps only
  // #ist-content in place -- the profile card and nav bar (both outside
  // #ist-content, see each page's DOM) are never touched, so they
  // genuinely persist across navigations. The website (non-Capacitor)
  // keeps using the existing Cross-Document View Transitions path in
  // initSwipePagination below, untouched.
  //
  // Each page's whole CSS lives in its own inline <style data-page="X">
  // (see each page's <head>) -- on first visit this session that block
  // gets copied into this document's <head> too (deduped by the same
  // data-page marker) and every OTHER page's stylesheet gets `.disabled`
  // toggled off, so only ever one page's rules are live at once. That
  // avoids needing to rewrite/scope every individual selector across
  // three ~1500-line stylesheets.
  const pageCache = {}; // slug -> { styleCSS, contentHTML, overlayHTML, scriptText, title }

  async function ensurePageLoaded(slug) {
    if (pageCache[slug]) return pageCache[slug];
    const file = slug + '.html';
    const html = await fetch(file).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const styleEl = doc.querySelector('style[data-page="' + slug + '"]');
    const contentEl = doc.getElementById('ist-content');
    // Each page has exactly one big modal/overlay (anahane's
    // #detail-overlay, kahvehane's #game-overlay, kutuphane's
    // #reader-overlay) that lives as a sibling of #main-site, not inside
    // #ist-content -- kept outside so its position:fixed sheet can escape
    // #main-site's grid. That also means it never travels with a plain
    // #ist-content swap; capture it here so navigateTo can inject it
    // (once) alongside the content on this page's first virtual visit.
    let overlayHTML = '';
    const mainSiteEl = doc.getElementById('main-site');
    if (mainSiteEl) {
      let node = mainSiteEl.nextElementSibling;
      while (node && node.tagName !== 'SCRIPT') {
        overlayHTML += node.outerHTML;
        node = node.nextElementSibling;
      }
    }
    // The last bare (no src) <script> in the document is always this
    // page's big body script (mount/unmount + everything else) -- the
    // only other bare <script> is the small pre-body direction-seeding
    // one in <head>, which always comes first in document order.
    const bareScripts = doc.querySelectorAll('script:not([src])');
    const bigScript = bareScripts[bareScripts.length - 1];
    const cached = {
      styleCSS: styleEl ? styleEl.textContent : '',
      contentHTML: contentEl ? contentEl.innerHTML : '',
      overlayHTML,
      scriptText: bigScript ? bigScript.textContent : '',
      title: doc.title,
    };
    pageCache[slug] = cached;
    return cached;
  }

  function setActiveStylesheet(slug) {
    document.querySelectorAll('style[data-page]').forEach(s => {
      s.disabled = s.getAttribute('data-page') !== slug;
    });
  }

  let virtualNavInFlight = false;
  // The currently-displayed page, tracked independently of location.pathname
  // -- once pushState/popstate are in play, the URL can change (e.g. a
  // native back-gesture) *before* this function runs, so location isn't a
  // reliable source for "what was on screen a moment ago". Starts as
  // whichever page really loaded.
  let activeSlug = currentPage();

  // dir is 'forward' | 'backward', matching initSwipePagination's own
  // convention, so it can reuse the exact same exit/entrance CSS classes.
  // fromPopstate skips pushState (the URL already changed by the time a
  // popstate handler runs) -- see the popstate listener below.
  async function navigateTo(targetSlug, dir, fromPopstate) {
    if (virtualNavInFlight) return;
    if (!PAGES.includes(targetSlug)) return;
    const currentSlug = activeSlug;
    if (targetSlug === currentSlug) return;
    virtualNavInFlight = true;

    try {
      const exitClass = dir === 'forward' ? 'ist-exiting-forward' : 'ist-exiting-backward';
      document.body.classList.add(exitClass);
      await new Promise(resolve => setTimeout(resolve, 370)); // matches the swipe-pagination transition's 400ms minus a 30ms head start

      if (pages[currentSlug] && pages[currentSlug].unmount) {
        try { pages[currentSlug].unmount(); } catch (e) { console.error(e); }
      }

      const cached = await ensurePageLoaded(targetSlug);

      if (!document.querySelector('style[data-page="' + targetSlug + '"]')) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-page', targetSlug);
        styleEl.textContent = cached.styleCSS;
        document.head.appendChild(styleEl);
      }
      setActiveStylesheet(targetSlug);

      const liveContent = document.getElementById('ist-content');
      if (liveContent) {
        liveContent.innerHTML = cached.contentHTML;
      }
      document.title = cached.title || document.title;
      document.body.dataset.page = targetSlug;
      document.body.classList.remove(exitClass);

      // Inject this page's modal/overlay markup (see ensurePageLoaded)
      // the first time it's needed -- skips any node whose id already
      // exists, which covers both "already injected on an earlier virtual
      // visit" and "this page was the real initial load, so it's already
      // there natively". Must happen before the script injection below:
      // that script's own init IIFE (initGameOverlay etc.) looks up the
      // overlay's elements once, synchronously, when it first runs.
      if (cached.overlayHTML) {
        const wrap = document.createElement('div');
        wrap.innerHTML = cached.overlayHTML;
        const newNodes = Array.from(wrap.children).filter(el => !el.id || !document.getElementById(el.id));
        if (newNodes.length) {
          const mainSite = document.getElementById('main-site');
          if (mainSite) mainSite.after(...newNodes);
          else document.body.append(...newNodes);
        }
      }

      // First visit to this page this session -- execute its script once
      // to register mount/unmount (see registerPage above). Guarded so a
      // page's script never runs more than once per session; every
      // later visit just calls its already-registered mount() below.
      // __istVirtualNavInjecting tells that script's own bottom-of-file
      // auto-invoke (checkSession()/init()/mount(), whichever it is) to
      // skip itself -- this call below is the only thing that should
      // ever trigger mount() for a virtual navigation.
      if (!pages[targetSlug] && cached.scriptText) {
        global.__istVirtualNavInjecting = true;
        const scriptEl = document.createElement('script');
        scriptEl.textContent = cached.scriptText;
        document.body.appendChild(scriptEl);
        global.__istVirtualNavInjecting = false;
      }

      if (!fromPopstate) history.pushState({}, '', targetSlug + '.html');

      // Suppress the posts/scoreboard card-entrance stagger (see
      // animateFeedSwap in anahane.html/kahvehane.html) for this page's
      // very next render -- the whole column is already sliding in via
      // the ist-entering-* classes below, so also animating the cards
      // inside it would look like the content arriving twice. On a real
      // page load this is seeded by a pre-body <script> reading
      // sessionStorage before the page's own script runs; a virtual
      // navigation never re-parses that page's <head>, so it has to be
      // seeded here instead, right before mount() (called further down)
      // triggers the same render path.
      global.__istSuppressFirstCardAnim = { left: true, right: true };

      const enterClass = dir === 'forward' ? 'ist-entering-forward' : 'ist-entering-backward';
      const root = document.documentElement;
      root.classList.add(enterClass);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { root.classList.remove(enterClass); });
      });

      document.querySelectorAll('nav a').forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === targetSlug + '.html');
      });

      activeSlug = targetSlug;

      if (pages[targetSlug] && pages[targetSlug].mount) {
        try { pages[targetSlug].mount(); } catch (e) { console.error(e); }
      }
      // Deliberately after mount(): initMapZoom's own measure() reads
      // getBoundingClientRect(), which forces a synchronous layout --
      // done before mount() had a chance to run, that forced flush would
      // "lock in" a rendered frame with no .home class on the map (mount
      // is what adds it), so the browser would then treat the class
      // arriving a moment later as a real change worth transitioning,
      // producing a visible flash. Reading layout only after mount() has
      // already run keeps the .home class present from that panel's very
      // first observed frame.
      if (liveContent && global.MapZoom) {
        liveContent.querySelectorAll('.map-panel').forEach(global.MapZoom.init);
      }
      if (global.IstProfileCard) global.IstProfileCard.setPage(targetSlug);
    } finally {
      virtualNavInFlight = false;
    }
  }

  // Browser back/forward and an edge-swipe-back gesture both land here --
  // by the time this fires, location already reflects the new page, so
  // that's the target; direction is always treated as backward (there's
  // no reliable way to tell a back-gesture from a forward one here, and
  // backward is what a physical back-gesture should feel like regardless).
  window.addEventListener('popstate', () => {
    navigateTo(currentPage(), 'backward', true);
  });

  // ══════════════════════════════════════════
  // Swipe pagination
  // Navigate Kütüphane → Hane → Kahvehane with a sliding transition.
  // Only the left and right columns translate; the map, datetime bar, and nav
  // bar stay fixed so the center of the screen is visually stable across pages.
  // Mobile: touch-swipe slides both columns together, direction keyed off
  // which way you swiped. Desktop: no gesture (nav-bar clicks only) — the
  // left column always slides out/in toward the left edge and the right
  // column toward the right edge, regardless of nav direction.
  //
  // This used to be duplicated near-identically in all three pages' own
  // inline <script> -- hoisted here so only one copy of it is ever live at
  // once. That matters once a page's script can run more than once per
  // session (client-side navigation, see registerPage above): three
  // independent copies would each register their own document-level
  // touchstart/touchend/click listeners, so a single swipe or tap would
  // fire three redundant, racing navigations after visiting all three pages.
  // ══════════════════════════════════════════
  function initSwipePagination() {
    const NAV_PAGES = ['kutuphane.html', 'anahane.html', 'kahvehane.html'];
    const MIN_DX = 50;
    const MAX_TIME = 700;
    // navigate()'s own tab-bar/swipe navigation always uses navigateTo's
    // virtual (client-side) path now, everywhere -- a real cross-document
    // navigation, even with View Transitions, briefly flashes the
    // browser's own status-bar/home-indicator tinting before it
    // re-samples the new page's colors. supportsVT is only still used
    // below to tag direction on genuine external/real navigations (a
    // shared link, browser history from outside this site, etc.), which
    // still get the browser's own automatic transition via each page's
    // own `@view-transition { navigation: auto; }` CSS rule.
    const supportsVT = 'startViewTransition' in document && !global.Capacitor;

    function isMobile() { return window.innerWidth <= 768; }
    function currentIdx() {
      const path = (location.pathname.split('/').pop() || 'index.html');
      const idx = NAV_PAGES.indexOf(path);
      return idx === -1 ? 0 : idx;
    }
    function recordDir(dir) {
      // Seed the direction for the incoming page. The pre-body script
      // reads this and sets vt-<dir> on <html> before VT captures the
      // new snapshot, so the CSS slide keyframes can match.
      try { sessionStorage.setItem('ist-page-enter-dir', dir); } catch(e) {}
    }

    // Back up: if the outgoing page is swapped before the new page mounts
    // its pagereveal handler (or if navigation.activation isn't populated
    // yet), also set types at pageswap so the outgoing snapshot phase is
    // correctly tagged.
    if (supportsVT) {
      window.addEventListener('pageswap', (e) => {
        if (!e.viewTransition) return;
        const dir = sessionStorage.getItem('ist-page-enter-dir');
        if (dir) e.viewTransition.types.add(dir);
      });
      window.addEventListener('pagereveal', (e) => {
        if (!e.viewTransition) return;
        const root = document.documentElement;
        const dir = root.classList.contains('vt-forward') ? 'forward'
                  : root.classList.contains('vt-backward') ? 'backward' : null;
        if (dir) e.viewTransition.types.add(dir);
        // Remove the direction class once the animation completes so it
        // doesn't bleed into a later same-document render.
        e.viewTransition.finished.finally(() => {
          root.classList.remove('vt-forward', 'vt-backward');
        });
      });
    }

    // Entry handler — runs on every page load. Cleans up direction state
    // and, for non-VT browsers, releases the manual offscreen transform.
    function handleIncoming() {
      const root = document.documentElement;
      const dir = root.classList.contains('ist-entering-forward') ? 'forward'
                : root.classList.contains('ist-entering-backward') ? 'backward' : null;
      try { sessionStorage.removeItem('ist-page-enter-dir'); } catch(e) {}
      if (!dir) return;
      // Double rAF so the initial transform has painted before we release it.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.classList.remove('ist-entering-' + dir);
        });
      });
    }

    let navigating = false;
    function navigate(targetIdx, dir) {
      if (navigating) return;
      if (targetIdx < 0 || targetIdx >= NAV_PAGES.length) return;
      const curr = currentIdx();
      if (targetIdx === curr) return;
      navigating = true;
      recordDir(dir);
      // Virtual (client-side) navigation -- no reload, no flash, shared
      // chrome (profile card, nav bar) never leaves the DOM. See
      // navigateTo above. Used everywhere now, not just inside Capacitor:
      // a real cross-document navigation -- even with View Transitions --
      // still briefly flashes the browser's own status-bar/home-indicator
      // tinting before it re-samples the new page's colors, which this
      // avoids entirely by never leaving the document. Any distance
      // (including a 2-hop Kütüphane<->Kahvehane jump) goes straight to
      // the target in one hop instead of flashing through the middle tab.
      navigateTo(PAGES[targetIdx], dir).finally(() => { navigating = false; });
    }

    // Intercept tab-bar clicks -- always goes through navigate()'s virtual
    // navigation now (see its comment).
    document.addEventListener('click', (e) => {
      const link = e.target.closest('nav a');
      if (!link) return;
      const href = link.getAttribute('href');
      const targetIdx = NAV_PAGES.indexOf(href);
      const curr = currentIdx();
      if (targetIdx === -1 || targetIdx === curr) return;
      const dir = targetIdx > curr ? 'forward' : 'backward';
      e.preventDefault();
      navigate(targetIdx, dir);
    }, true);

    // ── Mobile: horizontal touch-swipe anywhere on main-site (except the nav bar) ──
    let sx = 0, sy = 0, st = 0, active = false;
    document.addEventListener('touchstart', (e) => {
      if (!isMobile() || e.touches.length !== 1) return;
      if (e.target.closest && e.target.closest('nav')) return; // let nav-bar taps through
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      st = Date.now();
      active = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx;
      const dy = t.clientY - sy;
      const dt = Date.now() - st;
      if (dt > MAX_TIME) return;
      if (Math.abs(dx) < MIN_DX) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.2) return; // vertical-dominant: let it scroll
      const curr = currentIdx();
      if (dx < 0) navigate(curr + 1, 'forward');
      else        navigate(curr - 1, 'backward');
    }, { passive: true });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleIncoming);
    } else {
      handleIncoming();
    }
  }
  initSwipePagination();

  global.IstRouter = {
    sb,
    requireSession,
    updateDateTime,
    onTick,
    offTick,
    registerPage,
    currentPage,
  };
})(window);
