// Onboarding flow for brand-new accounts.
// Runs on first login: locks the page behind a full-screen overlay, then
// welcome → language → palette+mascot → the lane tour → kefil code →
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
          { value: 'mono',  mascot: 'cat', label: 'SİYAH & BEYAZ', sub: 'kedi' },
          { value: 'earth', mascot: 'dog', label: 'TOPRAK TONLARI', sub: 'köpek' },
        ],
      },
      en: {
        instant: 'Great!',
        typed:   'You can also choose the colors in which your application comes. You can always change these settings whenever you want.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'BLACK & WHITE', sub: 'cat' },
          { value: 'earth', mascot: 'dog', label: 'EARTHY TONES',  sub: 'dog' },
        ],
      },
    },
    // ── The lane tour ──
    // The app is project.html now: three lanes on one slide, walked by a
    // sideways pull (see CLAUDE.md, "Slide 12 is three screens"). Each beat
    // either talks (tap anywhere), asks for the real pull and waits for the
    // reader to arrive, or asks them to actually change something.
    //
    // It OPENS ON THE READER THEMSELVES -- the petek's innermost depth, where
    // the avatar arrows are -- and only then pulls out to the shape. A brand
    // new account's petek is one hexagon and six empty sides: nobody has
    // handed them a code yet, because they signed up thirty seconds ago. So
    // the petek cannot be the first thing the mascot points at, and nothing
    // here may say "these are the people next to you" -- for every reader
    // seeing this for the first time, that sentence is false. What IS true on
    // day one is the reader's own hexagon, so the tour starts there, has them
    // make their avatar, and then pulls out and says where the others WILL be.
    lanes: {
      tr: {
        cat: {
          reveal:  'Hâlâ buradasın demek. Peki. Burası Hane — uygulamanın ortası. Her şey buradan bir kaydırma uzakta.',
          sen:     'Şu ortadaki sensin. Şimdilik tek başına. Oklarla kendine benzet — ne seçersen anında kaydediliyor, onay filan yok.',
          senDone: 'Oldu. Gerisi — şapkalar, rozetler — dışarıda kazanılıyor. Satın alınmıyor, uğraşma.',
          petek:   'Şimdi geri çekildik: bu petek. Şu an sadece sen varsın, doğru. Biri sana kendi kodunu okuduğunda, o boş yanlardan birine oturuyor. Gerçek hayatta, yüz yüze.',
          toKahve: 'Sağda Kahvehane var. Parmağını sola kaydır — ben burada bekliyorum.',
          events:  'Etkinlikler. Bunlar internette değil, dışarıda. Beğendiğini seç, Hane\'de seni bekler.',
          games:   'Üç oyun, her gün yeni. Sırayla açılırlar — acelen varsa yanlış uygulamadasın.',
          toKutup: 'Şimdi ters yöne. Kütüphane en solda: sağa kaydır, Hane\'den geçip devam et.',
          news:    'Haberler. İstanbul, Türkiye, Dünya — üçü de burada, günde bir avuç. Bitince biter.',
          anket:   'Anket. Cevabın kendi ilçenin altına yazılır, yani sonuç tek bir yüzde değil — yirmi beş tane.',
          toHane:  'Yeter bu kadar. Sola kaydır, Hane\'ye dönelim.',
        },
        dog: {
          reveal:  'SELAAM!! Burası Hane! Uygulamanın tam ortası — her yere buradan gidiliyor!',
          sen:     'VE BU SENSİN! Şu an tek başınasın ama merak etme! Hadi oklarla kendine bir şeyler seç — hemen kaydediliyor!',
          senDone: 'ÇOK YAKIŞTI! Kalanları — şapkalar, rozetler — dışarı çıkıp kazanacaksın. Parayla alınmıyor, öyle bir şey yok burada!',
          petek:   'Şimdi biraz geri çekilelim — işte PETEK! Şu an sadece sen varsın, biliyorum. Ama biri sana kodunu okuduğunda şu boş yanlardan birine oturacak! Yüz yüze, gerçekten tanışarak!',
          toKahve: 'Hadi Kahvehane\'ye gidelim! Parmağını SOLA kaydır!',
          events:  'ETKİNLİKLER! Bunlar gerçek hayatta oluyor! Beğendiğini seç, Hane\'de seni bekler — sonra da GİT!',
          games:   'VE OYUNLAR! Her gün üç yeni tane! Sırayla açılıyorlar, acele etme!',
          toKutup: 'Şimdi diğer tarafa! Kütüphane en solda — SAĞA kaydır, Hane\'den geçip devam et!',
          news:    'HABERLER! İstanbul, Türkiye ve Dünya, hepsi burada! Günde bir avuç, bitince biter!',
          anket:   'Anket! Cevabın kendi ilçene yazılıyor — yani Beşiktaş ne demiş, Üsküdar ne demiş, hepsi ayrı ayrı görülüyor!',
          toHane:  'Tamamdır! Hadi Hane\'ye dönelim — SOLA kaydır!',
        },
      },
      en: {
        cat: {
          reveal:  "Still here. Fine. This is Hane — the middle of the app. Everything else is one pull away.",
          sen:     "That one in the middle is you. On your own, for now. Use the arrows and make it look like you — whatever you pick saves itself, there's nothing to confirm.",
          senDone: "Good. The rest of it — hats, badges — is earned outside. It cannot be bought, so don't go looking.",
          petek:   "Now we've stepped back: this is the petek. Right now it is only you, yes. When somebody reads you their code, they take one of those empty sides. In person, face to face.",
          toKahve: 'Kahvehane is to the right. Pull your finger left. I\'ll wait.',
          events:  "Events. These happen outside, not in here. Keep the ones you want; they'll be waiting on Hane.",
          games:   "Three games, new every day. They unlock in order — if you're in a hurry you're in the wrong app.",
          toKutup: "Now the other way. Kütüphane is all the way left: pull right, past Hane, and keep going.",
          news:    "The news. İstanbul, Türkiye, Dünya — all three, a handful a day. When it's done, it's done.",
          anket:   "The poll. Your answer is filed under your own district, so the result isn't one percentage — it's twenty-five.",
          toHane:  "That's enough. Pull left, back to Hane.",
        },
        dog: {
          reveal:  "HI!! This is Hane! The very middle of the app — everything starts here!",
          sen:     "AND THIS IS YOU! You're on your own right now but don't worry! Go on, pick something with the arrows — it saves straight away!",
          senDone: "THAT SUITS YOU! The rest — hats, badges — you earn by going outside. You can't buy any of it, there's no such thing here!",
          petek:   "Now let's step back a bit — THE PETEK! It's only you right now, I know. But when somebody reads you their code they'll take one of those empty sides! Face to face, actually meeting!",
          toKahve: "Let's go to Kahvehane! Pull your finger LEFT!",
          events:  "EVENTS! These are real-life things! Keep the ones you like, they'll wait for you on Hane — then GO!",
          games:   "AND THE GAMES! Three new ones every day! They unlock in order, no rushing!",
          toKutup: "Now the other way! Kütüphane is all the way left — pull RIGHT, past Hane, and keep going!",
          news:    "THE NEWS! İstanbul, Türkiye and Dünya, all here! A handful a day, and then it's done!",
          anket:   "The poll! Your answer goes under YOUR district — so what Beşiktaş said and what Üsküdar said are counted apart!",
          toHane:  "All done! Let's go back to Hane — pull LEFT!",
        },
      },
    },
    // Prompts under the mascot on a beat that waits for the reader to do
    // something real, and the harder nudge that replaces one if they stall
    // (see STALL_MS). Nothing here ever dead-ends.
    pullLeft:    { tr: 'parmağını sola kaydır',  en: 'pull left' },
    pullRight:   { tr: 'parmağını sağa kaydır',  en: 'pull right' },
    pullNudge: {
      tr: 'kaydıramıyor musun? devam etmek için dokun',
      en: "can't pull? tap to carry on",
    },
    tapArrows:   { tr: 'oklardan birine dokun',  en: 'press one of the arrows' },
    tapArrowsNudge: {
      tr: 'sonra da yapabilirsin — devam etmek için dokun',
      en: 'you can do this later — tap to carry on',
    },
    kefilShare: {
      tr: {
        cat: 'Bu senin kodun. Gerçekten kefil olabileceğin birine ver. Yanlış davranırsa, sorumluluk sende. İyi seç.',
        dog: 'Ve bu da SENİN kodun! Güvendiğin birine ver — sen onun kefili olacaksın, tıpkı <em class="kefil-name">{KEFIL}</em>\'in senin kefilin olduğu gibi! Harika birini seç!',
      },
      en: {
        cat: "This is your code. Give it to someone you'd actually vouch for. If they misbehave, it's on you. Choose wisely.",
        dog: "And this is YOUR code! Share it with someone you trust — you'll be their sponsor, just like <em class=\"kefil-name\">{KEFIL}</em> is yours! Choose someone wonderful!",
      },
    },
    profilePrompt: {
      tr: {
        cat: 'Son bir şey. Profilini doldur ki diğerlerimiz kimi içeri aldığımızı bilelim. Sonra dışarı çık.',
        dog: 'Son bir şey! Profilini doldur ki herkes selam verebilsin! Sonra — dışarı çık, dünya seni bekliyor!',
      },
      en: {
        cat: 'Last thing. Fill out your profile so the rest of us know who we let in. Then go outside.',
        dog: 'One last thing! Fill out your profile so everyone can say hi! Then — go outside, the world is waiting!',
      },
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
  let mascot = null;   // 'cat' | 'dog'
  let root;            // DOM root for fullscreen modal phases
  let spotlightEl;     // The persistent dim overlay
  let pane;            // The mascot pane (corner bubble)
  let litTargets = []; // Every element the mascot has introduced so far
  let latestTargets = []; // The set lit by the CURRENT beat (brighter ring)
  let ringLayer;       // Our own layer for the rings drawn over the dim
  let firewallInstalled = false;
  // When set, a click anywhere on the page (outside the pane / interactive
  // target) advances the tour. Cleared after firing once.
  let tapAdvanceFn = null;

  // ── Helpers ──
  function fillKefil(s) {
    return (s || '').replace(/\{KEFIL\}/g, escapeHTML(kefilName || ''));
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  // TEMP: dog art isn't drawn yet -- assets/mascot/ has the cat only, so a
  // dog mascot shows the cat PNG rather than a broken image. One place, so
  // restoring the dog is one line: `mascot-${mascot}-right.png`.
  function mascotSrc() { return 'assets/mascot/mascot-cat-right.png'; }
  function mascotImgHTML() {
    return `<div class="ist-onb-mascot"><img src="${mascotSrc()}" alt=""></div>`;
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
      <small>${c.sub}</small>
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
  // The dim is a PUNCHED SHEET, not a lift. The obvious spelling -- raise the
  // lit element over the dim with position/z-index -- cannot work on the app:
  // project.html's cast lives in .fb-cast, which is `position: absolute` with
  // `z-index: 1` and therefore its own stacking context, so a box inside it
  // can never rise above a dim at 99989 however large a z-index it is given.
  // (And `position: relative` on a .fb-box, which is absolutely positioned by
  // the book, would move it.) So nothing is added to the app's DOM at all:
  // the holes are cut out of the dim with one evenodd clip-path -- the same
  // idiom IstSheet.lightTheMap uses to punch the districts out of its tint --
  // and the rings are drawn in a layer of our own over the top.
  //
  // The rects are measured, so they are re-measured on resize. The book is at
  // rest on every beat that lights anything (a pull beat lights nothing, see
  // runPull), so there is nothing in flight to chase.
  function ensureRingLayer() {
    if (!ringLayer) {
      ringLayer = document.createElement('div');
      ringLayer.id = 'ist-onb-rings';
      document.body.appendChild(ringLayer);
    }
    return ringLayer;
  }

  function spotlightPad() { return 6; }

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
    if (!spotlightEl) return;
    const rects = litTargets
      .map(el => el.getBoundingClientRect())
      .filter(r => r.width > 0 && r.height > 0);

    if (!rects.length) {
      spotlightEl.style.clipPath = '';
      if (ringLayer) ringLayer.innerHTML = '';
      return;
    }

    const pad = spotlightPad();
    if (CAN_CUT) {
      const n = (v) => v.toFixed(1);
      const box = (l, t, r, b) => `M${n(l)} ${n(t)}H${n(r)}V${n(b)}H${n(l)}Z`;
      const W = window.innerWidth, H = window.innerHeight;
      const d = [box(0, 0, W, H)].concat(rects.map(r =>
        box(r.left - pad, r.top - pad, r.right + pad, r.bottom + pad))).join(' ');
      spotlightEl.style.clipPath = `path(evenodd, "${d}")`;
    }

    // The rings: fixed boxes over the same rects, drawing only. The last
    // one lit is the brighter one, so the reader can tell which of the
    // areas already introduced the mascot is talking about NOW.
    const layer = ensureRingLayer();
    layer.innerHTML = '';
    const newest = latestTargets;
    litTargets.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const ring = document.createElement('div');
      ring.className = 'ist-onb-ring' + (newest.includes(el) ? ' latest' : '');
      ring.style.left   = (r.left - pad) + 'px';
      ring.style.top    = (r.top - pad) + 'px';
      ring.style.width  = (r.width + pad * 2) + 'px';
      ring.style.height = (r.height + pad * 2) + 'px';
      layer.appendChild(ring);
    });
  }

  // Light one element or several (a column of cast boxes is three boxes and
  // no wrapper, and the mascot is talking about the column). Everything lit
  // before stays lit; only the newest set wears the brighter ring. Passing
  // nothing lights nothing -- the mascot is speaking generally.
  function addSpotlight(target) {
    spotlightEl.classList.add('show');
    const els = !target ? []
      : (target.length !== undefined && !target.nodeType ? Array.from(target) : [target]);
    latestTargets = els;
    els.forEach(el => { if (el && !litTargets.includes(el)) litTargets.push(el); });
    paintSpotlight();
  }

  function clearSpotlight() {
    litTargets = [];
    latestTargets = [];
    if (ringLayer) ringLayer.innerHTML = '';
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
    // Tap-anywhere advance for non-interactive spotlight beats. Only on
    // real clicks — touchstart/wheel/etc shouldn't trigger this.
    if (e.type === 'click' && tapAdvanceFn) {
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
    document.removeEventListener('keydown', keyFirewall, true);
    document.removeEventListener('focusin', focusTrap, true);
    firewallInstalled = false;
  }

  function renderPane({ speech, actionLabel, onAction, promptText }) {
    pane.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'ist-onb-mascot-row';
    const mImg = document.createElement('div');
    mImg.className = 'ist-onb-mascot';
    mImg.innerHTML = `<img src="${mascotSrc()}" alt="">`;
    const bubble = document.createElement('div');
    bubble.className = 'ist-onb-bubble';
    bubble.innerHTML = speech;
    row.appendChild(mImg);
    row.appendChild(bubble);
    pane.appendChild(row);

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
    const lines = COPY.lanes[lang][mascot];

    // The petek's own depths (HIVE_LEVELS in profile-card.js): 0 is Sen --
    // the reader's own hexagon with the avatar arrows on it -- and 2 is the
    // whole shape. Driven through IstProfileCard.setHivePageLevel, which is
    // that module's own documented handle and no-ops when no petek is
    // standing, exactly as fb() does for the book.
    const HIVE_SEN = 0, HIVE_ALL = 2;
    function setDepth(n) {
      const pc = global.IstProfileCard;
      if (pc && pc.setHivePageLevel) pc.setHivePageLevel(n);
    }

    // `lane` is the lane the beat belongs to and is asserted before it runs,
    // so a reader who wandered is put back rather than talked at about a
    // screen they are not on. `pull` is the lane a pull beat waits for.
    const beats = [
      { lane: LANE_HANE,       target: null,        speech: lines.reveal },
      // The reader first, the shape second. On day one the petek is one
      // hexagon and six empty sides, so there is nothing true to say about
      // neighbours yet -- but there is always something true to say about
      // the reader, and something for them to DO (see COPY.lanes).
      // `.ist-hive-pick-col`, never `.ist-hive-picker`: the picker's own box is
      // exactly the hexagon (--ist-hive-cell-w/h) and both arrow columns are
      // laid OUTSIDE it (`right: 100%` / `left: 100%`), so a ring measured on
      // the wrapper is a box drawn over the avatar with the arrows outside
      // the hole. Two columns, so two rings -- `all`.
      { lane: LANE_HANE,       depth: HIVE_SEN, target: '.ist-hive-pick-col', all: true,
        speech: lines.sen, act: '.ist-hive-picker', prompt: 'tapArrows',
        nudge: 'tapArrowsNudge' },
      { lane: LANE_HANE,       depth: HIVE_SEN, target: '.ist-hive-pick-col', all: true,
        speech: lines.senDone },
      { lane: LANE_HANE,       depth: HIVE_ALL, target: '#fb-petek', speech: lines.petek },
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

      // Every other beat is about a screen, so it asserts that screen -- a
      // reader who wandered is put back rather than talked at about a lane
      // they are not standing on. Never on a pull beat: snapping the book
      // there would fight the very gesture being asked for.
      closePassthrough();
      const f = fb();
      if (f && f.lane && f.lane.at !== b.lane) f.goLane(b.lane);
      // ...and, on Hane, about a DEPTH of the petek as well.
      if (b.depth !== undefined) setDepth(b.depth);

      if (b.act) { runAct(b); return; }

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

    // An act beat: the reader is asked to actually change something, and
    // doing it is the advance. Only the thing being asked for is live (the
    // scoped passthrough), and the first real press on it is enough -- the
    // point is that they find the control and see it answer, not that they
    // dress the whole avatar while a cat watches.
    function runAct(b) {
      // The depth change rescales the plane and the arrows arrive with it,
      // so the rects are taken a frame later and re-taken as they settle.
      requestAnimationFrame(() => {
        addSpotlight(document.querySelectorAll(b.target));
        settleSpotlight();
        const el = document.querySelector(b.act);
        if (!el) { done(); return; }   // no petek standing: nothing to ask for
        openPassthrough('#fb-petek');
        el.addEventListener('click', onPress, true);
      });
      renderPane({ speech: b.speech, promptText: COPY[b.prompt][lang] });

      function onPress() { done(); }
      function done() {
        // b.act, not b.target: the listener is on the picker (which contains
        // both arrow columns), while b.target is what is LIT. They are
        // deliberately different elements -- see the beat's own note.
        const el = document.querySelector(b.act);
        if (el) el.removeEventListener('click', onPress, true);
        stopLaneWatch();
        closePassthrough();
        advance();
      }
      // Same escape hatch as a pull beat, and the same reason: the avatar
      // can be changed any day from this exact screen, so a reader who does
      // not want to right now must not be held here.
      stallTimer = setTimeout(() => {
        stallTimer = null;
        renderPane({ speech: b.speech, promptText: COPY[b.nudge][lang] });
        addHint(COPY[b.nudge][lang], done);
      }, STALL_MS);
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
    stage.insertAdjacentHTML('beforeend', mascotImgHTML());
    addMsg(fillKefil(COPY.kefilShare[lang][mascot]));
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
    stage.insertAdjacentHTML('beforeend', mascotImgHTML());
    addMsg(COPY.profilePrompt[lang][mascot]);
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
