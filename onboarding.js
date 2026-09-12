// Onboarding flow for brand-new accounts.
// Runs on first login: locks the page behind a full-screen overlay, then
// welcome → language → palette → the lane tour → kefil code →
// profile prompt, and writes onboarded_at, language_pref, palette_pref and
// mascot to profiles at the end.
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
  // English is fixed for the first 2 screens (welcome + language pick).
  // After language is chosen, remaining beats branch into TR or EN, then
  // again into cat (mono/edgy) or dog (earth/warm) voice.
  const COPY = {
    welcome: {
      lead: 'Welcome to ISTANBULITE!',
      // Page 1: kefil line + responsibility warning. The warning carries
      // `tcCheckbox` so a "I agree to the terms and conditions." checkbox
      // appears below it; the tap-to-continue hint only shows after it's
      // ticked, blocking advance until the user consents.
      // Page 2 (pageBreak): Turglish sentence (hover for "Turkish + English"),
      // then the language pitch (instant lead + typed body), then a
      // "tap to choose your preference" hint that slowly reveals the picker.
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
          instant: 'But you can choose to have a preference:',
          typed:   'You can see things mostly in Turkish, or mostly in English, but never not both. Things will always be in both languages.',
          speed: 14,
          nextHint: 'tap to choose your preference',
        },
      ],
      tapHint: 'tap anywhere to continue',
      tcLabel: 'I agree to the terms and conditions.',
    },
    languageScreen: {
      // `body` is unused (the picker is inline on the welcome screen and
      // needs no lead paragraph); `choices` is what renderLanguageChoicesInline
      // reads.
      body: 'ISTANBULITE is, by default, in Turglish. Before we get started, we would like to ask your preference. You can choose to have most things in Turkish, or most things in English — but never not both.',
      choices: [
        { value: 'default',      label: 'TÜRKÇE AĞIRLIKLI', sub: 'Turkish-heavy' },
        { value: 'more_english', label: 'ENGLISH-HEAVY',    sub: 'İngilizce ağırlıklı' },
      ],
    },
    paletteScreen: {
      tr: {
        // A: instant "Harika!", B: typed explanation.
        instant: 'Harika!',
        typed:   'Uygulamanın renklerini de seçebilirsin. Bu ayarları istediğin zaman değiştirebilirsin.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'SİYAH & BEYAZ' },
          { value: 'earth', mascot: 'dog', label: 'TOPRAK TONLARI' },
        ],
      },
      en: {
        instant: 'Great!',
        typed:   'You can also choose the colors in which your application comes. You can always change these settings whenever you want.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'BLACK & WHITE' },
          { value: 'earth', mascot: 'dog', label: 'EARTHY TONES' },
        ],
      },
    },
    // ── The lane tour ──
    // The app is project.html now: three lanes on one slide, walked by a
    // sideways pull (see CLAUDE.md, "Slide 12 is three screens"). Each beat
    // either talks (tap anywhere), asks for the real pull and waits for the
    // reader to arrive, or asks them to actually change something.
    //
    // ONE VOICE, plain and clear. It used to branch into a sarcastic cat and
    // an excitable dog on top of the TR/EN branch -- four versions of every
    // line to keep true and in step, so a correction to one of them silently
    // left three behind. The first run through an app is not the place for a
    // character: the reader is trying to find out what this is.
    //
    // It OPENS ON THE READER THEMSELVES -- the petek's innermost depth, where
    // the avatar arrows are -- and only then pulls out to the shape, one
    // level at a time (Sen -> Yanındakiler -> the whole petek), each a real
    // pull rather than a jump. A brand new account's petek is one hexagon
    // and six empty sides: nobody has handed them a code yet, because they
    // signed up thirty seconds ago. So the petek cannot be the first thing
    // pointed at, and nothing here may say "these are the people next to
    // you" -- for every reader seeing this for the first time, that
    // sentence is false. What IS true on day one is the reader's own
    // hexagon, so the tour starts there, has them make their avatar one
    // open category at a time, and only then pulls out and says where the
    // others WILL be.
    // `toNear`/`toAll` are the two level pulls, and their copy is only ever
    // the instruction to pull -- never the description of what is up
    // there, which would be true a beat too early (see runLevelPull).
    // `near`/`petekAll` carry that description and run as plain talk beats
    // straight AFTER arrival, the same order toKahve -> events already
    // uses for a lane.
    lanes: {
      tr: {
        reveal:      'Burası Hane — uygulamanın ortası. Her yere buradan, parmağınla gidiliyor.',
        avatarIntro: 'Öncelikle, senin avatarını yaratalım.',
        pickHair:    'Saçını seç. Beğenince devam et.',
        pickShirt:   'Tişörtünü seç. Beğenince devam et.',
        senDone:     'Geri kalanı — şapkalar, rozetler — dışarıda kazanılır. Satın alınamaz.',
        toNear:      'Şimdi yukarı kaydır.',
        near:        'Bu petek. Şu an sadece sen varsın. Biri sana kendi kodunu verdiğinde, yanındaki boş yerlerden birine oturur — gerçek hayatta, yüz yüze.',
        toAll:       'Bir kere daha yukarı kaydır.',
        petekAll:    'Bütün petek bu. Sen sadece kendi altı komşununla değil, koca şehirle aynı ağdasın.',
        twoSides:    'İstanbul Avrupa ve Anadolu yakası diye ikiye ayrılır. İstanbulite de öyle — sağda Kahvehane, solda Kütüphane.',
        toKahve:     'Kahvehane sağda. Parmağını sola kaydır.',
        events:      'Etkinlikler. Bunlar internette değil, dışarıda. Beğendiğin Hane\'de seni bekler.',
        games:       'Üç oyun, her gün yeni. Sırayla açılır.',
        toKutup:     'Kütüphane en solda. Sağa kaydır, Hane\'den geçip devam et.',
        news:        'Haberler. İstanbul, Türkiye ve Dünya — günde bir avuç, bitince biter.',
        anket:       'Anket. Cevabın kendi ilçenin altına yazılır, yani sonuç tek bir yüzde değil — yirmi beş tane.',
        toHane:      'Hane\'ye dönelim. Sola kaydır.',
      },
      en: {
        reveal:      'This is Hane — the middle of the app. Everywhere else is a finger away from here.',
        avatarIntro: 'First, let\'s create your avatar.',
        pickHair:    'Pick your hair. Continue once you like it.',
        pickShirt:   'Pick your shirt. Continue once you like it.',
        senDone:     'The rest of it — hats, badges — is earned outside. It cannot be bought.',
        toNear:      'Now pull up.',
        near:        'This is the petek. Right now it is only you. When somebody gives you their code they take one of the empty places beside you — in person, face to face.',
        toAll:       'Pull up once more.',
        petekAll:    'This is the whole petek. You are not just connected to your own six neighbours — you are on the same network as the whole city.',
        twoSides:    'Istanbul splits into a European side and an Anatolian side. Istanbulite splits the same way — Kahvehane on the right, Kütüphane on the left.',
        toKahve:     'Kahvehane is to the right. Pull your finger left.',
        events:      'Events. These happen outside, not in here. The ones you keep wait for you on Hane.',
        games:       'Three games, new every day. They unlock in order.',
        toKutup:     'Kütüphane is all the way left. Pull right, past Hane, and keep going.',
        news:        'The news. İstanbul, Türkiye and Dünya — a handful a day, and then it is done.',
        anket:       'The poll. Your answer is filed under your own district, so the result is not one percentage — it is twenty-five.',
        toHane:      'Back to Hane. Pull left.',
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
    pullNudge: {
      tr: 'kaydıramıyor musun? devam etmek için dokun',
      en: "can't pull? tap to carry on",
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
    confirmLabel: { tr: 'ONAYLA', en: 'CONFIRM' },
    tapToContinue: { tr: 'devam etmek için herhangi bir yere dokun', en: 'tap anywhere to continue' },
    copy: { tr: 'KOPYALA', en: 'COPY' },
    copied: { tr: 'KOPYALANDI', en: 'COPIED' },
  };

  // ── State ──
  let sb, user, kefilName, referralCode, homeNb;
  let lang = 'en';     // 'en' or 'tr' for mascot-led beats
  let palette = null;  // 'mono' | 'earth'
  // Not chosen and never shown: the onboarding has no mascot any more. It is
  // still DERIVED from the palette and written to profiles.mascot at the end,
  // because admin-notification.js reads that column for its own bubble and an
  // unset one would quietly change that feature. Bringing a mascot back here
  // is putting the picture back, not re-adding the data.
  let mascot = null;   // 'cat' | 'dog', implied by the palette
  // Admin-editable overrides for COPY.lanes, keyed the same way
  // (db/onboarding_copy.sql; edited from admin.html's Users tab). null
  // until fetched, {} if the table is empty or missing -- either way
  // laneCopy() falls back to the hardcoded default per key, so a database
  // without the migration behaves exactly as it did before this existed.
  let dbLaneCopy = null;
  let root;            // DOM root for fullscreen modal phases
  let spotlightEl;     // The persistent dim overlay
  let pane;            // The mascot pane (corner bubble)
  let litTargets = []; // { el, round }[] -- every element lit so far, and the shape of its hole
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

  // Render a row of choice buttons + a Confirm button below.
  // onPick(choice) fires every time a choice is tapped; onConfirm() fires
  // when the user taps the confirm button (only enabled after a pick).
  function addChoices(choices, onPick, onConfirm, renderInner, slow) {
    const stage = document.getElementById('ist-onb-stage');
    const wrap = document.createElement('div');
    wrap.className = 'ist-onb-choices' + (slow ? ' slow' : '');
    const btns = [];
    choices.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ist-onb-choice';
      btn.innerHTML = renderInner(c);
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onPick(c);
        confirmBtn.disabled = false;
      });
      btns.push(btn);
      wrap.appendChild(btn);
    });
    stage.appendChild(wrap);

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'ist-onb-btn' + (slow ? ' slow' : '');
    // Use the language-appropriate label; default to English before lang is set.
    confirmBtn.textContent = COPY.confirmLabel[lang] || COPY.confirmLabel.en;
    confirmBtn.disabled = true;
    confirmBtn.addEventListener('click', onConfirm);
    stage.appendChild(confirmBtn);
  }

  // ── Steps ──
  function show() {
    root.classList.add('show');
    document.body.classList.add('ist-onb-locked');
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
    document.body.classList.remove('ist-onb-locked');
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
          else addHint(w.tapHint, () => slowRevealLanguagePicker());
        });
        return;
      }
      if (idx < w.lines.length) {
        // Per-item override (e.g. last Page-2 line uses "tap to choose...").
        const hintText = (item && typeof item === 'object' && item.nextHint) || w.tapHint;
        addHint(hintText, advance);
      } else {
        // After the last line, a final tap slowly reveals the picker.
        const hintText = (item && typeof item === 'object' && item.nextHint) || w.tapHint;
        addHint(hintText, () => slowRevealLanguagePicker());
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

  // Slow reveal: clears the welcome content's hint, then renders the
  // language picker with a per-button rise animation (CSS-driven).
  function slowRevealLanguagePicker() {
    renderLanguageChoicesInline({ slow: true });
  }

  // Inline language picker: appended to the welcome stage right after the
  // last typed line. Picking + confirming advances to the palette screen.
  // `slow: true` adds a per-button rise animation for a softer entrance.
  function renderLanguageChoicesInline(opts) {
    const s = COPY.languageScreen;
    let selected = null;
    const onPick = (c) => {
      selected = c;
      lang = c.value === 'more_english' ? 'en' : 'tr';
    };
    const onConfirm = () => {
      if (!selected) return;
      if (global.I18N && I18N.setLang) I18N.setLang(selected.value);
      stepPalette();
    };
    addChoices(s.choices, onPick, onConfirm, c => `<div>${c.label}</div><small>${c.sub}</small>`, opts && opts.slow);
  }

  async function stepPalette() {
    clearStage();
    const s = COPY.paletteScreen[lang];
    // A (instant) + B (typed). After the line finishes typing, the palette
    // choices fade in (slow rise-in, same animation as the language picker).
    await addMsgTyped({ instant: s.instant, typed: s.typed }, 22);
    let selected = null;
    const onPick = (c) => {
      selected = c;
      // Preview the palette live as the user picks.
      root.setAttribute('data-palette', c.value);
    };
    const onConfirm = () => {
      if (!selected) return;
      palette = selected.value;
      mascot = selected.mascot;
      stepTour();
    };
    addChoices(s.choices, onPick, onConfirm, c => `
      <div class="ist-onb-swatch ${c.value}"><span></span><span></span><span></span></div>
      <div>${c.label}</div>
    `, true);
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
      // The holes are measured, so a screen that changes size has to be
      // re-measured or they sit where the boxes used to be. Cheap: it only
      // ever runs while something is actually lit.
      window.addEventListener('resize', () => { if (litTargets.length) paintSpotlight(); });
    }
    if (!pane) {
      pane = document.createElement('div');
      pane.id = 'ist-onb-pane';
      document.body.appendChild(pane);
    }
    pane.setAttribute('data-palette', palette || 'mono');
  }

  // ── The spotlight ──
  // The dim is a PUNCHED SHEET, and the hole is the whole of the highlight.
  // There is no ring: a rectangle drawn around a control is a second object
  // competing with it, and the thing being pointed at is already the only
  // thing on the screen at full strength. Everything else going quiet says
  // "this one" more plainly than an outline around it does.
  //
  // It is punched rather than lifted because a lift cannot work on the app:
  // project.html's cast lives in .fb-cast, which is `position: absolute` with
  // `z-index: 1` and therefore its own stacking context, so a box inside it
  // can never rise above a dim at 99989 however large a z-index it is given.
  // (And `position: relative` on a .fb-box, which the book positions
  // absolutely, would move it.) So nothing is added to the app's DOM at all.
  //
  // The rects are measured, so they are re-measured on resize and again as a
  // depth change's own transition settles.
  function spotlightPad() { return 6; }
  // A ROUND hole reads as the control GLOWING, a rectangular one reads as
  // it being boxed -- see the avatar-picking beats (pickHair/pickShirt),
  // which light one small arrow at a time and want to say "this" without
  // drawing a square around it the way a whole-column beat's box does.
  // Rounder and roomier than the square pad, since a tight circle around
  // a 12px icon would read as a dot rather than a glow.
  function spotlightRoundPad() { return 14; }

  // ONE path with real subpaths: the viewport, then one per hole, evenodd.
  //
  // It must be `path()` and never `polygon()`, and that is not a style
  // preference -- `polygon()` is a single closed ring, so listing the outer
  // rect's corners and then a hole's runs one continuous edge from the last
  // hole corner back to the first outer corner, and evenodd carves a
  // DIAGONAL WEDGE out of the dim that has nothing to do with either. It
  // hit-tests correctly, which is what made it look fine in a test that only
  // asked `elementFromPoint`; sampling the painted pixels is what shows it.
  // Only `path()` can express more than one subpath.
  //
  // The element is `position: fixed; inset: 0`, so viewport coordinates are
  // its own. A browser without `path()` support keeps a plain dim: no hole is
  // a worse spotlight, a wrong hole is a broken page.
  const CAN_CUT = !window.CSS || !CSS.supports
    || CSS.supports('clip-path', 'path("M0 0H1V1H0Z")');

  function paintSpotlight() {
    if (!spotlightEl || !CAN_CUT) return;
    const rects = litTargets
      .map(t => ({ r: t.el.getBoundingClientRect(), round: t.round }))
      .filter(t => t.r.width > 0 && t.r.height > 0);

    if (!rects.length) { spotlightEl.style.clipPath = ''; return; }

    const pad = spotlightPad();
    const roundPad = spotlightRoundPad();
    const n = (v) => v.toFixed(1);
    const box = (l, t, r, b) => `M${n(l)} ${n(t)}H${n(r)}V${n(b)}H${n(l)}Z`;
    // Two half-circle arcs closing back on themselves -- path() has no
    // dedicated circle command, only arcs.
    const circle = (cx, cy, radius) =>
      `M${n(cx - radius)} ${n(cy)}A${n(radius)} ${n(radius)} 0 1 0 ${n(cx + radius)} ${n(cy)}`
      + `A${n(radius)} ${n(radius)} 0 1 0 ${n(cx - radius)} ${n(cy)}Z`;
    const W = window.innerWidth, H = window.innerHeight;
    const holes = rects.map(({ r, round }) => round
      ? circle(r.left + r.width / 2, r.top + r.height / 2, Math.max(r.width, r.height) / 2 + roundPad)
      : box(r.left - pad, r.top - pad, r.right + pad, r.bottom + pad));
    const d = [box(0, 0, W, H)].concat(holes).join(' ');
    spotlightEl.style.clipPath = `path(evenodd, "${d}")`;
  }

  // Light one element or several (a column of cast boxes is three boxes and
  // no wrapper, and a beat talks about the column). Everything lit before
  // stays lit; passing nothing lights nothing, which is a beat speaking
  // generally rather than pointing. `opts.round` cuts a circular hole
  // instead of the default rectangular one (see paintSpotlight).
  function addSpotlight(target, opts) {
    spotlightEl.classList.add('show');
    const round = !!(opts && opts.round);
    const els = !target ? []
      : (target.length !== undefined && !target.nodeType ? Array.from(target) : [target]);
    els.forEach(el => { if (el && !litTargets.some(t => t.el === el)) litTargets.push({ el, round }); });
    paintSpotlight();
  }

  function clearSpotlight() {
    litTargets = [];
    if (spotlightEl) {
      spotlightEl.style.clipPath = '';
      spotlightEl.classList.remove('show');
    }
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
  function gestureFirewall(e) {
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

  function renderPane({ speech, actionLabel, onAction, promptText }) {
    pane.innerHTML = '';
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
    document.body.classList.add('ist-onb-spot');
  }
  function exitSpotlightMode() {
    clearSpotlight();
    hidePane();
    root.classList.add('show');
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
  // 0 Kütüphane (left on screen), 1 Hane (the middle), 2 Kahvehane (right).
  const LANE_KUTUPHANE = 0, LANE_HANE = 1, LANE_KAHVEHANE = 2;

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
  // currently talking about.
  let passScope = null;
  function openPassthrough(scope) {
    passScope = scope || '#fb';
    document.body.classList.add('ist-onb-passthru');
    document.body.dataset.onbPass = passScope === '#fb' ? 'book' : 'petek';
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

    // The petek's own depths (HIVE_LEVELS in profile-card.js): 0 is Sen --
    // the reader's own hexagon with the avatar arrows on it -- 1 is
    // Yanındakiler, the six touching places -- and 2 is the whole shape.
    // Driven through IstProfileCard.setHivePageLevel, which is that
    // module's own documented handle and no-ops when no petek is standing,
    // exactly as fb() does for the book.
    const HIVE_SEN = 0, HIVE_NEAR = 1, HIVE_ALL = 2;
    function setDepth(n) {
      const pc = global.IstProfileCard;
      if (pc && pc.setHivePageLevel) pc.setHivePageLevel(n);
    }

    // `lane` is the lane the beat belongs to and is asserted before it runs,
    // so a reader who wandered is put back rather than talked at about a
    // screen they are not on. `pull` is the lane a pull beat waits for;
    // `levelPull` is the same idea for the petek's own vertical gesture.
    const beats = [
      { lane: LANE_HANE,       target: null,        speech: lines.reveal },
      // The reader first, the shape second. On day one the petek is one
      // hexagon and six empty sides, so there is nothing true to say about
      // neighbours yet -- but there is always something true to say about
      // the reader, and something for them to DO (see COPY.lanes).
      { lane: LANE_HANE,       depth: HIVE_SEN, speech: lines.avatarIntro },
      // One category at a time, and only the ones already open to
      // EVERYONE: AVATAR_HAT_OPTIONS (profile-card.js) carries only 'Yok'
      // today (the Sözcü crown is parked, unbuilt art) and
      // AVATAR_ACCESSORY_OPTIONS's one alternative (glasses) is
      // unconditionally `locked: true` -- neither has a second OPEN choice
      // to hand a reader on day one. Hair and shirt do, so those are the
      // two beats. `pick: true` lights the pair with a round hole (see
      // paintSpotlight) rather than boxing it, and never advances on a
      // press -- browsing IS the point, see runPick.
      { lane: LANE_HANE,       depth: HIVE_SEN, target: '#po-hair-prev, #po-hair-next', round: true,
        speech: lines.pickHair, pick: true },
      { lane: LANE_HANE,       depth: HIVE_SEN, target: '#po-shirt-prev, #po-shirt-next', round: true,
        speech: lines.pickShirt, pick: true },
      // `.ist-hive-pick-col`, never `.ist-hive-picker`: the picker's own box is
      // exactly the hexagon (--ist-hive-cell-w/h) and both arrow columns are
      // laid OUTSIDE it (`right: 100%` / `left: 100%`), so a ring measured on
      // the wrapper is a box drawn over the avatar with the arrows outside
      // the hole. Two columns, so two rings -- `all`.
      { lane: LANE_HANE,       depth: HIVE_SEN, target: '.ist-hive-pick-col', all: true,
        speech: lines.senDone },
      // Two real pulls out from Sen, one level at a time, each waiting for
      // the actual gesture rather than jumping there -- the reader is
      // taught the gesture by making it, the same rule the lane pulls
      // already follow. Each pull beat asks ONLY for the pull -- what is
      // actually up there is a beat too early to say true things about,
      // exactly the reasoning that opened this whole tour on the reader
      // rather than the petek -- and the plain talk beat right after it
      // describes what arriving actually shows: Yanındakiler first (the
      // six touching places, all still empty), then the whole shape.
      { lane: LANE_HANE,       speech: lines.toNear, levelPull: HIVE_NEAR },
      { lane: LANE_HANE,       speech: lines.near },
      { lane: LANE_HANE,       speech: lines.toAll,  levelPull: HIVE_ALL },
      { lane: LANE_HANE,       speech: lines.petekAll },
      { lane: LANE_HANE,       speech: lines.twoSides },
      { lane: LANE_HANE,       speech: lines.toKahve, pull: LANE_KAHVEHANE },
      // A column is three boxes with no wrapper between them, and the
      // mascot is talking about the column -- so the beat lights all of it.
      { lane: LANE_KAHVEHANE,  target: '.fb-events', all: true, speech: lines.events },
      { lane: LANE_KAHVEHANE,  target: '.fb-oyun',   all: true, speech: lines.games },
      // Two pulls, not one: the strip moves at most one lane per gesture,
      // so reaching Kütüphane from Kahvehane goes through Hane. That is the
      // point rather than a cost -- there is no way from the doing to the
      // reading that does not pass the people.
      { lane: LANE_KAHVEHANE,  speech: lines.toKutup, pull: LANE_KUTUPHANE },
      { lane: LANE_KUTUPHANE,  target: '.fb-haberler', all: true, speech: lines.news },
      { lane: LANE_KUTUPHANE,  target: '.fb-anket',    all: true, speech: lines.anket },
      { lane: LANE_KUTUPHANE,  speech: lines.toHane, pull: LANE_HANE },
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
      if (b.pull !== undefined) { runPull(b); return; }
      // Same idea for a level pull, aimed at the petek's own depth instead
      // of a lane -- Sen is level 0, so this needs the same `!== undefined`.
      if (b.levelPull !== undefined) { runLevelPull(b); return; }

      // Every other beat is about a screen, so it asserts that screen -- a
      // reader who wandered is put back rather than talked at about a lane
      // they are not standing on. Never on a pull beat: snapping the book
      // there would fight the very gesture being asked for.
      closePassthrough();
      const f = fb();
      if (f && f.lane && f.lane.at !== b.lane) f.goLane(b.lane);
      // ...and, on Hane, about a DEPTH of the petek as well.
      if (b.depth !== undefined) setDepth(b.depth);

      if (b.pick) { runPick(b); return; }

      // A cast box is drawn where the book puts it and can be mid-flight
      // for a beat after a lane change, so the spotlight is taken on the
      // next frame rather than now.
      requestAnimationFrame(() => {
        if (!b.target) { addSpotlight(null); return; }
        addSpotlight(b.all ? document.querySelectorAll(b.target)
                           : document.querySelector(b.target));
        if (b.depth !== undefined) settleSpotlight();
      });
      renderPane({ speech: b.speech });
      addHint(COPY.tapToContinue[lang], advance);
    }

    // Changing depth rescales the plane, and that is a CSS transition -- so
    // the arrows go on moving for a few hundred ms after setDepth returns,
    // and a rect taken on the next frame is where they were on the way. The
    // paint is idempotent, so it is simply re-taken as they settle.
    function settleSpotlight() {
      [0, 140, 300, 460].forEach(ms => setTimeout(() => {
        if (litTargets.length) paintSpotlight();
      }, ms));
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
      // The depth change rescales the plane and the arrows arrive with it,
      // so the rect is taken a frame later and re-taken as they settle.
      requestAnimationFrame(() => {
        addSpotlight(document.querySelectorAll(b.target), { round: !!b.round });
        settleSpotlight();
        // Passthrough so the reader can actually reach the arrows -- the
        // firewall's lock is pointer-events:none on everything outside
        // the onboarding otherwise. Scoped to the petek alone, same as
        // every other beat that hands part of the page back.
        openPassthrough('#fb-petek');
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
      // Nothing on the page is "lit" during a pull -- the thing being
      // pointed at is the gesture, not an element.
      clearSpotlight();
      if (spotlightEl) spotlightEl.classList.add('show');
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

    // A level-pull beat: the same shape as a lane pull, aimed at the
    // petek's own vertical gesture instead of the book's horizontal one --
    // dim stays, the petek goes live, and reaching the named depth is the
    // advance. Unlike a lane's `pos`, a hive level has no separate tween
    // value to wait for: `setHiveLevel` (profile-card.js) writes
    // `state.hiveLevel` the instant the drag is released, and what follows
    // is only the plane's own CSS transition -- so reading
    // `hivePageLevel()` back is enough, with no settling check needed.
    function runLevelPull(b) {
      const pc = global.IstProfileCard;
      // No petek standing (a parts-bin page, or a mount that never
      // landed): nothing to pull, so this beat has nothing to ask for.
      if (!pc || !pc.hivePageLevel || pc.hivePageLevel() == null) { advance(); return; }

      openPassthrough('#fb-petek');
      // Nothing on the page is "lit" during a pull -- the thing being
      // pointed at is the gesture, not an element.
      clearSpotlight();
      if (spotlightEl) spotlightEl.classList.add('show');
      renderPane({ speech: b.speech, promptText: COPY.pullUp[lang] });

      const tick = () => {
        if (pc.hivePageLevel() === b.levelPull) { stopLaneWatch(); closePassthrough(); advance(); return; }
        laneWatch = requestAnimationFrame(tick);
      };
      laneWatch = requestAnimationFrame(tick);

      // Same escape hatch as every other beat that waits on a real
      // gesture: the next beat still asserts the lane it needs, and the
      // level a reader is standing at is never wrong, only possibly not
      // where this beat wanted them yet.
      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY.pullNudge[lang] });
        addHint(COPY.pullNudge[lang], () => { stopLaneWatch(); closePassthrough(); advance(); });
      }, STALL_MS);
    }

    function laneNow() {
      const f = fb();
      return f && f.lane ? f.lane.at : LANE_HANE;
    }

    function advance() {
      idx++;
      if (idx >= beats.length) {
        stopLaneWatch();
        closePassthrough();
        exitSpotlightMode();
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
        palette_pref: palette,
        mascot: mascot,
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
    root.setAttribute('data-palette', 'mono');
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
