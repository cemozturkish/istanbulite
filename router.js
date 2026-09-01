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

  // ══════════════════════════════════════════════════════════════
  // TWO TABS, AND A ZOOM STACK INSIDE ONE OF THEM
  // ──────────────────────────────────────────────────────────────
  // The bottom bar carries two tabs now: İstanbulite and Hane.
  //
  // İstanbulite is not one page but three, stacked by ZOOM rather than
  // laid side by side -- the same city at three distances:
  //
  //     kutuphane   Türkiye      (furthest out)
  //     kahvehane   İstanbul     (where the reader lands)
  //     mahalle     the ilçe     (furthest in)
  //
  // The reader moves between them by pinching, or by swiping vertically:
  // pinch OUT or swipe DOWN goes IN (toward the mahalle), pinch IN or
  // swipe UP goes OUT (toward Türkiye). That is the petek's own
  // convention -- "a pull up is a scroll down, and down the levels is
  // outward" -- so one gesture means one thing everywhere in the app.
  //
  // Hane and Proje are the other tabs, and both are reached by TAPPING
  // one -- no swipe anywhere on this site changes tabs any more (see the
  // gesture block's own header further down).
  //
  // So the grammar is: the TAB is tapped, the DEPTH is swiped.
  const ZOOM = ['kutuphane', 'kahvehane', 'mahalle']; // out -> in
  const ZOOM_DEFAULT = 'kahvehane';
  const HANE = 'anahane';
  // A sandbox tab, deliberately between the two real ones: the flip
  // book on its own, with no map, no data and no page swap behind it,
  // so the mechanic can be judged with a thumb without anything else in
  // the way (see project.html).
  const PROJECT = 'project';
  const PAGES = ZOOM.concat([PROJECT, HANE]);
  // Left to right along the bottom bar. The İstanbulite tab is three
  // pages deep, so it is represented here by whichever level the reader
  // last stood on.
  const TABS = ['istanbulite', PROJECT, 'hane'];

  // Which zoom level the reader was last standing on, so that leaving for
  // Hane and coming back returns them to the distance they were at rather
  // than to İstanbul every time.
  let lastZoom = ZOOM_DEFAULT;
  // Seeded below from whichever page really loaded, so a reader who opens
  // mahalle.html directly and swipes to Hane comes back to the mahalle.

  // Horizontal moves slide; vertical moves ZOOM, because that is what they
  // are -- the same city at another distance, not another page beside this
  // one. The four classes are defined once in frames.css rather than in
  // each page's own stylesheet, so a fourth level cannot arrive carrying a
  // fifth version of the transition.
  const EXIT_CLASS = {
    forward:  'ist-exiting-forward',
    backward: 'ist-exiting-backward',
    in:       'ist-zooming-in',
    out:      'ist-zooming-out',
  };
  const ENTER_CLASS = {
    forward:  'ist-entering-forward',
    backward: 'ist-entering-backward',
    in:       'ist-arriving-in',
    out:      'ist-arriving-out',
  };

  function isZoom(slug) { return ZOOM.indexOf(slug) !== -1; }
  function zoomIndex(slug) { return ZOOM.indexOf(slug); }
  function tabOf(slug) {
    if (slug === HANE) return 'hane';
    if (slug === PROJECT) return PROJECT;
    return 'istanbulite';
  }
  // The page a tab opens on.
  function pageOfTab(tab) {
    if (tab === 'hane') return HANE;
    if (tab === PROJECT) return PROJECT;
    return lastZoom;
  }

  // Two tabs, three of the four pages behind one of them. The İstanbulite
  // link also re-points at whichever level was last stood on, so tapping
  // it from Hane returns the reader to their own distance rather than
  // dropping them back at İstanbul every time.
  function paintNav(slug) {
    const tab = tabOf(slug);
    document.querySelectorAll('nav a').forEach(a => {
      const t = a.dataset.tab || (a.getAttribute('href') === 'anahane.html' ? 'hane' : 'istanbulite');
      a.classList.toggle('active', t === tab);
      if (t === 'istanbulite') a.setAttribute('href', lastZoom + '.html');
    });
  }

  function currentPage() {
    const path = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    return PAGES.includes(path) ? path : ZOOM_DEFAULT;
  }

  if (isZoom(currentPage())) lastZoom = currentPage();

  // Marks the body-level overlay nodes this document really loaded with as
  // belonging to the page that loaded them — navigateTo stamps the ones it
  // injects the same way, so an id clash between two pages can be told
  // apart from "already injected" (see its overlay injection below).
  (function stampNativeOverlays() {
    const mainSite = document.getElementById('main-site');
    if (!mainSite) return;
    const slug = currentPage();
    let node = mainSite.nextElementSibling;
    while (node && node.tagName !== 'SCRIPT') {
      if (node.id) node.dataset.istPage = slug;
      node = node.nextElementSibling;
    }
  }());

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

  // Keyed on the PROMISE rather than the result, so a prefetch already in
  // flight and a navigation that wants the same page share one fetch
  // instead of racing two. A rejection drops the entry again, or one
  // failed request would be cached as a permanent refusal to load that
  // page for the rest of the session.
  const pageLoads = {};
  function ensurePageLoaded(slug) {
    if (pageCache[slug]) return Promise.resolve(pageCache[slug]);
    if (pageLoads[slug]) return pageLoads[slug];
    const p = loadPage(slug);
    pageLoads[slug] = p;
    p.catch(() => { delete pageLoads[slug]; });
    return p;
  }

  async function loadPage(slug) {
    const file = slug + '.html';
    const res = await fetch(file);
    if (!res.ok) throw new Error(`[router] ${file} -> ${res.status}`);
    const html = await res.text();
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
    // Not every page's <head> loads the same script set (e.g. politician-
    // card.js/tbmm.js are only on kütüphane/kahvehane, not hane) -- capture
    // every src'd <script> here so navigateTo can load whichever ones this
    // document doesn't already have before running the target page's own
    // script (see loadMissingScripts below).
    const scriptSrcs = Array.from(doc.querySelectorAll('script[src]')).map(s => s.getAttribute('src'));
    const cached = {
      styleCSS: styleEl ? styleEl.textContent : '',
      contentHTML: contentEl ? contentEl.innerHTML : '',
      overlayHTML,
      scriptText: bigScript ? bigScript.textContent : '',
      scriptSrcs,
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

  // Loads a single <script src> once, resolving whether it succeeds or
  // fails so one broken/blocked script can't hang navigation forever.
  function loadScriptOnce(src) {
    if (document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
    return new Promise((resolve) => {
      const el = document.createElement('script');
      el.src = src;
      el.onload = () => resolve();
      el.onerror = () => resolve();
      document.head.appendChild(el);
    });
  }

  // Real page loads pull in every <head> script the page declares; a
  // virtual navigation only ever injects the target page's own inline body
  // script (see ensurePageLoaded above), so any <script src> that page's
  // <head> has but the currently-live document doesn't (e.g. politician-
  // card.js/tbmm.js, which only kütüphane/kahvehane load, not hane) would
  // otherwise never arrive -- leaving anything gated on that module (e.g.
  // window.IstPoliticianCard) silently broken for the rest of the session.
  // Loaded sequentially, in the target page's own document order, so
  // scripts that assume an earlier one already ran (e.g. profile-card.js
  // reading IstAvatar at its own top level) still see it defined.
  async function loadMissingScripts(cached) {
    for (const src of cached.scriptSrcs) {
      await loadScriptOnce(src);
    }
  }

  // ── Waiting for the exit slide, rather than for a number ──
  // The columns' own transition is 0.32s on a phone and 0.4s on desktop
  // (see each page's two media queries). This used to be a flat 370ms
  // wait, which matches neither: on the phone -- the platform ~90% of
  // users are on -- it sat idle for ~50ms after the slide had already
  // finished, and every one of those milliseconds is in front of the
  // reader between two pages.
  //
  // So the duration is read off the elements that actually carry the
  // transition, all four of them, since which pair is live depends on the
  // media query. A screen where none of them animates (reduced motion, a
  // column display:none) reports 0 and the wait is skipped outright.
  function exitDurationMs() {
    let ms = 0;
    document.querySelectorAll('.col-left, .col-right, .col-left-slide, .col-right-slide').forEach(el => {
      const cs = getComputedStyle(el);
      const d = (parseFloat(cs.transitionDuration) || 0) + (parseFloat(cs.transitionDelay) || 0);
      if (d * 1000 > ms) ms = d * 1000;
    });
    return ms;
  }

  // Resolves when the slide ends, or when it should have. transitionend is
  // the real signal -- it accounts for when the transition actually began
  // -- but it never fires if the element is off-screen or the transition
  // is interrupted, so the measured duration is the backstop rather than
  // the primary. Whichever comes first.
  function awaitExitSlide() {
    const ms = exitDurationMs();
    if (!ms) return Promise.resolve();
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        document.removeEventListener('transitionend', onEnd, true);
        resolve();
      };
      const onEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        const cl = e.target && e.target.classList;
        if (!cl) return;
        if (cl.contains('col-left') || cl.contains('col-right') ||
            cl.contains('col-left-slide') || cl.contains('col-right-slide')) finish();
      };
      const timer = setTimeout(finish, ms + 60);
      document.addEventListener('transitionend', onEnd, true);
    });
  }

  // ── How long a zoom takes ──
  // Declared once in frames.css as --ist-zoom-dur and read back here, so
  // the wait and the animation are the same number by construction. A
  // reader on `prefers-reduced-motion` gets 0 there and the wait is
  // skipped outright.
  function zoomDurationMs() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--ist-zoom-dur').trim();
    // Absent means an old cached frames.css that has never heard of the
    // zoom -- fall back rather than snapping. Zero means the stylesheet
    // deliberately said so (prefers-reduced-motion), and is honoured.
    if (!v) return 380;
    const n = parseFloat(v) || 0;
    return /ms$/.test(v) ? n : n * 1000;
  }
  // ── Letting the browser breathe mid-swap ──
  // Everything navigateTo does after its await -- unmount, stylesheet,
  // innerHTML, overlays, script, mount(), setBarLayout -- lands in ONE
  // task, because it all runs inside the callback that resolved the
  // wait. Measured on a 4x-throttled CPU that is a single 111ms
  // TimerFire: nine frames in a row where nothing can paint, right in
  // the middle of the transition. The work is necessary; doing it in one
  // uninterruptible block is not.
  //
  // So the phases are separated by a yield that actually lets a frame
  // through: rAF (wait for the frame) then a task (land after it has
  // painted). Total CPU is unchanged -- what changes is that the strip
  // keeps moving over the top of it, which is the whole difference
  // between a transition and a freeze.
  function yieldFrame() {
    return new Promise(resolve => {
      requestAnimationFrame(() => setTimeout(resolve, 0));
    });
  }

  // How long the swap should hold off. The full duration is right for a
  // tap or a pinch, which start the journey at the beginning -- but a
  // finger released at 80% of the way in only has 20% of the strip left
  // to play, and waiting the whole duration there is dead air the reader
  // reads as the app thinking. Set by the gesture, consumed once.
  let zoomWaitMs = null;
  function awaitZoom() {
    const ms = zoomWaitMs != null ? zoomWaitMs : zoomDurationMs();
    zoomWaitMs = null;
    if (!ms) return Promise.resolve();
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  function setZoomWait(ms) { zoomWaitMs = ms; }

  // ── Prefetch the two pages a swipe can reach ──
  // ensurePageLoaded fetches the target and DOMParses it -- and these are
  // 6,000-8,500 line documents. Done inside a navigation that is the
  // reader waiting; done at idle beforehand it costs them nothing, and
  // the first swipe to a page becomes as quick as the second.
  // ── Run the arriving page's script BEFORE the reader asks for it ──
  // Each page's own script is 90-120 KB, and executing it is a single
  // uninterruptible task. Done inside the navigation it froze the main
  // thread for ~135ms on a 4x-throttled CPU -- nine dropped frames in the
  // middle of the transition, on the FIRST visit to each page and only
  // then, which is exactly the moment a reader forms their opinion of
  // whether the app is smooth.
  //
  // It is safe to run early by construction: the script's own
  // bottom-of-file auto-invoke is skipped while __istVirtualNavInjecting
  // is set (see each page), so all it does is define things and register
  // its mount/unmount pair. It is NOT safe to assume it will succeed --
  // it runs here with the *previous* page's DOM in #ist-content, so any
  // top-level DOM access finds nothing. Hence the guard below: if the
  // script did not manage to register, this is left exactly as it was and
  // navigateTo runs it at its old moment, with the right DOM in place.
  const warmedScripts = {};
  // A script that has been EXECUTED, whether or not it managed to
  // register. Running one twice is not a retry -- its top-level consts
  // are already declared, so the second run dies on a duplicate
  // declaration and takes the page with it.
  const ranScripts = {};
  async function warmPageScript(slug) {
    if (pages[slug] || warmedScripts[slug]) return;
    warmedScripts[slug] = true;
    let cached;
    try {
      cached = await ensurePageLoaded(slug);
      await loadMissingScripts(cached);
    } catch (e) { return; }
    if (pages[slug] || !cached.scriptText) return;
    global.__istVirtualNavInjecting = true;
    ranScripts[slug] = true;
    try {
      const el = document.createElement('script');
      el.textContent = cached.scriptText;
      document.body.appendChild(el);
    } catch (e) {
      console.warn('[router] pre-warming ' + slug + "'s script failed; it will run on arrival instead", e);
    } finally {
      global.__istVirtualNavInjecting = false;
    }
    if (!pages[slug]) {
      // It ran but never registered -- something in it needs its own DOM.
      // Say so once: this page pays the freeze on its first visit, and
      // that is worth knowing rather than silently accepting.
      console.warn('[router] ' + slug + ' did not register a lifecycle when pre-warmed; ' +
                   'its script will re-run on arrival (and cost a frame drop there).');
    }
  }

  function prefetchNeighbours(slug) {
    if (!PAGES.includes(slug)) return;
    // Proje reaches nothing: it is the app now, one page whose depths
    // and lanes are all inside itself (see CLAUDE.md's project.html
    // section). Prefetching from here would pull down a couple of
    // megabytes of pages the reader has no way to get to.
    if (slug === PROJECT) return;
    // What the reader can reach from here in one move: the level above
    // and the level below (a vertical swipe), and the other two tabs (a
    // tap on the bar).
    let want;
    if (slug === HANE || slug === PROJECT) {
      want = [lastZoom, PROJECT, HANE].filter(s => s !== slug);
    } else {
      const i = zoomIndex(slug);
      want = [ZOOM[i - 1], ZOOM[i + 1], PROJECT];
    }
    want = want.filter(Boolean);
    const run = () => want.forEach(s => {
      // The document first, then its script -- so the heavy, single
      // uninterruptible task lands here, at idle, instead of in the
      // middle of the reader's gesture.
      warmPageScript(s).catch(() => {});
    });
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
    // The drawn frames for whichever depth journey is one gesture away.
    // Same reasoning and the same moment as the page prefetch: a strip
    // that has to be fetched under the finger would stall, and stalling
    // is the whole thing this mechanism exists to avoid.
    if (global.IstMapFrames) global.IstMapFrames.warm(slug);
  }

  // The frame strip left standing over the arriving page, if the journey
  // that just ran had drawings. Faded out once the real map is mounted
  // underneath it -- the last drawing hands over to the map instead of
  // cutting to it.
  let pendingFrames = null;
  // The flip book left standing over the arriving page. Taken off only
  // once that page is mounted underneath it -- its last drawing is the
  // level being arrived at, so nobody should be able to see the moment
  // one becomes the other.
  let pendingFlip = null;

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

    const exitClass = EXIT_CLASS[dir] || EXIT_CLASS.forward;
    const zooming = dir === 'in' || dir === 'out';
    // A zoom moves everything inside #ist-content at once rather than the
    // two columns alone, so there is no column transitionend to wait on --
    // the duration is the one frames.css declares, read from the same
    // custom property so the two can never drift.
    if (zooming) document.body.classList.add('ist-zoom');
    try {
      // Started BEFORE the slide, so the fetch and the DOMParse happen
      // while the columns are still moving rather than after they have
      // stopped. With the prefetch above this is normally already
      // resolved and the await below costs nothing; on a cold first swipe
      // it is the difference between the work being hidden by the
      // animation and the reader watching it.
      const loading = ensurePageLoaded(targetSlug);
      // Same reasoning one level down: whichever <script src> the target
      // declares and this document doesn't have yet can be fetched during
      // the slide too. Awaited at its old place further down.
      const scripts = loading.then(loadMissingScripts).catch(() => {});

      document.body.classList.add(exitClass);

      let cached;
      try {
        cached = (await Promise.all([loading, zooming ? awaitZoom() : awaitExitSlide()]))[0];
      } catch (e) {
        // The target could not be loaded at all -- offline, a 404 from a
        // half-deployed Pages build. The columns are sitting off-screen
        // by now, so doing nothing would leave the reader on a blank
        // page. Put them back and hand the navigation to the browser,
        // which can at least show its own error.
        console.error(e);
        document.body.classList.remove(exitClass);
        document.body.classList.remove('ist-zoom');
        if (pendingFrames) { pendingFrames.end(); pendingFrames = null; }
        if (pendingFlip) { pendingFlip.end(); pendingFlip = null; }
        if (!fromPopstate) window.location.href = targetSlug + '.html';
        return;
      }

      if (pages[currentSlug] && pages[currentSlug].unmount) {
        try { pages[currentSlug].unmount(); } catch (e) { console.error(e); }
      }
      // Between every phase below, see yieldFrame's own comment: these
      // are the seams that stop the swap being one 111ms block.
      await yieldFrame();

      if (!document.querySelector('style[data-page="' + targetSlug + '"]')) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-page', targetSlug);
        styleEl.textContent = cached.styleCSS;
        document.head.appendChild(styleEl);
      }
      setActiveStylesheet(targetSlug);

      await yieldFrame();

      const liveContent = document.getElementById('ist-content');
      if (liveContent) {
        liveContent.innerHTML = cached.contentHTML;
      }
      await yieldFrame();
      // The seat card sits in the profile bar on a phone, and the bar is
      // deliberately outside #ist-content -- so unlike everything the swap
      // above just replaced, the seat survives it. Drop it here; the
      // arriving page's mount() paints its own. Leaving it would show (and
      // on a tap, open) the page you just left. See politician-card.js.
      if (global.IstPoliticianCard) global.IstPoliticianCard.clearSeat();
      // Same reasoning for a member the petek had named there: it is a
      // caption on a hexagon on Hane, and Hane is what is leaving. Put
      // your own name back before the row is laid out for the next page
      // (see setBarMember in profile-card.js).
      if (global.IstProfileCard && global.IstProfileCard.clearBarMember) global.IstProfileCard.clearBarMember();
      // The bar's other occupant -- you -- does not leave with the page,
      // it walks to where it stands on the next one: right on Kütüphane,
      // the middle on Hane, left on Kahvehane (see setBarLayout in
      // profile-card.js). Done here, at the exact moment the content is
      // swapped, so the name travels *with* the page sliding in rather
      // than jumping into place after it has settled.
      if (global.IstProfileCard) global.IstProfileCard.setBarLayout(targetSlug);
      document.title = cached.title || document.title;
      document.body.dataset.page = targetSlug;
      document.body.classList.remove(exitClass);
      // setBarLayout just above is a FLIP -- it reads
      // getBoundingClientRect before and after re-laying out the row, so
      // it forces two synchronous layouts of a document whose content
      // was replaced one line earlier. That is the single most expensive
      // thing in the swap after the swap itself; give the frame it
      // dirtied a chance to be painted before the next phase piles on.
      await yieldFrame();

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
        const newNodes = Array.from(wrap.children).filter(el => {
          if (!el.id) return true;
          const clash = document.getElementById(el.id);
          if (!clash) return true;
          // Already injected on an earlier virtual visit, or this page was
          // the real initial load -- normal, skip it. But if the node that
          // owns the id came from a DIFFERENT page, this page's overlay is
          // being silently dropped and its script will drive the other
          // page's node instead (both write the same sheet, the wrong one
          // wins). Ids of body-level overlays MUST be unique across the
          // three carousel pages -- say so loudly instead of failing quietly.
          if (clash.dataset.istPage && clash.dataset.istPage !== targetSlug) {
            console.warn(`[router] overlay id "${el.id}" is already owned by ${clash.dataset.istPage}; ` +
                         `${targetSlug}'s copy was dropped. Give it a page-unique id.`);
          }
          return false;
        });
        newNodes.forEach(el => { if (el.id) el.dataset.istPage = targetSlug; });
        if (newNodes.length) {
          const mainSite = document.getElementById('main-site');
          if (mainSite) mainSite.after(...newNodes);
          else document.body.append(...newNodes);
        }
      }

      await yieldFrame();

      // Load any <script src> this page's <head> declares that the live
      // document doesn't already have (see loadMissingScripts above) --
      // must finish before the page's own script/mount runs below, since
      // that's what actually reads window.IstPoliticianCard and friends.
      await scripts;

      // First visit to this page this session -- execute its script once
      // to register mount/unmount (see registerPage above). Guarded so a
      // page's script never runs more than once per session; every
      // later visit just calls its already-registered mount() below.
      // __istVirtualNavInjecting tells that script's own bottom-of-file
      // auto-invoke (checkSession()/init()/mount(), whichever it is) to
      // skip itself -- this call below is the only thing that should
      // ever trigger mount() for a virtual navigation.
      // Normally already done at idle by warmPageScript above, so this
      // is the fallback for a page that could not be pre-warmed (its
      // script needs its own DOM) or one reached before idle ever ran.
      if (!pages[targetSlug] && cached.scriptText && !ranScripts[targetSlug]) {
        ranScripts[targetSlug] = true;
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

      const enterClass = ENTER_CLASS[dir] || ENTER_CLASS.forward;
      const root = document.documentElement;
      root.classList.add(enterClass);
      if (zooming) document.body.classList.add('ist-zoom-arriving');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          root.classList.remove(enterClass);
          // Held for the length of the arrival, because on a zoom it is
          // `ist-zoom` that declares the transition the release animates
          // along -- dropped in the same frame, the page would snap.
          if (zooming) setTimeout(() => {
            document.body.classList.remove('ist-zoom', 'ist-zoom-arriving');
          }, zoomDurationMs() + 60);
        });
      });

      // Two tabs, and three pages share one of them -- so the active tab is
      // decided by which tab the page belongs to, not by its filename.
      paintNav(targetSlug);

      activeSlug = targetSlug;
      if (isZoom(targetSlug)) lastZoom = targetSlug;

      await yieldFrame();

      if (pages[targetSlug] && pages[targetSlug].mount) {
        try { pages[targetSlug].mount(); } catch (e) { console.error(e); }
      }
      await yieldFrame();
      // The map image that just arrived is #ist-content's own, so it is
      // the base map again -- put the member's hand-painted district map
      // back before anything reads layout below (see home-map.js).
      if (global.IstHomeMap) global.IstHomeMap.refresh();
      // The arriving map is in place -- but the page's own columns are
      // still fading in over the strip, and lifting it before they are
      // solid puts a bare map on screen for a beat, which is the exact
      // flash this whole arrangement exists to remove. So it is held
      // until that fade is done and then taken off slowly: the last
      // drawing and the real map agree, so nobody should be able to see
      // the moment one becomes the other.
      if (pendingFrames) {
        const strip = pendingFrames;
        pendingFrames = null;
        const d = zoomDurationMs();
        setTimeout(() => strip.settle(Math.max(120, Math.round(d * 0.5))), Math.round(d * 0.45));
      }
      if (pendingFlip) {
        const book = pendingFlip;
        pendingFlip = null;
        // Put the real page's own elements back first, then take the
        // layer off over them -- the last drawing and the page it is
        // standing in for are the same picture, so the hand-over is
        // meant to be invisible.
        book.reveal();
        requestAnimationFrame(() => book.fade(140));
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
      // Same reason: the map that just arrived is a different node from the
      // one that was drifting under the previous page, so the tilt parallax
      // has to be pointed at it (see map-parallax.js).
      if (global.IstMapParallax) global.IstMapParallax.refresh();
      if (global.IstProfileCard) global.IstProfileCard.setPage(targetSlug);
      // Whichever two pages the reader can now reach in one swipe.
      prefetchNeighbours(targetSlug);
    } finally {
      virtualNavInFlight = false;
      // In the happy path the columns were destroyed by the content swap
      // and carry no inline transform, so this is a no-op. It matters on
      // the failure path above, where the columns are still the ones the
      // finger was dragging and would otherwise stay where it left them.
      if (global.__istReleaseColumns) global.__istReleaseColumns();
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
  // Tab taps, and the zoom gesture
  // ──────────────────────────────────────────
  // The tabs are TAPPED, never swiped. A horizontal swipe used to walk
  // İstanbulite -> Proje -> Hane, and it was the wrong gesture for the
  // wrong thing: a tab is a place you choose, the bottom bar names all
  // of them, and a sideways drag reached them without ever being aimed
  // at one. Worse, it collided with everything that has since learnt to
  // read a horizontal throw of its own -- Proje's own page, the news and
  // event decks -- so the reader's flick was answered by whichever
  // listener saw it first. The vertical gesture is untouched: it is the
  // ZOOM, and the zoom is not a tab.
  //
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

    // ── Where a gesture from here goes ──
    // Vertical only, and only inside İstanbulite: it picks the DEPTH.
    // Nothing horizontal is a navigation any more -- the tab bar is the
    // only way between the tabs (see this section's header) -- so a
    // sideways drag here is somebody else's, and is handed straight back
    // to whatever it started over. Hane is not in the zoom stack either,
    // and its own vertical pull belongs to the petek.
    function verticalTarget(dy) {
      // Proje owns its own vertical gesture -- it IS a flip book -- so
      // the carousel must keep its hands off it.
      if (activeSlug === PROJECT) return null;
      const i = zoomIndex(activeSlug);
      if (i === -1) return null;
      // Down goes IN (toward the mahalle), up goes OUT (toward Türkiye) --
      // the petek's own convention, so one gesture means one thing.
      const next = dy > 0 ? i + 1 : i - 1;
      if (next < 0 || next >= ZOOM.length) return null;
      return { slug: ZOOM[next], dir: dy > 0 ? 'in' : 'out' };
    }
    // A pinch is the same move as the vertical swipe: spreading fingers
    // goes in, closing them goes out.
    function pinchTarget(spread) { return verticalTarget(spread > 0 ? 1 : -1); }

    // A vertical drag that begins over something which can actually
    // scroll belongs to that thing, not to the zoom -- Kütüphane's news
    // column and Kahvehane's board both scroll on a phone.
    function overScroller(node) {
      let el = node;
      while (el && el !== document.body) {
        if (el.scrollHeight - el.clientHeight > 4) {
          const oy = getComputedStyle(el).overflowY;
          if (oy === 'auto' || oy === 'scroll') return true;
        }
        el = el.parentElement;
      }
      return false;
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
    function navigate(targetSlug, dir) {
      if (navigating) return;
      if (!PAGES.includes(targetSlug) || targetSlug === activeSlug) return;
      navigating = true;
      // Only a horizontal move has a cross-document fallback worth
      // tagging: a zoom is always the virtual path (the two levels share
      // this document), and `ist-entering-in` has no stylesheet behind it.
      if (dir === 'forward' || dir === 'backward') recordDir(dir);
      // Virtual (client-side) navigation -- no reload, no flash, shared
      // chrome (profile card, nav bar) never leaves the DOM. See
      // navigateTo above. Used everywhere now, not just inside Capacitor:
      // a real cross-document navigation -- even with View Transitions --
      // still briefly flashes the browser's own status-bar/home-indicator
      // tinting before it re-samples the new page's colors, which this
      // avoids entirely by never leaving the document. Any distance
      // (including a 2-hop Kütüphane<->Kahvehane jump) goes straight to
      // the target in one hop instead of flashing through the middle tab.
      navigateTo(targetSlug, dir).finally(() => { navigating = false; });
    }

    // Intercept tab-bar clicks -- always goes through navigate()'s virtual
    // navigation now (see its comment).
    document.addEventListener('click', (e) => {
      const link = e.target.closest('nav a');
      if (!link) return;
      const tab = link.dataset.tab || (link.getAttribute('href') === 'anahane.html' ? 'hane' : 'istanbulite');
      const here = tabOf(activeSlug);
      if (tab === here) { e.preventDefault(); return; }
      // The İstanbulite tab is three pages; tapping it returns the reader
      // to the distance they were last standing at, not to İstanbul.
      const dir = TABS.indexOf(tab) > TABS.indexOf(here) ? 'forward' : 'backward';
      e.preventDefault();
      navigate(pageOfTab(tab), dir);
    }, true);

    // ══════════════════════════════════════════
    // The swipe follows the finger
    // ──────────────────────────────────────────
    // This used to be bound to touchend alone: the drag was ignored
    // entirely and the whole gesture was a button that happened to be
    // pressed by sliding. Nothing moved under the finger, a swipe could
    // not be abandoned once begun, and the ends of the carousel gave no
    // sign that there was nothing past them.
    //
    // What moves is the two columns, which is exactly what the exit
    // animation moves -- the map, the profile bar and the tab bar stay
    // put, so the middle of the screen is stable while the page slides
    // (see this section's own comment above). That is also why the map
    // does not need lifting out of #ist-content for this: it never moves.
    //
    // What this deliberately is NOT is a true two-page pager, where the
    // incoming page is live beside the outgoing one and the finger drags
    // the seam between them. Each page's CSS lives in its own
    // <style data-page> and only one is ever enabled (see
    // setActiveStylesheet), so a second page rendered beside the first
    // would be drawn with the wrong page's rules. Getting there means
    // scoping all three stylesheets so they can be live at once, which is
    // a much larger change than this one.
    const SLOP = 8;            // px before the gesture claims an axis
    // px/ms. 0.55 is the app's own throw constant -- NEWS_SWIPE_DEAL_VEL,
    // Q_SWIPE_DEAL_VEL and EV_SWIPE_DEAL_VEL are all 0.55 -- so a flick
    // that changes the depth asks exactly as much of the thumb as a flick
    // that throws a card away.
    const FLICK_SPEED = 0.55;
    const EDGE_PULL = 0.32;        // how much of the drag the ends give back
    let g = null;
    let pinch = null;

    function columns() {
      return Array.prototype.slice.call(document.querySelectorAll('.col-left, .col-right'));
    }
    // Hand the columns back to the stylesheet. Nothing drags them any
    // more, but navigateTo's own exit slide still sets a transform on
    // them, so an inline one left in place would beat
    // html.ist-entering-* and the incoming page would never slide in.
    function releaseColumns() {
      const cols = columns();
      for (let i = 0; i < cols.length; i++) { cols[i].style.transform = ''; cols[i].style.transition = ''; }
      document.body.classList.remove('ist-dragging');
    }

    // ── What a zoom moves ──
    // Not the two columns: the whole of what the page draws, map included,
    // because the map IS the zoom. #ist-content is display:contents and
    // therefore has no box of its own to transform -- its children are the
    // page's real grid items, and moving all of them together is the same
    // picture (see frames.css's own zoom block, which uses this selector).
    function contentNodes() {
      const c = document.getElementById('ist-content');
      return c ? Array.prototype.slice.call(c.children) : [];
    }
    // How far in and out the drawing travels. Matched to frames.css --
    // the release animates from wherever the finger left off to exactly
    // the value the exit class would have set, so nothing jumps at the
    // handover.
    const ZOOM_IN_SCALE = 1.35;
    const ZOOM_OUT_SCALE = 0.72;
    // The travel is judged against a third of the screen.
    function zoomProgress(dy) {
      return Math.min(1, Math.abs(dy) / (window.innerHeight * 0.34));
    }
    function paintZoom(dy) {
      const p = zoomProgress(dy);
      const to = dy > 0 ? ZOOM_IN_SCALE : ZOOM_OUT_SCALE;
      const scale = 1 + (to - 1) * p;
      const nodes = contentNodes();
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.transformOrigin = '50% 45%';
        nodes[i].style.transition = '';
        nodes[i].style.transform = 'scale(' + scale + ')';
        // The drag does NOT fade. It used to, from the very first
        // millimetre -- so the page the reader had not yet decided to
        // leave dissolved under their thumb, and an abandoned gesture
        // meant watching it come back. A zoom moves the page toward you;
        // it does not erase it. The crossfade belongs to the commit,
        // where it happens late and under cover of the drawing.
        nodes[i].style.opacity = '';
      }
    }
    function releaseZoom() {
      const nodes = contentNodes();
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.transform = '';
        nodes[i].style.opacity = '';
        nodes[i].style.transition = '';
        nodes[i].style.transformOrigin = '';
      }
      document.body.classList.remove('ist-dragging');
    }
    // Carry the drawing on from where the finger left off, to the exact
    // place the exit class puts it, then hand over to navigate(). The
    // inline styles die with the nodes when #ist-content is swapped, so
    // there is nothing to clean up on the happy path.
    // `ms` is what is actually LEFT of the journey, not the whole of it:
    // a finger released at 80% has 20% to run, and everything about the
    // release -- the strip's playout, this fade, and how long the swap
    // holds off -- has to agree on that one number or the page is cut
    // instead of faded.
    function flingZoom(dir, ms) {
      const to = dir === 'in' ? ZOOM_IN_SCALE : ZOOM_OUT_SCALE;
      if (ms == null) ms = zoomDurationMs();
      const nodes = contentNodes();
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.transformOrigin = '50% 45%';
        // Opacity in the last 40% only, matching frames.css -- the page
        // holds while the drawing carries the reader, then leaves.
        nodes[i].style.transition = ms
          ? ('transform ' + ms + 'ms ease, opacity ' + Math.round(ms * 0.3) + 'ms ease ' + Math.round(ms * 0.7) + 'ms')
          : 'none';
        nodes[i].style.transform = 'scale(' + to + ')';
        nodes[i].style.opacity = '0';
      }
      document.body.classList.remove('ist-dragging');
    }
    function springZoom() {
      const snap = !zoomDurationMs();
      if (snap) { releaseZoom(); return; }
      const nodes = contentNodes();
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].style.transition = 'transform 0.26s ease';
        nodes[i].style.transform = 'scale(1)';
      }
      document.body.classList.remove('ist-dragging');
      setTimeout(releaseZoom, 280);
    }
    // ── The drawn journey, where one exists ──
    // Only where its frames are already decoded (map-frames.js refuses
    // otherwise), so this can be asked inside a touch handler and
    // answered in the same frame. Where there is none -- İstanbul to
    // mahalle, which has no map to zoom into -- the scale transform
    // above is the whole transition, which is why that fallback is not
    // a degraded mode but the ordinary one.
    // ── The flip book ──
    // Where a journey has a step table, the whole screen becomes one:
    // the drawings, and the page's own elements posed over them (see
    // flip.js and flip-steps.js). Where it has only drawings, the older
    // strip still runs. Where it has neither -- İstanbul to mahalle,
    // which has no map to zoom into -- the scale transform does it.
    function beginFlip(target) {
      if (!target || !global.IstFlip || !global.IstFlipSteps) return null;
      const hit = global.IstFlipSteps.find(activeSlug, target.slug);
      if (!hit) return null;
      const strip = global.IstMapFrames
        ? global.IstMapFrames.stripFor(activeSlug, target.slug)
        : null;
      try { return global.IstFlip.start(hit.def, strip); }
      catch (e) { console.error(e); return null; }
    }

    function beginFrames(target) {
      if (!global.IstMapFrames || !target) return null;
      try { return global.IstMapFrames.begin(activeSlug, target.slug); }
      catch (e) { console.error(e); return null; }
    }

    function releaseAll() { releaseColumns(); releaseZoom(); }
    global.__istReleaseColumns = releaseAll;

    document.addEventListener('touchstart', (e) => {
      if (!isMobile()) return;
      if (virtualNavInFlight || navigating) return;
      if (e.touches.length === 2) {
        // A pinch is the same move as the vertical swipe, and it is the
        // one gesture that says "zoom" without having to be learnt.
        const [a, b] = e.touches;
        pinch = { d0: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), fired: false };
        g = null;
        return;
      }
      if (e.touches.length !== 1) return;
      if (e.target.closest && e.target.closest('nav')) return; // let nav-bar taps through
      const t = e.touches[0];
      g = {
        x: t.clientX, y: t.clientY, t: Date.now(),
        lastY: t.clientY, lastT: Date.now(), speed: 0,
        axis: null,
        // A vertical drag that starts over something which can genuinely
        // scroll belongs to that thing, not to the zoom.
        noZoom: overScroller(e.target),
      };
    }, { passive: true });

    // passive: false, because a drag has to stop the page scrolling
    // underneath it once it has claimed an axis.
    document.addEventListener('touchmove', (e) => {
      if (pinch && e.touches.length === 2) {
        if (pinch.fired) return;
        const [a, b] = e.touches;
        const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const spread = d - pinch.d0;
        if (Math.abs(spread) < 40) return;
        const target = pinchTarget(spread);
        pinch.fired = true;
        if (!target) return;
        if (e.cancelable) e.preventDefault();
        const frames = beginFrames(target);
        if (frames) {
          frames.play(0, 1, zoomDurationMs() || 380);
          pendingFrames = frames;
        }
        flingZoom(target.dir);
        navigate(target.slug, target.dir);
        return;
      }
      if (!g || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - g.x, dy = t.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        // Horizontal is not this module's gesture any more: the tabs are
        // tapped. Drop the gesture entirely rather than tracking an axis
        // nothing acts on -- whatever the finger started over (a deck, a
        // page with its own throw) is then free to answer it, and we
        // have not called preventDefault on the way past.
        if (Math.abs(dx) > Math.abs(dy) * 1.2) { g = null; return; }
        g.axis = 'y';
        // Nothing to zoom into this way, or the finger is on a
        // scroller: hand the gesture back to whatever is underneath.
        g.zoom = g.noZoom ? null : verticalTarget(dy);
        if (!g.zoom) { g = null; return; }
        g.frames = undefined;   // not yet asked; null means asked and none
        g.flip = undefined;
        document.body.classList.add('ist-dragging');
      }
      const now = Date.now();
      const dt = now - g.lastT;
      // Vertical: the zoom follows the finger. A direction reversal mid
      // drag means the reader changed their mind -- re-aim rather than
      // carrying on toward a level they are no longer heading for.
      if (dt > 0) g.speed = (t.clientY - g.lastY) / dt;
      g.lastY = t.clientY; g.lastT = now;
      const aimed = verticalTarget(dy);
      if (!aimed) { g.dy = dy * EDGE_PULL; if (e.cancelable) e.preventDefault(); paintZoom(g.dy); return; }
      // Re-aiming mid-drag means the strip on screen is for the wrong
      // journey -- drop it and take the other one.
      if (g.zoom && g.zoom.slug !== aimed.slug) {
        if (g.frames) { g.frames.end(); }
        if (g.flip) { g.flip.end(); }
        g.frames = undefined; g.flip = undefined;
      }
      g.zoom = aimed;
      g.dy = dy;
      if (e.cancelable) e.preventDefault();
      // The frames ARE the map's half of the movement, so they are
      // scrubbed rather than played: progress maps onto frame index, and
      // dragging slowly flips through the drawings one at a time. The
      // scale still runs underneath for the furniture -- the columns and
      // the two bars are printed on the screen, not drawn on the map.
      if (g.flip === undefined) {
        g.flip = beginFlip(aimed);
        // Only fall back to the bare strip where there is no step table.
        g.frames = g.flip ? null : beginFrames(aimed);
      }
      if (g.flip) {
        // The flip book IS the screen for the length of the journey, so
        // the page underneath must not also be scaling: two things
        // moving to the same end is one too many.
        g.flip.paint(zoomProgress(dy));
      } else {
        paintZoom(dy);
        if (g.frames) g.frames.paint(zoomProgress(dy));
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      if (pinch && e.touches.length < 2) { pinch = null; return; }
      if (!g) return;
      const gesture = g;
      g = null;
      if (gesture.axis === 'y') {
        const dy = gesture.dy || 0;
        const p = zoomProgress(dy);
        const target = verticalTarget(dy);
        const far = p > 0.55;
        const flicked = Math.abs(gesture.speed) > FLICK_SPEED &&
                        Math.sign(gesture.speed) === Math.sign(dy) && Math.abs(dy) > SLOP * 2;
        const flip = gesture.flip || null;
        const frames = gesture.frames || null;

        // ── The flip book: there is no stopping in between ──
        // Whichever end is nearer, it runs there. Committing, the page
        // is swapped BEHIND the layer while the reader is still looking
        // at a drawing -- which is the one moment that work is free,
        // and the whole reason the middle of this journey is inert.
        if (flip) {
          const dur = zoomDurationMs() || 380;
          if (target && (far || flicked)) {
            pendingFlip = flip;
            flip.run(p, 1, Math.max(120, Math.round(dur * (1 - p))));
            setZoomWait(Math.max(120, Math.round(dur * (1 - p))));
            navigate(target.slug, target.dir);
          } else {
            flip.run(p, 0, Math.max(120, Math.round(dur * p))).then(() => flip.end());
          }
          return;
        }
        if (target && (far || flicked)) {
          // Run out whatever is left of the strip, at the same rate the
          // rest of the transition moves, and hand it to navigateTo to
          // fade once the real map is standing underneath it.
          // A floor, because "what is left" can be almost nothing: a
          // finger dragged the whole way leaves no time to fade the
          // outgoing page, and it was being cut rather than faded. 35%
          // of the duration is enough for a real crossfade and still
          // shorter than the fixed wait this replaced.
          const dur = zoomDurationMs() || 380;
          const rest = Math.max(Math.round(dur * 0.35), Math.round(dur * (1 - p)));
          if (frames) {
            frames.play(p, 1, rest);
            pendingFrames = frames;
          }
          // The swap begins the moment the drawing stops moving, rather
          // than a fixed 380ms after the finger left -- which on a drag
          // taken most of the way was a third of a second of nothing.
          setZoomWait(rest);
          flingZoom(target.dir, rest);
          navigate(target.slug, target.dir);
          return;
        }
        // Abandoned: the same drawings, run backwards.
        if (frames) frames.play(p, 0, 220).then(function () { frames.end(); });
        springZoom();
        return;
      }
      // A gesture that never claimed the vertical axis is not ours --
      // there is nothing left to release but the drag class.
      releaseAll();
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
      pinch = null;
      if (!g) return;
      if (g.frames) g.frames.end();
      if (g.flip) g.flip.end();
      g = null;
      springZoom();
    }, { passive: true });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleIncoming);
    } else {
      handleIncoming();
    }
  }
  initSwipePagination();

  // The two pages either side of whichever one really loaded. Deliberately
  // at idle and after load rather than on DOMContentLoaded: this page's
  // own scripts, fonts and map art come first, and a prefetch that
  // competes with them has made the app slower, not faster.
  if (document.readyState === 'complete') prefetchNeighbours(currentPage());
  else window.addEventListener('load', () => prefetchNeighbours(currentPage()));

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
