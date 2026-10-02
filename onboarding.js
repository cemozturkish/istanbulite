// Onboarding flow for brand-new accounts.
// Runs on first login: locks the page behind a full-screen overlay, then
// welcome → the language hold → the tour (the top bar and the avatar, the
// sky, Kütüphane, Kahvehane) → kefil code → profile prompt, and writes
// onboarded_at, language_pref and mascot to profiles at the end.
//
// It runs in ONE page, because the app is one page (project.html). The tour
// used to walk anahane → kahvehane → sozcel → kutuphane → anahane by
// navigating, saving its place in sessionStorage between them; those pages
// are a parts bin now and nothing links to them, so that whole leg is gone.
// What replaced it is the three lanes of slide 12, walked with the same
// sideways pull the reader will use forever after -- see stepTour.
//
// Mount once after auth:
//   IstOnboarding.maybeRun({ sb, user, kefilName })
// It checks profiles.onboarded_at — if null, runs the flow; otherwise no-op.
// Without window.__fb (a parts-bin page opened directly) the tour is
// skipped and the flow goes welcome → … → kefil code → finish.

(function (global) {
  const ROOT_ID = 'ist-onb-root';
  // Only ever cleared now -- see clearState.
  const STATE_KEY = 'istanbulite_onboarding';

  // ── Copy ──
  // English is fixed for the welcome screens. The reader is then taught
  // the language hold (hold the logo on the bottom bar) rather than asked
  // to pick from a menu, and every beat after that branches into TR or EN
  // by whichever way they left it leaning.
  const COPY = {
    welcome: {
      lead: 'Welcome to ISTANBULITE!',
      // Page 1: kefil line + responsibility warning. The warning carries
      // `tcCheckbox` so a "I agree to the terms and conditions." checkbox
      // appears below it; the tap-to-continue hint only shows after it's
      // ticked, blocking advance until the user consents.
      // Page 2 (pageBreak): Turglish sentence (hover for "Turkish + English"),
      // then the language pitch, which ends on the instruction to HOLD THE
      // LOGO -- `holdLesson` starts that beat the moment the line is typed
      // (see stepLanguageHold), with no extra tap in between.
      lines: [
        {
          instant: '<em class="kefil-name">{KEFIL}</em> told us great things about you.',
          typed:   'We are glad to see you become a part of the community.',
        },
        {
          instant: 'But remember — they vouched for you.<br>If you were to violate the code of conduct,<br>your sponsor will be responsible.',
          tcCheckbox: true,
        },
        {
          pageBreak: true,
          instant: 'Istanbulite is by default in <span class="ist-onb-turglish" data-tip="Turkish + English">Turglish</span>.',
        },
        {
          instant: 'Things will always be in both languages — but they can lean Turkish, or lean English.',
          typed:   'Hold the İstanbulite logo at the bottom of the screen to switch between them.',
          speed: 18,
          holdLesson: true,
        },
      ],
      tapHint: 'tap anywhere to continue',
      tcLabel: 'I agree to the terms and conditions.',
    },
    // ── The language hold ──
    // There is no language menu any more: the app changes language by
    // holding the logo (THE LANGUAGE HOLD in project.html), so that is what
    // the reader is taught, by doing it once. `cue` is printed under the
    // instruction until they do (English, like the rest of the welcome);
    // `done` is said AFTER the flip, in the language it just arrived at --
    // and said again, the other way, if they hold it a second time.
    langHold: {
      cue:   'hold the logo',
      nudge: "can't hold? tap to carry on",
      done: {
        tr: {
          instant: 'İşte bu — artık Türkçe ağırlıklı.',
          typed:   'Nerede olursan ol, logoyu basılı tutarak istediğin zaman değiştirebilirsin. Geri almak için bir daha basılı tut.',
        },
        en: {
          instant: 'That is it — it leans English now.',
          typed:   'Wherever you are, hold the logo to switch whenever you like. Hold it again to switch back.',
        },
      },
    },
    // ── The tour ──
    // One plain voice, TR/EN. The order is the reader's first walk through
    // the app, each step taught by being done once:
    //   the top bar  -- press your own name, style your avatar, close it;
    //   the sky      -- the sun and the moon crossing under the bar, and
    //                   what each edge of the day renews;
    //   Kütüphane    -- renewed at sunrise; pull there, open a story, throw it;
    //   Kahvehane    -- renewed at sunset; pull there, open an evening, throw it.
    // (The language hold comes before all of this, on the welcome screen --
    // see stepLanguageHold.)
    //
    // It OPENS ON THE READER THEMSELVES, because a brand-new account's
    // petek is one hexagon and six empty sides: nobody has handed them a
    // code yet, so nothing true can be said about neighbours on day one.
    // What IS true on day one is their own hexagon, so they make their
    // avatar first.
    //
    // A DOOR/OPEN beat's copy is only ever the instruction -- never the
    // description of what is behind it, which would be true a beat too
    // early. The description is a plain talk beat straight after arrival.
    //
    // Keys whose MEANING changed were given new names rather than reused:
    // an admin-saved override (db/onboarding_copy.sql) for an old key would
    // otherwise say the old thing on the new beat.
    lanes: {
      tr: {
        toSen:       'Yukarıda, çubuğun üstündeki kendi adına bas.',
        avatarIntro: 'Burası sensin. Önce avatarını yaratalım.',
        pickHair:    'Saçını seç. Beğenince devam et.',
        pickShirt:   'Tişörtünü seç. Beğenince devam et.',
        senDone:     'Geri kalanı — şapkalar, rozetler — dışarıda kazanılır. Satın alınamaz.',
        closeSheet:  'Tamam. Şimdi kapat.',
        sky:         'Adının altındaki zincir İstanbul’un gökyüzü: güneş soldan doğar, sağdan batar; gece ay geçer. Uygulama da onunla döner.',
        sunrise:     'Güneş doğunca Kütüphane yenilenir — günün haberleri, günün sorusu. Kütüphane solda: oraya geçelim.',
        newsOpen:    'Bunlar bugünün haberleri. Birine bas.',
        newsThrow:   'Okuyunca işin bitti: sağa ya da sola fırlat, gitsin. Bir habere hep böyle veda edersin.',
        newsNone:    'Bugün henüz haber yok. Olduğunda, birine basıp okursun; bitince sağa ya da sola fırlatırsın.',
        toKahvehane: 'Şimdi Kahvehane. En sağda — haritadan geçip devam et.',
        sunset:      'Güneş batınca da Kahvehane yenilenir — bu akşamın etkinlikleri, bu gecenin oyunları.',
        eventOpen:   'Bunlar dışarıda olan şeyler. Birine bas.',
        eventThrow:  'Aynı hareket, ama burada yönün bir cevap: sağa fırlatırsan gidiyorsun, sola fırlatırsan gitmiyorsun.',
        eventNone:   'Bugün henüz etkinlik yok. Olduğunda, birine basıp açarsın: sağa fırlatmak “gidiyorum”, sola fırlatmak “gitmiyorum” demek.',
      },
      en: {
        toSen:       'Press your own name, up on the bar.',
        avatarIntro: 'This is you. First, let’s create your avatar.',
        pickHair:    'Pick your hair. Continue once you like it.',
        pickShirt:   'Pick your shirt. Continue once you like it.',
        senDone:     'The rest of it — hats, badges — is earned outside. It cannot be bought.',
        closeSheet:  'Good. Now close it.',
        sky:         'The chain under your name is the sky over İstanbul: the sun rises on the left and sets on the right, and at night the moon crosses. The app turns with it.',
        sunrise:     'When the sun rises, Kütüphane renews — the day’s news, the day’s question. Kütüphane is on the left: let’s go there.',
        newsOpen:    'These are today’s stories. Press one.',
        newsThrow:   'Once you have read it, you are done with it: throw it left or right and it is gone. That is how you let go of every story.',
        newsNone:    'No stories yet today. When there are, you press one to read it and throw it left or right when you are done.',
        toKahvehane: 'Now Kahvehane. It is all the way right — past the map, and keep going.',
        sunset:      'And when the sun sets, Kahvehane renews — tonight’s evenings and tonight’s games.',
        eventOpen:   'These are things happening outside. Press one.',
        eventThrow:  'The same throw, but here the direction is your answer: throw it right if you are going, left if you are not.',
        eventNone:   'No evenings yet today. When there are, you press one to open it: throwing it right says you are going, left says you are not.',
      },
    },
    // Printed under the line on a beat that waits for the reader to do
    // something real, and the harder nudge that replaces one if they stall
    // (see STALL_MS). Nothing here ever dead-ends.
    pullLeft:    { tr: 'parmağını sola kaydır',  en: 'pull left' },
    pullRight:   { tr: 'parmağını sağa kaydır',  en: 'pull right' },
    // The petek's own two level-pull beats always go the same way -- out,
    // from Sen toward the whole shape -- which on the plane is a finger
    // pulled UP (see wireHiveGestures in profile-card.js: the level only
    // ever increases when the drag overshoots upward). Never "down": that
    // is the physical opposite of the gesture that actually advances it.
    pullUp:      { tr: 'parmağını yukarı kaydır', en: 'pull up' },
    // The two press prompts the sheet's own door beats print, and the two
    // the open/throw beats print (see runOpen / runThrow).
    pressName:   { tr: 'adına bas', en: 'press your name' },
    pressClose:  { tr: 'kapat', en: 'close it' },
    pressBox:    { tr: 'birine bas', en: 'press one' },
    throwIt:     { tr: 'sağa ya da sola fırlat', en: 'throw it left or right' },
    throwNudge: {
      tr: 'fırlatamıyor musun? devam etmek için dokun',
      en: "can't throw? tap to carry on",
    },
    // The petek is behind a PRESS rather than a pull, so its own two
    // beats say press rather than borrowing one of the pull prompts.
    pressLogo:   { tr: 'logoya bas', en: 'press the logo' },
    pullNudge: {
      tr: 'kaydıramıyor musun? devam etmek için dokun',
      en: "can't pull? tap to carry on",
    },
    pressNudge: {
      tr: 'basamıyor musun? devam etmek için dokun',
      en: "can't press? tap to carry on",
    },
    // The avatar-picking beats no longer advance on an arrow press (the
    // reader may want to browse several before settling) -- this is the
    // real button that does, in renderPane's own actionLabel slot.
    continueLabel: { tr: 'DEVAM ET', en: 'CONTINUE' },
    kefilShare: {
      tr: 'Bu senin kodun. Gerçekten kefil olabileceğin birine ver — <em class="kefil-name">{KEFIL}</em> sana nasıl kefil olduysa, sen de ona öyle olacaksın. Yanlış davranırsa sorumluluk sende.',
      en: "This is your code. Give it to somebody you would actually vouch for — you will be their sponsor, the way <em class=\"kefil-name\">{KEFIL}</em> is yours. If they misbehave, it is on you.",
    },
    profilePrompt: {
      tr: 'Hepsi bu kadar. Dışarısı seni bekliyor.',
      en: 'That is all of it. Outside is waiting for you.',
    },
    finishLabel: { tr: 'BİTİR', en: 'FINISH' },
    tapToContinue: { tr: 'devam etmek için herhangi bir yere dokun', en: 'tap anywhere to continue' },
    copy: { tr: 'KOPYALA', en: 'COPY' },
    copied: { tr: 'KOPYALANDI', en: 'COPIED' },
  };

  // ── State ──
  let sb, user, kefilName, referralCode, homeNb;
  let lang = 'en';     // 'en' or 'tr' once the language hold has been taught
  // The palette is no longer asked: the reader keeps whichever the app is
  // already on (palette.js), and it stays changeable from the profile sheet.
  function currentPalette() {
    return document.documentElement.getAttribute('data-palette') === 'earth' ? 'earth' : 'mono';
  }
  // Not chosen and never shown: the onboarding has no mascot any more. It is
  // still DERIVED from the palette and written to profiles.mascot at the end,
  // because admin-notification.js reads that column for its own bubble and an
  // unset one would quietly change that feature. Bringing a mascot back here
  // is putting the picture back, not re-adding the data.
  // Admin-editable overrides for COPY.lanes, keyed the same way
  // (db/onboarding_copy.sql; edited from admin.html's Users tab). null
  // until fetched, {} if the table is empty or missing -- either way
  // laneCopy() falls back to the hardcoded default per key, so a database
  // without the migration behaves exactly as it did before this existed.
  let dbLaneCopy = null;
  let root;            // DOM root for fullscreen modal phases
  let spotlightEl;     // The transparent tap-catcher over the page (see #ist-onb-spotlight)
  let pane;            // The mascot pane (corner bubble)
  let focused = [];    // the elements the current beat is pointing at (.ist-onb-focus)
  let firewallInstalled = false;
  // When set, a click anywhere on the page (outside the pane / interactive
  // target) advances the tour. Cleared after firing once.
  let tapAdvanceFn = null;

  // ── Helpers ──
  // COPY.lanes[lang] with any admin-edited rows laid over it, key for key.
  // An empty or missing body for a key leaves the hardcoded default in
  // place rather than showing a blank bubble -- an admin clearing a field
  // means "I have not written one," not "say nothing here."
  function laneCopy(lang) {
    const base = COPY.lanes[lang];
    if (!dbLaneCopy) return base;
    const merged = Object.assign({}, base);
    Object.keys(base).forEach(key => {
      const row = dbLaneCopy[key];
      const text = row && (lang === 'en' ? row.body_en : row.body_tr);
      if (text) merged[key] = text;
    });
    return merged;
  }
  function fillKefil(s) {
    return (s || '').replace(/\{KEFIL\}/g, escapeHTML(kefilName || ''));
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function clearStage() {
    const stage = document.getElementById('ist-onb-stage');
    stage.innerHTML = '';
    clearHint();
    // After a step rerenders, the previously-focused element is gone.
    // Re-focus the first control in the visible container.
    focusFirst();
  }
  function addMsg(html, opts) {
    const stage = document.getElementById('ist-onb-stage');
    const el = document.createElement('div');
    el.className = 'ist-onb-msg' + (opts?.lead ? ' lead' : '');
    el.innerHTML = html;
    stage.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    return el;
  }

  // Two-part message: first half appears instantly, second half types out
  // letter-by-letter on the next line. Resolves when typing finishes.
  function addMsgTyped({ instant, typed }, speed = 25) {
    return new Promise(resolve => {
      const stage = document.getElementById('ist-onb-stage');
      const el = document.createElement('div');
      el.className = 'ist-onb-msg';
      const top = document.createElement('span');
      top.innerHTML = instant;
      const br = document.createElement('br');
      const bottom = document.createElement('span');
      bottom.className = 'ist-onb-typed';
      el.appendChild(top);
      el.appendChild(br);
      el.appendChild(bottom);
      stage.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      // Plain-text typing — keep the `typed` source HTML-free in COPY.
      let i = 0;
      (function tick() {
        bottom.textContent = typed.slice(0, i);
        if (i >= typed.length) { resolve(); return; }
        i++;
        setTimeout(tick, speed);
      })();
    });
  }

  // Typed-only line (no instant half above it).
  function addMsgTypedOnly(typed, speed = 25) {
    return new Promise(resolve => {
      const stage = document.getElementById('ist-onb-stage');
      const el = document.createElement('div');
      el.className = 'ist-onb-msg';
      const span = document.createElement('span');
      span.className = 'ist-onb-typed';
      el.appendChild(span);
      stage.appendChild(el);
      requestAnimationFrame(() => el.classList.add('show'));
      let i = 0;
      (function tick() {
        span.textContent = typed.slice(0, i);
        if (i >= typed.length) { resolve(); return; }
        i++;
        setTimeout(tick, speed);
      })();
    });
  }
  // Tracks the currently-installed addHint listeners so clearHint /
  // re-addHint can remove them cleanly. Without this, stale handlers
  // accumulate and clicks fire onClick multiple times — which would let
  // the user advance past a checkbox they un-ticked, for example.
  let activeHintHandlers = null;

  function cleanupHintListeners() {
    if (!activeHintHandlers) return;
    const { hint, hintHandler, rootHandler } = activeHintHandlers;
    if (hint && hintHandler) hint.removeEventListener('click', hintHandler);
    if (root && rootHandler) root.removeEventListener('click', rootHandler);
    tapAdvanceFn = null;
    activeHintHandlers = null;
  }

  function addHint(text, onClick) {
    // The hint button lives on <body> (not inside root) so it stays
    // visible during the spotlight tour when the modal root is hidden.
    // Always tear down the previous listeners before wiring new ones.
    cleanupHintListeners();
    let hint = document.body.querySelector('.ist-onb-hint');
    if (!hint) {
      hint = document.createElement('button');
      hint.type = 'button';
      hint.className = 'ist-onb-hint';
      document.body.appendChild(hint);
    }
    hint.textContent = text;
    // The pill is uppercased by CSS and the document is lang="tr", so an
    // English line folds "continue" to "CONTİNUE" unless it says otherwise.
    hint.lang = lang === 'tr' ? 'tr' : 'en';
    setTimeout(() => hint.classList.add('show'), 250);

    function fire() {
      cleanupHintListeners();
      onClick();
    }
    const hintHandler = (e) => { e.stopPropagation(); fire(); };
    hint.addEventListener('click', hintHandler);

    // Welcome modal mode: any click inside the modal background (not on
    // an interactive child) advances. Spotlight mode: tapAdvanceFn instead.
    let rootHandler = null;
    if (root && root.classList.contains('show')) {
      rootHandler = (e) => {
        if (e.target.closest('.ist-onb-choice, .ist-onb-btn, .ist-onb-codebox button, .ist-onb-tc')) return;
        fire();
      };
      root.addEventListener('click', rootHandler);
    } else {
      tapAdvanceFn = fire;
    }
    activeHintHandlers = { hint, hintHandler, rootHandler };
    focusFirst();
  }
  function clearHint() {
    cleanupHintListeners();
    const hint = document.body.querySelector('.ist-onb-hint');
    if (hint) hint.remove();
  }

  // ── Stale cross-page state ──
  // The flow used to hop four pages and keep its place here between them.
  // It is one page now, so nothing is ever written -- this only clears what
  // an older build may have left behind (see maybeRun).
  function clearState() {
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) { /* ignore */ }
  }

  // ── Steps ──
  function show() {
    root.classList.add('show');
    document.body.classList.add('ist-onb-locked', 'ist-onb-modal', 'ist-onb-reveal');
    installFirewall();
    focusFirst();
  }
  // Pull focus into the onboarding so a keyboard user can Tab through
  // its controls instead of being trapped on the page underneath.
  function focusFirst() {
    // Defer to next frame so freshly-appended buttons are focusable.
    requestAnimationFrame(() => {
      let el = firstFocusableIn(focusableContainer());
      // Fall back to the bottom-pinned hint if the pane / root has no controls
      // (non-interactive spotlight beats only have the hint).
      if (!el) el = document.body.querySelector('.ist-onb-hint');
      if (el) el.focus();
      else if (root) { root.setAttribute('tabindex', '-1'); root.focus(); }
    });
  }
  function hide() {
    root.classList.remove('show');
    document.body.classList.remove('ist-onb-locked', 'ist-onb-modal', 'ist-onb-lang', 'ist-onb-reveal');
    Array.from(document.body.classList)
      .filter(c => c.indexOf('ist-onb-show-') === 0)
      .forEach(c => document.body.classList.remove(c));
    removeFirewall();
    clearSpotlight();
    hidePane();
  }

  async function stepWelcome() {
    clearStage();
    const w = COPY.welcome;
    addMsg(w.lead, { lead: true });
    let idx = 0;
    addHint(w.tapHint, advance);

    async function advance() {
      const item = w.lines[idx];
      idx++;
      // Hide the hint while the line renders/types so the user can't tap
      // through before the message is even visible.
      clearHint();
      // pageBreak clears the previous lines (and the lead) before rendering
      // this item — opens a fresh "page" inside the same welcome screen.
      if (item && typeof item === 'object' && item.pageBreak) {
        clearStage();
      }
      if (typeof item === 'string') {
        addMsg(fillKefil(item));
      } else if (item.typed && !item.instant) {
        await addMsgTypedOnly(item.typed, item.speed);
      } else if (item.instant && !item.typed) {
        // Instant-only — render the HTML in one shot, no typing.
        addMsg(fillKefil(item.instant));
      } else {
        await addMsgTyped({
          instant: fillKefil(item.instant),
          typed:   item.typed, // typed half stays plain text on purpose
        }, item.speed);
      }
      // Items can suppress the tap hint until the user consents to T&Cs.
      // The checkbox renders inline; ticking it shows the hint.
      if (item && typeof item === 'object' && item.tcCheckbox) {
        renderTCCheckbox(() => {
          if (idx < w.lines.length) addHint(w.tapHint, advance);
          else addHint(w.tapHint, stepLanguageHold);
        });
        return;
      }
      // The line that says "hold the logo" hands straight over to the beat
      // that waits for it -- a tap in between would be a tap on nothing.
      if (item && typeof item === 'object' && item.holdLesson) {
        stepLanguageHold();
        return;
      }
      if (idx < w.lines.length) {
        const hintText = (item && typeof item === 'object' && item.nextHint) || w.tapHint;
        addHint(hintText, advance);
      } else {
        addHint(w.tapHint, stepLanguageHold);
      }
    }
  }

  // Render the T&C checkbox below the most recent message. `onConsent` is
  // called the moment the user ticks; unchecking clears the tap hint so
  // they can't proceed without consent.
  function renderTCCheckbox(onConsent) {
    const stage = document.getElementById('ist-onb-stage');
    const label = document.createElement('label');
    label.className = 'ist-onb-tc';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'ist-onb-tc-input';
    const text = document.createElement('span');
    text.className = 'ist-onb-tc-label';
    text.textContent = COPY.welcome.tcLabel;
    label.appendChild(cb);
    label.appendChild(text);
    stage.appendChild(label);
    requestAnimationFrame(() => label.classList.add('show'));
    cb.addEventListener('change', () => {
      if (cb.checked) onConsent();
      else clearHint();
    });
    focusFirst();
  }

  // ── The language hold ──
  // Teaches the one way the app changes language (THE LANGUAGE HOLD in
  // project.html) by having the reader do it: the bottom bar is standing
  // over the welcome screen with nothing on it but the logo (see
  // body.ist-onb-modal in onboarding.css), the logo alone is handed back
  // (the same scoped passthrough the petek's door beat uses), and the
  // beat moves on only once the flip has actually happened. The hold
  // itself is project.html's own, untouched -- all it needs from here is
  // body.ist-onb-lang, which is what tells it the tour is not arguing
  // with it this time.
  //
  // A second hold flips it back and the line after it is said again the
  // other way, so the reader can leave it leaning whichever way they like
  // before they tap on. And like every gesture beat it cannot dead-end:
  // after STALL_MS a reader who cannot hold is let through anyway.
  function stepLanguageHold() {
    const logo = document.getElementById('fb-logo-btn');
    const i18n = global.I18N;
    // No bar or no I18N (a page without the compass): nothing to teach.
    if (!logo || !i18n || !i18n.onChange) { syncLangFromI18N(); stepTour(); return; }

    const L = COPY.langHold;
    const stage = document.getElementById('ist-onb-stage');
    const cue = document.createElement('div');
    cue.className = 'ist-onb-holdcue';
    cue.textContent = L.cue;
    stage.appendChild(cue);
    requestAnimationFrame(() => cue.classList.add('show'));

    document.body.classList.add('ist-onb-lang');
    openPassthrough('#fb-logo-btn');

    let seq = 0;
    let stall = setTimeout(() => {
      stall = null;
      addHint(L.nudge, done);
    }, STALL_MS);

    async function onFlip() {
      const my = ++seq;
      if (stall) { clearTimeout(stall); stall = null; }
      syncLangFromI18N();
      clearStage();
      const d = L.done[lang];
      await addMsgTyped({ instant: d.instant, typed: d.typed }, 18);
      // A second flip while this was still typing owns the stage now.
      if (my !== seq) return;
      addHint(COPY.tapToContinue[lang], done);
    }
    i18n.onChange(onFlip);

    function done() {
      if (stall) { clearTimeout(stall); stall = null; }
      i18n.offChange && i18n.offChange(onFlip);
      document.body.classList.remove('ist-onb-lang');
      closePassthrough();
      syncLangFromI18N();
      stepTour();
    }
  }

  // The tour's own two-way `lang` read back off I18N, which is the one
  // source of truth for which way the app leans.
  function syncLangFromI18N() {
    if (global.I18N && I18N.isEnglish) lang = I18N.isEnglish() ? 'en' : 'tr';
  }

  // ───── Phase 2: spotlight-driven tour ─────
  // The fullscreen modal collapses; the actual page is dimmed and we cut a
  // hole around one element at a time. Mascot sits in a corner and either
  // shows a Next button or waits for the user to actually tap something.

  function ensureSpotlightDOM() {
    if (!spotlightEl) {
      spotlightEl = document.createElement('div');
      spotlightEl.id = 'ist-onb-spotlight';
      document.body.appendChild(spotlightEl);
    }
    if (!pane) {
      pane = document.createElement('div');
      pane.id = 'ist-onb-pane';
      document.body.appendChild(pane);
    }
    pane.setAttribute('data-palette', currentPalette());
  }

  // ── What the reader can see: one thing at a time ──
  // The tour does not dim the app and cut holes in the dim any more. A
  // hole is a rectangle, and a rectangle cut around a name on a hexagon
  // bar, or around a card, lights the paper around the thing as well as
  // the thing -- a lit box is a second object competing with the one it
  // points at. And a dim is still see-through: the petek, the map and
  // the columns all stood there, quieted but plainly visible, before a
  // word had been said about any of them.
  //
  // So it works the other way round. While the tour runs
  // (body.ist-onb-reveal) everything it has not introduced yet is simply
  // NOT THERE (`visibility: hidden`, so nothing re-lays-out when it
  // arrives), and each beat brings its part in (`show`, see revealPart).
  // What the beat is pointing at right now glows -- the element itself,
  // through a filter on its own painted pixels (.ist-onb-focus), so a
  // name glows as letters and a card as a card, never as a box around
  // either. What has been introduced stays in the app at full strength;
  // only the thing being talked about glows.
  //
  // #ist-onb-spotlight survives as a transparent layer over the page: it
  // is the tap target the tap-anywhere firewall relies on (see its CSS).
  function revealPart(part) {
    document.body.classList.add('ist-onb-show-' + part);
  }
  function setFocus(target) {
    clearFocus();
    spotlightEl.classList.add('show');
    const els = !target ? []
      : (target.length !== undefined && !target.nodeType ? Array.from(target) : [target]);
    els.forEach(el => { if (el) { el.classList.add('ist-onb-focus'); focused.push(el); } });
  }
  function clearFocus() {
    focused.forEach(el => el.classList.remove('ist-onb-focus'));
    focused = [];
  }
  function clearSpotlight() {
    clearFocus();
    if (spotlightEl) spotlightEl.classList.remove('show');
  }

  // Block clicks/swipes/wheel/keyboard on the rest of the page during the
  // whole onboarding so the user can't navigate away. anahane.html attaches
  // touchstart + wheel listeners on `document` for swipe-pagination — we
  // stopImmediatePropagation in the capture phase so those never see the
  // event. Pane / modal clicks pass through, and so does the book while a
  // pull beat is waiting on one (see isPassthrough).
  function isInsideOnboarding(target) {
    return target && target.closest && target.closest('#ist-onb-root, #ist-onb-pane, .ist-onb-hint');
  }
  // While a pull beat is waiting, the book is the reader's again and the
  // firewall has to stand down over it -- the CSS passthrough alone is not
  // enough. project.html drags on POINTER events, which this firewall never
  // sees, but it does preventDefault the touchmove underneath them: on a
  // phone that cancels the very pull the mascot just asked for, and the
  // beat waits forever on a gesture the page is swallowing. That is the
  // shape of the old stuck-states, so it is stated here rather than relied
  // on from the stylesheet.
  function isPassthrough(target) {
    if (!passScope) return false;
    return !!(target && target.closest && target.closest(passScope));
  }
  // A press the TOUR makes on the reader's behalf (a stall escape doing the
  // press itself, a beat re-opening the sheet it needs). The firewall is a
  // capture listener on document, so a synthetic .click() on the app is
  // swallowed like any other unless it is let through for that one call.
  let firewallBypass = false;
  function pressThrough(el) {
    if (!el) return;
    firewallBypass = true;
    try { el.click(); } finally { firewallBypass = false; }
  }
  function gestureFirewall(e) {
    if (firewallBypass) return;
    if (isInsideOnboarding(e.target)) return;
    if (isPassthrough(e.target)) return;
    if (typeof e.preventDefault === 'function' && e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
    // Tap-anywhere advance for non-interactive spotlight beats. Fires on a
    // real click (mouse / trackpad / assistive pointer) OR on touchend --
    // NOT on touchstart, even though touchstart reaches this same handler.
    // touchstart's own preventDefault() two lines up is exactly what stops
    // the browser from ever synthesizing that click on a touch device: a
    // click that only fires on desktop is what made "tap anywhere" actually
    // mean "tap the one button excluded from this firewall" on a phone.
    // touchend calling preventDefault() here does the same to whatever
    // synthetic click would otherwise follow it, so this never double-fires.
    if ((e.type === 'click' || e.type === 'touchend') && tapAdvanceFn) {
      const fn = tapAdvanceFn;
      tapAdvanceFn = null;
      fn();
    }
  }
  // Keyboard firewall: blocks page-navigation keys (arrows, PageUp/Down,
  // Home/End, Enter, Space) when fired outside the onboarding, but ALWAYS
  // lets Tab and Escape through so a keyboard user can move focus. The
  // focusin trap below then pulls focus back inside the onboarding if it
  // lands on a background element.
  function keyFirewall(e) {
    if (e.key === 'Tab' || e.key === 'Escape') return;
    if (isInsideOnboarding(e.target)) return;
    if (isPassthrough(e.target)) return;
    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
  }
  // Pick the visible onboarding container so we focus the right place.
  function focusableContainer() {
    if (pane && pane.classList.contains('show')) return pane;
    return root;
  }
  function firstFocusableIn(container) {
    if (!container) return null;
    return container.querySelector(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
  }
  function focusTrap(e) {
    if (isInsideOnboarding(e.target)) return;
    if (isPassthrough(e.target)) return;
    const el = firstFocusableIn(focusableContainer());
    if (el) el.focus();
  }
  function installFirewall() {
    if (firewallInstalled) return;
    document.addEventListener('click', gestureFirewall, true);
    document.addEventListener('wheel', gestureFirewall, { capture: true, passive: false });
    document.addEventListener('touchstart', gestureFirewall, { capture: true, passive: false });
    document.addEventListener('touchmove', gestureFirewall, { capture: true, passive: false });
    document.addEventListener('touchend', gestureFirewall, { capture: true, passive: false });
    document.addEventListener('keydown', keyFirewall, true);
    document.addEventListener('focusin', focusTrap, true);
    firewallInstalled = true;
  }
  function removeFirewall() {
    if (!firewallInstalled) return;
    document.removeEventListener('click', gestureFirewall, true);
    document.removeEventListener('wheel', gestureFirewall, { capture: true });
    document.removeEventListener('touchstart', gestureFirewall, { capture: true });
    document.removeEventListener('touchmove', gestureFirewall, { capture: true });
    document.removeEventListener('touchend', gestureFirewall, { capture: true });
    document.removeEventListener('keydown', keyFirewall, true);
    document.removeEventListener('focusin', focusTrap, true);
    firewallInstalled = false;
  }

  function renderPane({ speech, actionLabel, onAction, promptText, top }) {
    pane.innerHTML = '';
    // The open/throw beats hand the reader the cast boxes and the page they
    // grow into, which stand exactly where the pane rests at the bottom --
    // so those beats say their line from the top of the screen instead,
    // over the map, where nothing is being asked of the finger.
    pane.classList.toggle('ist-onb-pane-top', !!top);
    // The prompt is uppercased by CSS and the document is lang="tr", so an
    // English "pull right" folds to "PULL RİGHT" unless the pane says
    // which language it is in.
    pane.lang = lang === 'tr' ? 'tr' : 'en';
    const bubble = document.createElement('div');
    bubble.className = 'ist-onb-bubble';
    bubble.innerHTML = speech;
    pane.appendChild(bubble);

    const actions = document.createElement('div');
    actions.className = 'ist-onb-actions';
    if (promptText) {
      const prompt = document.createElement('div');
      prompt.className = 'ist-onb-prompt';
      prompt.textContent = promptText;
      actions.appendChild(prompt);
    }
    if (actionLabel) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ist-onb-btn';
      btn.textContent = actionLabel;
      btn.addEventListener('click', onAction);
      actions.appendChild(btn);
    }
    pane.appendChild(actions);
    pane.classList.add('show');
    focusFirst();
  }

  function hidePane() { pane.classList.remove('show'); }

  // Hide the fullscreen modal but keep the body lock so the user can't
  // scroll past the page while spotlighted.
  function enterSpotlightMode() {
    ensureSpotlightDOM();
    root.classList.remove('show');
    document.body.classList.remove('ist-onb-modal');
    document.body.classList.add('ist-onb-spot');
  }
  function exitSpotlightMode() {
    clearSpotlight();
    hidePane();
    root.classList.add('show');
    document.body.classList.add('ist-onb-modal');
    document.body.classList.remove('ist-onb-spot');
  }

  // ───── The lane tour ─────
  // The app is one page now (project.html), so nothing here navigates: the
  // reader walks the three lanes of slide 12 with the same sideways pull
  // they will use forever after, and the tour watches the book rather than
  // driving it. `window.__fb` is project.html's own deliberate handle.
  //
  // Two kinds of beat:
  //   talk    — the mascot speaks, the page is locked, a tap anywhere advances
  //   pull    — the mascot asks for a real pull; the book is handed back to
  //             the reader (see passthrough) and the beat ends when they
  //             actually arrive on the lane it named.
  //
  // A pull beat can never dead-end. If the reader has not arrived after
  // STALL_MS the prompt turns into a tap-to-continue and the tour carries on
  // without them having made the gesture -- a reader who cannot swipe (a
  // trackpad, a stuck finger, an assistive pointer) must still reach the end.
  const STALL_MS = 12000;

  // project.html's lane numbering, mirrored here rather than imported:
  // 0 Kütüphane (left on screen), 1 the app map (the middle), 2 Kahvehane
  // (right). The petek is not a lane at all any more -- it is behind the
  // logo, which is why the tour has its own two press beats for it.
  const LANE_KUTUPHANE = 0, LANE_MAP = 1, LANE_KAHVEHANE = 2;

  // The book, when this is running inside project.html. Absent on the
  // parts-bin pages (anahane/kahvehane/kutuphane/mahalle), which no longer
  // have lanes to walk -- there the tour is skipped outright (see stepTour).
  function fb() { return global.__fb || null; }

  let laneWatch = null;   // rAF id for the arrival watcher
  let stallTimer = null;  // the STALL_MS escape hatch

  function stopLaneWatch() {
    if (laneWatch) { cancelAnimationFrame(laneWatch); laneWatch = null; }
    if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
  }

  // Hand part of the page back to the reader for the length of a beat that
  // asks them to do something real. body.ist-onb-locked sets
  // `pointer-events: none` on everything outside the onboarding, which is
  // exactly right for a talk beat and exactly wrong for this one -- without
  // lifting it, the swipe or the press the mascot is asking for never
  // reaches the app at all.
  //
  // It is SCOPED, and that is what keeps each beat to its own question: a
  // pull beat opens the whole book (`#fb`), because the gesture is a drag on
  // it; the avatar beat opens only the petek (`#fb-petek`), so a stray
  // sideways drag cannot walk the reader off the screen the mascot is
  // currently talking about; and the two petek-door beats open the logo
  // alone (`#fb-logo-btn`), which is the one mark on the compass bar that
  // answers a press at all.
  const PASS_SCOPES = {
    '#fb': 'book', '#fb-petek': 'petek', '#fb-logo-btn': 'logo',
    // Sen is the profile sheet now (see PROFILE_SECTIONS in
    // profile-card.js), opened by pressing your own name on the top bar
    // -- so the tour needs those two the way it needs the logo: the one
    // mark that opens it, and the sheet itself once it is open.
    '#ist-pc-me': 'me', '#profile-overlay': 'sheet',
    // The open/throw beats: one column's boxes (not the whole book, or a
    // stray sideways drag would walk the reader off the lane being talked
    // about), and then the page that box grew into.
    '.fb-haberler': 'news', '.fb-events': 'events', '#fb-page-overlay': 'page',
  };
  let passScope = null;
  function openPassthrough(scope) {
    passScope = scope || '#fb';
    document.body.classList.add('ist-onb-passthru');
    document.body.dataset.onbPass = PASS_SCOPES[passScope] || 'book';
  }
  function closePassthrough() {
    passScope = null;
    document.body.classList.remove('ist-onb-passthru');
    delete document.body.dataset.onbPass;
  }

  // ───── Tour steps ─────
  function stepTour() {
    // No book, no lanes: a parts-bin page opened directly. Skip the walk
    // and go straight to the closing beats rather than spotlighting
    // elements that are not there.
    if (!fb()) { stepKefilShare(); return; }

    enterSpotlightMode();
    const lines = laneCopy(lang);

    // `lane` is the lane the beat belongs to and is asserted before it runs,
    // so a reader who wandered is put back rather than talked at about a
    // screen they are not on. `pull` is the lane a pull beat waits for;
    // `sheet` is the door the reader opens themselves; `open` names a column
    // whose box the reader presses, and `throw` waits for the page that box
    // opened to be thrown away (see runOpen / runThrow).
    const beats = [
      // ── 1. The top bar: your own name is your own profile ──
      // The reader opens it and shuts it themselves, because that is the
      // press they will make forever after.
      { target: '#ist-pc-me', speech: lines.toSen, sheet: 'open' },
      { inSheet: true, speech: lines.avatarIntro },
      // One category at a time, and only the ones already open to
      // EVERYONE: hats carry only 'Yok' today and the one accessory is
      // locked, so neither has a second OPEN choice to hand a reader on day
      // one. `pick: true` never advances on an arrow press -- browsing IS
      // the point, see runPick.
      { inSheet: true, target: '#po-hair-prev, #po-hair-next',
        speech: lines.pickHair, pick: true },
      { inSheet: true, target: '#po-shirt-prev, #po-shirt-next',
        speech: lines.pickShirt, pick: true },
      { inSheet: true, target: '.ist-pc-cover-pick-col', all: true, speech: lines.senDone },
      { target: '#profile-overlay .ist-sheet-close', speech: lines.closeSheet, sheet: 'close' },
      // ── 2. The sky under the bar ──
      // The sun/moon chain is the app's clock: each edge of the day renews
      // one side (see "SUNRISE RENEWS KÜTÜPHANE" in project.html). It is
      // not on the bar until this beat: the bar is the reader's name and
      // nothing else until then.
      { lane: LANE_MAP, show: ['sky'], target: '#ist-sky', speech: lines.sky },
      // ── 3. Kütüphane, renewed at sunrise ──
      // A word comes onto the bottom bar on the beat that first names it
      // as a place -- Kütüphane here, Kahvehane on the way there. The map
      // and the column arrive with the reader, on the lane itself.
      { lane: LANE_MAP, show: ['nav-l'], target: '#fb-nav > b:first-child',
        speech: lines.sunrise, pull: LANE_KUTUPHANE },
      { lane: LANE_KUTUPHANE, show: ['map', 'news'], open: '.fb-haberler',
        speech: lines.newsOpen, none: lines.newsNone },
      { lane: LANE_KUTUPHANE, throw: true, speech: lines.newsThrow },
      // ── 4. Kahvehane, renewed at sunset ──
      // Two pulls, not one: the strip moves at most one lane per gesture,
      // so the way from the reading to the doing is through the middle.
      { lane: LANE_KUTUPHANE, show: ['nav-r'], target: '#fb-nav > b:last-child',
        speech: lines.toKahvehane, pull: LANE_KAHVEHANE },
      { lane: LANE_KAHVEHANE, target: '#fb-nav > b:last-child', speech: lines.sunset },
      { lane: LANE_KAHVEHANE, show: ['events'], open: '.fb-events',
        speech: lines.eventOpen, none: lines.eventNone },
      { lane: LANE_KAHVEHANE, throw: true, speech: lines.eventThrow },
    ];

    let idx = 0;
    runBeat();

    function runBeat() {
      const b = beats[idx];
      stopLaneWatch();
      // The last beat's hint is still on the page, and still live: addHint
      // sets tapAdvanceFn, so a pull or act beat that adds no hint of its own
      // inherited "tap anywhere to continue" AND the tap that fires it. The
      // reader could tap straight past the very gesture just asked for, and
      // the prompt under the mascot said one thing while the button over the
      // tab bar said another. Only beats that add a hint have one.
      clearHint();

      // `=== undefined`, never `!b.pull`: Kütüphane is lane 0, so a falsy
      // test reads the one pull beat that aims at it as a talk beat.
      // Whatever this beat introduces arrives now, before anything is
      // pointed at (see revealPart).
      (b.show || []).forEach(revealPart);
      // ── On a desktop a pull beat is SAID, not asked ──
      // project.html lays a desktop window out with all three lanes
      // standing side by side (its "THE DESKTOP"), so there is no strip to
      // pull and no lane to arrive on: waiting for one would only ever end
      // in the stall escape. The line is still true -- Kütüphane IS on the
      // left -- so it is spoken over the word it points at, as the talk
      // beat it has become, and the tap is the advance.
      const wideBook = !!(fb() && fb().wide);
      if (b.pull !== undefined && !wideBook) { runPull(b); return; }
      if (b.open !== undefined) { runOpen(b); return; }
      if (b.throw) { runThrow(b); return; }
      // The petek's own door: a press on the logo rather than a gesture on
      // the book. Sen's door is the same kind of thing one bar up -- your
      // own name, which opens the profile sheet.
      if (b.petek !== undefined) { runPetekDoor(b); return; }
      if (b.sheet !== undefined) { runSheetDoor(b); return; }

      // Every other beat is about a screen, so it asserts that screen -- a
      // reader who wandered is put back rather than talked at about a lane
      // they are not standing on. Never on a pull beat: snapping the book
      // there would fight the very gesture being asked for. And never on a
      // beat that happens INSIDE the petek: the strip is behind a layer the
      // reader is standing in, so walking it would be moving a screen they
      // cannot see for no reason they could name.
      closePassthrough();
      const f = fb();
      if (!b.inPetek && b.lane !== undefined && f && f.lane && f.lane.at !== b.lane) f.goLane(b.lane);
      // A beat inside the petek needs the petek actually standing. It will
      // be, unless the door beat before it took its own stall escape --
      // in which case this is what puts the reader where the next line is
      // about to be true.
      if (b.inPetek && f && f.openPetek && !f.petekOpen) f.openPetek();
      // The same, for a beat that happens inside the profile sheet: the
      // door beat before it may have taken its own stall escape.
      if (b.inSheet && !sheetOpen()) openSheet();

      if (b.pick) { runPick(b); return; }

      // A cast box is drawn where the book puts it and can be mid-flight
      // for a beat after a lane change, so the spotlight is taken on the
      // next frame rather than now.
      requestAnimationFrame(() => {
        if (!b.target) { setFocus(null); return; }
        setFocus(b.all ? document.querySelectorAll(b.target)
                           : document.querySelector(b.target));
      });
      renderPane({ speech: b.speech });
      addHint(COPY.tapToContinue[lang], advance);
    }

    // ── Sen's own door ──
    // The profile sheet, opened by pressing your own name on the top bar
    // (#ist-pc-me, see profile-card.js). It is THE sheet like everything
    // else that rises over a page, so "is it open" is one class on its
    // overlay and closing it is its own close button -- there is no
    // handle to reach for and nothing here that knows how the sheet
    // works.
    function sheetOpen() {
      const ov = document.getElementById('profile-overlay');
      return !!ov && !ov.hidden;
    }
    function openSheet() {
      pressThrough(document.getElementById('ist-pc-me'));
    }
    function closeSheet() {
      pressThrough(document.querySelector('#profile-overlay .ist-sheet-close'));
    }
    function runSheetDoor(b) {
      const want = b.sheet === 'open';
      // No bar, no sheet: nothing to teach and nothing to wait for.
      if (!document.getElementById('ist-pc-me')) { advance(); return; }
      if (sheetOpen() === want) { advance(); return; }

      requestAnimationFrame(() => {
        setFocus(document.querySelector(b.target));
        openPassthrough(want ? '#ist-pc-me' : '#profile-overlay');
      });
      renderPane({ speech: b.speech, promptText: (want ? COPY.pressName : COPY.pressClose)[lang] });

      const tick = () => {
        if (sheetOpen() === want) { stopLaneWatch(); closePassthrough(); advance(); return; }
        laneWatch = requestAnimationFrame(tick);
      };
      laneWatch = requestAnimationFrame(tick);

      // The same floor every gesture beat has: a reader who cannot make
      // the press still reaches the end, which is where onboarded_at is
      // written.
      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY.pressNudge[lang] });
        addHint(COPY.pressNudge[lang], () => {
          stopLaneWatch();
          want ? openSheet() : closeSheet();
          closePassthrough();
          advance();
        });
      }, STALL_MS);
    }

    // A pick beat: browsing an avatar category is not itself an answer, so
    // a press on one of its arrows only ever changes the preview (the real
    // app's own carousel handler does that, untouched) -- what advances
    // the tour is a real press on the CONTINUE button below, the same
    // object the closing screens already use (renderPane's actionLabel).
    // There is deliberately no tap-anywhere hint and no stall/nudge here:
    // unlike a gesture, a button press needs no accessibility fallback,
    // and a reader who does not want to browse can press it immediately.
    function runPick(b) {
      // The sheet is still sliding up under the arrows, so the rect is
      // taken a frame later and re-taken as it settles.
      requestAnimationFrame(() => {
        setFocus(document.querySelectorAll(b.target));
        // Passthrough so the reader can actually reach the arrows -- the
        // firewall's lock is pointer-events:none on everything outside
        // the onboarding otherwise. Scoped to the sheet alone, same as
        // every other beat that hands part of the page back.
        openPassthrough(b.inSheet ? '#profile-overlay' : '#fb-petek');
      });
      renderPane({
        speech: b.speech,
        actionLabel: COPY.continueLabel[lang],
        onAction: () => { closePassthrough(); advance(); },
      });
    }

    // A pull beat: dim stays, the book goes live, and arrival is the advance.
    function runPull(b) {
      openPassthrough('#fb');
      // A pull points at the gesture, so it lights nothing new -- except
      // the word on the bottom bar naming where it goes, when it has one.
      requestAnimationFrame(() => setFocus(b.target ? document.querySelector(b.target) : null));
      renderPane({
        speech: b.speech,
        // Pulling RIGHT walks the strip right, which moves the reader
        // toward lane 0 (see CLAUDE.md, "A pull right walks the strip
        // right"). So a lower target lane is a rightward pull.
        promptText: b.pull < laneNow() ? COPY.pullRight[lang] : COPY.pullLeft[lang],
      });

      // Arrival is COMMITTED lane plus SETTLED strip, not either alone.
      // `lane.at` flips the instant the reader lets go, while the strip is
      // still tweening to it (project.html runs that release on its own
      // rAF, which `busy` does not cover) -- advancing there lights a box
      // that is still in flight, and the ring lands next to it.
      const tick = () => {
        const f = fb();
        const settled = f && f.lane && f.lane.at === b.pull
          && Math.abs(f.lane.pos - b.pull) < 0.01;
        if (settled) { stopLaneWatch(); closePassthrough(); advance(); return; }
        laneWatch = requestAnimationFrame(tick);
      };
      laneWatch = requestAnimationFrame(tick);

      // The escape hatch. It does not move the book: the next beat asserts
      // its own lane anyway, so a reader who never pulled still lands on
      // the right screen for what the mascot says next.
      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY.pullNudge[lang] });
        addHint(COPY.pullNudge[lang], () => { stopLaneWatch(); closePassthrough(); advance(); });
      }, STALL_MS);
    }


    // ── The petek's door ──
    // The same shape as a pull beat, aimed at a PRESS instead: the logo is
    // lit, the logo alone is handed back to the reader, and the beat ends
    // when the petek has actually opened (or shut). It is the one control
    // in the whole app that is pressed rather than dragged, so it is worth
    // the reader doing it once themselves -- the way in and the way out are
    // the same mark, which is the thing being taught.
    //
    // Same escape hatch as every gesture beat: after STALL_MS the prompt
    // becomes a tap-to-continue and the tour does the press itself, because
    // the end of the tour is where onboarded_at is written and an account
    // stuck short of it gets the whole flow again on every launch.
    function runPetekDoor(b) {
      const f = fb();
      const want = b.petek === 'open';
      if (!f || !f.openPetek) { advance(); return; }
      const doIt = () => { want ? f.openPetek() : f.closePetek(); };
      if (!!f.petekOpen === want) { advance(); return; }

      requestAnimationFrame(() => {
        setFocus(document.querySelector(b.target));
        openPassthrough('#fb-logo-btn');
      });
      renderPane({ speech: b.speech, promptText: COPY.pressLogo[lang] });

      const tick = () => {
        const now = fb();
        if (!now || !!now.petekOpen === want) { stopLaneWatch(); closePassthrough(); advance(); return; }
        laneWatch = requestAnimationFrame(tick);
      };
      laneWatch = requestAnimationFrame(tick);

      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY.pressNudge[lang] });
        addHint(COPY.pressNudge[lang], () => {
          stopLaneWatch(); closePassthrough(); doIt(); advance();
        });
      }, STALL_MS);
    }

    // ── An open beat: press one of a column's boxes ──
    // Lights the column's boxes that actually have a page behind them, hands
    // that column alone back to the reader, and ends when a page is open.
    // A column with nothing in it today says how it WOULD work (`none`) and
    // the throw beat after it is skipped -- there is no page to throw.
    // The column's own loads are not awaited by the book (it must never
    // wait on the network), so a box with no page when this beat starts
    // may simply not have heard back yet. On a slow connection that read
    // as "nothing today" and skipped the throw lesson for good. So the
    // beat waits for the column's loads to settle (__fb.columnSettled)
    // before deciding the column is empty. A request that never answers
    // must not hold the reader either: after STALL_MS the usual
    // tap-to-carry-on appears, and only THAT (the reader choosing to move
    // on) takes the no-content path while the rows are still unknown.
    function runOpen(b) {
      const f = fb();
      const has = () => document.querySelector(b.open + '.fb-openable');
      if (!f || !f.columnSettled || has()) { runOpenNow(b); return; }
      const at = idx;
      let done = false;
      requestAnimationFrame(() => setFocus(document.querySelectorAll(b.open)));
      renderPane({ speech: b.speech, top: true });
      stallTimer = setTimeout(() => {
        stallTimer = null;
        if (done || idx !== at) return;
        renderPane({ speech: b.speech, promptText: COPY.pressNudge[lang], top: true });
        addHint(COPY.pressNudge[lang], () => {
          if (done || idx !== at) return;
          done = true;
          runOpenNow(b, true);
        });
      }, STALL_MS);
      f.columnSettled(b.open).then(() => {
        if (done || idx !== at) return;
        done = true;
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
        clearHint();
        runOpenNow(b);
      });
    }
    // `giveUp`: the reader tapped past a column still loading -- treat it
    // as having nothing to open rather than waiting any longer.
    function runOpenNow(b, giveUp) {
      const f = fb();
      const boxes = giveUp ? []
        : Array.from(document.querySelectorAll(b.open + '.fb-openable'));
      if (!f || !boxes.length) {
        idx++;   // the throw beat has nothing to throw
        requestAnimationFrame(() => setFocus(document.querySelectorAll(b.open)));
        // Nothing is asked of the finger here, so the line goes back to its
        // usual place at the bottom.
        renderPane({ speech: b.none || b.speech });
        addHint(COPY.tapToContinue[lang], advance);
        return;
      }
      if (f.pageOpen) { advance(); return; }
      requestAnimationFrame(() => {
        setFocus(boxes);
        openPassthrough(b.open);
      });
      renderPane({ speech: b.speech, promptText: COPY.pressBox[lang], top: true });
      const tick = () => {
        const now = fb();
        if (now && now.pageOpen) { stopLaneWatch(); closePassthrough(); advance(); return; }
        laneWatch = requestAnimationFrame(tick);
      };
      laneWatch = requestAnimationFrame(tick);
      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY.pressNudge[lang], top: true });
        addHint(COPY.pressNudge[lang], () => {
          stopLaneWatch();
          pressThrough(boxes[0]);
          closePassthrough();
          advance();
        });
      }, STALL_MS);
    }

    // ── A throw beat: the open page is thrown left or right ──
    // Waits on __fb.throws rather than on the page shutting: the arrow shuts
    // it too, and that is not the gesture being taught. A reader who closes
    // it the other way is walked back one beat to open it again.
    function runThrow(b) {
      const f = fb();
      // Back to the open beat before it (advance adds the one back).
      if (!f || !f.pageOpen) { idx -= 2; advance(); return; }
      const start = f.throws;
      requestAnimationFrame(() => {
        setFocus(document.getElementById('fb-page'));
        openPassthrough('#fb-page-overlay');
      });
      renderPane({ speech: b.speech, promptText: COPY.throwIt[lang], top: true });
      const tick = () => {
        const now = fb();
        if (!now) { stopLaneWatch(); closePassthrough(); advance(); return; }
        if (now.throws > start) {
          stopLaneWatch(); closePassthrough();
          // Advance once the page has flown off, so the next beat's light
          // lands on the column rather than on a page mid-flight.
          setTimeout(advance, 420);
          return;
        }
        if (!now.pageOpen) { stopLaneWatch(); closePassthrough(); idx -= 2; advance(); return; }
        laneWatch = requestAnimationFrame(tick);
      };
      laneWatch = requestAnimationFrame(tick);
      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY.throwNudge[lang], top: true });
        addHint(COPY.throwNudge[lang], () => {
          stopLaneWatch();
          pressThrough(document.getElementById('fb-page-back'));
          closePassthrough();
          setTimeout(advance, 420);
        });
      }, STALL_MS);
    }

    function laneNow() {
      const f = fb();
      return f && f.lane ? f.lane.at : LANE_MAP;
    }

    function advance() {
      idx++;
      if (idx >= beats.length) {
        stopLaneWatch();
        closePassthrough();
        exitSpotlightMode();
        // The walk is over: the whole app is there now, the parts nobody
        // was talked through included.
        document.body.classList.remove('ist-onb-reveal');
        stepKefilShare();
      } else {
        runBeat();
      }
    }
  }
  function stepKefilShare() {
    clearStage();
    const stage = document.getElementById('ist-onb-stage');
    addMsg(fillKefil(COPY.kefilShare[lang]));
    const box = document.createElement('div');
    box.className = 'ist-onb-codebox';
    const codeSpan = document.createElement('span');
    codeSpan.textContent = referralCode || '—';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = COPY.copy[lang];
    copyBtn.addEventListener('click', () => {
      if (!referralCode) return;
      navigator.clipboard?.writeText(referralCode);
      copyBtn.textContent = COPY.copied[lang];
      setTimeout(() => { copyBtn.textContent = COPY.copy[lang]; }, 1400);
    });
    box.appendChild(codeSpan);
    box.appendChild(copyBtn);
    stage.appendChild(box);
    addHint(COPY.tapToContinue[lang], stepProfilePrompt);
  }

  function stepProfilePrompt() {
    clearStage();
    const stage = document.getElementById('ist-onb-stage');
    addMsg(COPY.profilePrompt[lang]);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ist-onb-btn';
    btn.textContent = COPY.finishLabel[lang];
    btn.addEventListener('click', finish);
    stage.appendChild(btn);
  }

  async function finish() {
    // Persist choices + completion timestamp. The user's RLS policy lets
    // them update their own row; the protect_profile_columns trigger
    // doesn't touch these columns.
    try {
      await sb.from('profiles').update({
        onboarded_at: new Date().toISOString(),
        language_pref: lang === 'en' ? 'more_english' : 'default',
        mascot: currentPalette() === 'earth' ? 'dog' : 'cat',
      }).eq('id', user.id);
    } catch (e) {
      console.error('onboarding finish failed', e);
    }
    clearState();
    hide();
  }

  function buildRoot() {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('data-palette', currentPalette());
    root.innerHTML = `
      <div class="ist-onb-tap-zone"></div>
      <div id="ist-onb-stage"></div>
    `;
    document.body.appendChild(root);
  }

  // Once per document. maybeRun is public and the app's own mount is
  // idempotent, so a second call must not start a second flow on top of
  // the first -- they would share one root and one firewall, and the
  // second would rewind a reader who was half way through.
  let running = false;

  async function maybeRun(opts) {
    if (running) return false;
    sb = opts.sb;
    user = opts.user;
    if (!sb || !user) return false;

    // Admin kill switch (app_settings.onboarding_enabled). Missing row = enabled.
    const { data: setting } = await sb.from('app_settings')
      .select('value').eq('key', 'onboarding_enabled').maybeSingle();
    if (setting && setting.value === false) { clearState(); return false; }

    // Always confirm we're not done already.
    const { data: profile } = await sb.from('profiles')
      .select('onboarded_at, referral_code, referred_by, neighborhood')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.onboarded_at) { clearState(); return false; }

    // The flow ran across four pages once and saved its place between them
    // (STATE_KEY). It is one page now and runs start to finish in one go, so
    // there is nothing to resume -- and a stage left in sessionStorage by an
    // older build must not be honoured by this one. Drop it.
    clearState();

    referralCode = profile.referral_code || '';
    homeNb = profile.neighborhood || opts.homeNb || null;

    // Resolve kefil display name (referred_by → profiles).
    if (profile.referred_by) {
      const { data: kefil } = await sb.from('profiles_public')
        .select('first_name, last_name')
        .eq('id', profile.referred_by)
        .maybeSingle();
      if (kefil) {
        kefilName = [kefil.first_name, kefil.last_name].filter(Boolean).join(' ').trim();
      }
    }
    if (!kefilName) kefilName = opts.kefilName || 'your sponsor';

    // Admin-edited tour copy, if any (db/onboarding_copy.sql). Best-effort:
    // a missing table or a network hiccup leaves dbLaneCopy at {} and
    // laneCopy() falls straight back to the hardcoded COPY.lanes, exactly
    // the site's own "no data, no gate" rule for optional content.
    try {
      const { data: rows } = await sb.from('onboarding_copy').select('key, body_tr, body_en');
      dbLaneCopy = {};
      (rows || []).forEach(r => { dbLaneCopy[r.key] = r; });
    } catch (e) { dbLaneCopy = {}; }

    running = true;
    ensureRoot();
    show();
    stepWelcome();
    return true;
  }

  function ensureRoot() {
    if (!document.getElementById(ROOT_ID)) buildRoot();
    else root = document.getElementById(ROOT_ID);
  }

  global.IstOnboarding = { maybeRun };
})(window);
