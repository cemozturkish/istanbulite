// Onboarding flow for brand-new accounts.
// Runs on first login: locks the rest of the page behind a full-screen overlay,
// walks the user through 8 beats (welcome → language → palette+mascot → tour →
// kefil code → profile prompt), then writes onboarded_at, language_pref,
// palette_pref, and mascot to profiles.
//
// Mount from any page after auth:
//   IstOnboarding.maybeRun({ sb, user, kefilName })
// It checks profiles.onboarded_at — if null, runs the flow; otherwise no-op.

(function (global) {
  const ROOT_ID = 'ist-onb-root';
  // Cross-page state so the flow can hop anahane → kahvehane → kutuphane → anahane.
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
      // Unused now — the picker is inline on the welcome screen — but
      // kept so any caller that still references stepLanguage doesn't break.
      body: 'ISTANBULITE is, by default, in Turglish. Before we get started, we would like to ask your preference. You can choose to have most things in Turkish, or most things in English — but never not both.',
      choices: [
        { value: 'default',      label: 'TÜRKÇE AĞIRLIKLI', sub: 'Turkish-heavy' },
        { value: 'more_english', label: 'ENGLISH-HEAVY',    sub: 'İngilizce ağırlıklı' },
      ],
    },
    paletteScreen: {
      tr: {
        body: 'Harika! Öyleyse Türkçe devam edelim. Merak ettiğimiz bir şey daha var: uygulaman için hangi renk paletini tercih edersin? Eğer siyah ve beyazı tercih edersen, konuşmanın geri kalanını bir kedi devralacak. Kahverengi ve beji tercih ettiğin takdirde ise bir köpek devralacak ve senin maskotun o olacak. Kararsızsan dert etme — bu ayarları istediğin zaman değiştirebilirsin.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'SİYAH & BEYAZ', sub: 'kedi' },
          { value: 'earth', mascot: 'dog', label: 'TOPRAK TONLARI', sub: 'köpek' },
        ],
      },
      en: {
        body: 'Great! Another thing we were wondering: what would you prefer the color palette of your application to be? If you go with black and white, a cat will take over from here. If you prefer earthy tones, then a dog becomes your mascot instead. You can change these settings whenever you want.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'BLACK & WHITE', sub: 'cat' },
          { value: 'earth', mascot: 'dog', label: 'EARTHY TONES',  sub: 'dog' },
        ],
      },
    },
    // Spotlight tour: each beat targets a real element on the page.
    // null target = no spotlight (just mascot floating).
    tour: {
      tr: {
        cat: {
          reveal:  'Hâlâ buradasın demek. Peki, sana Hane\'yi göstereyim. Ayak uydurmaya çalış.',
          news:    'Mahallenden ve dünyadan son dakika. Acil bir şey yoksa, yenilemene gerek yok.',
          map:     'Harita. Buradaki ışıklı kısım senin mahallen. Üzerine bir dokun bakalım.',
          events:  'Bu haftanın etkinlikleri. İnternette daha fazla vakit geçirmen için değil — dışarı çıkasın diye.',
          nav:     'Kütüphane ve Kahvehane buradan. Kahvehane\'de her gün değişen üç oyun var: Sözcel, Tümcel, Bulmaca. Serini kaybetme.',
        },
        dog: {
          reveal:  'SELAAM!! Vay, merhaba! Hane\'ye hoş geldin! Hadi sana her şeyi göstereyim!!',
          news:    'Burada mahallenden ve dünyadan son haberler var! Hepsi tek yerde, ne güzel değil mi?',
          map:     'Bak, harita! Işıklı olan kısım senin mahallen! Hadi üstüne bir dokun, beraber selamlayalım!',
          events:  'Ve bu hafta neler oluyor! Bunlar gerçek hayatta — git, eğlen, biriyle tanış!',
          nav:     'Buradan Kütüphane ve Kahvehane\'ye gidebilirsin! Kahvehane\'de her gün üç yeni oyun var: Sözcel, Tümcel, Bulmaca — çok eğlenceli!',
        },
      },
      en: {
        cat: {
          reveal:  "Oh. You're still here. Fine — let me show you around Hane. Try to keep up.",
          news:    "Breaking news from your hood and the world. If nothing's urgent, don't refresh.",
          map:     'The map. The lit-up one is your district. Go on, tap it.',
          events:  "What's happening this week. Not so you spend more time online — so you go outside.",
          nav:     "Kütüphane and Kahvehane are up here. Kahvehane has three games that change every day: Sözcel, Tümcel, Bulmaca. Don't lose your streak.",
        },
        dog: {
          reveal:  "HI!! Oh wow, hi! Welcome to Hane! Come on, let me show you everything!!",
          news:    "Here's the breaking news from your hood and the world! All in one place, isn't that nice?",
          map:     "Look, a map! The glowing one is YOUR district! Tap it, let's say hi together!",
          events:  "And here's what's happening this week! These are real-life things — go, have fun, meet someone!",
          nav:     "Up here you can get to Kütüphane and Kahvehane! Kahvehane has three new games every day: Sözcel, Tümcel, Bulmaca — so fun!",
        },
      },
    },
    // Last anahane beat tells the user the mascot is taking them to Kahvehane.
    navLeave: {
      tr: {
        cat: 'Yukarıda diğer salonlar da var. Gel — önce Kahvehane.',
        dog: 'Yukarıda başka yerler de var! Hadi seni önce Kahvehane\'ye götüreyim!',
      },
      en: {
        cat: "Other halls are up here. Come — Kahvehane first.",
        dog: "There are other places up here too! Come on, let me take you to Kahvehane first!",
      },
    },
    kahvehaneIntro: {
      tr: {
        cat: 'Kahvehane. Üç oyun her gün değişir — Sözcel, Tümcel, Bulmaca. Serini kaybedersen anlarız. Şimdi Kütüphane\'ye.',
        dog: 'İşte Kahvehane! Her gün ÜÇ yeni oyun var — Sözcel, Tümcel, Bulmaca! Diğerleri de buraya sohbete gelir! Hadi şimdi Kütüphane\'ye!',
      },
      en: {
        cat: "Kahvehane. Three games change every day — Sözcel, Tümcel, Bulmaca. Lose your streak and we'll know. Now to Kütüphane.",
        dog: "Here we are — Kahvehane! Every day there are THREE new games — Sözcel, Tümcel, Bulmaca! The others come here to talk too! Now let's go to Kütüphane!",
      },
    },
    kutuphaneIntro: {
      tr: {
        cat: 'Kütüphane. Uzun okumalar burada. Vaktin olduğunda gez. Şimdi Hane\'ye dönelim — neredeyse bitti.',
        dog: 'Ve burası Kütüphane! Bütün uzun yazılar burada! Son durak — Hane\'ye dönüyoruz!',
      },
      en: {
        cat: "Kütüphane. The longer reading lives here. Browse when you've got time. Back to Hane — almost done.",
        dog: "And this is Kütüphane! All the long reads live here! Last stop — back to Hane!",
      },
    },
    btnTakeKahvehane: { tr: 'KAHVEHANE\'YE GİT', en: 'GO TO KAHVEHANE' },
    btnTakeKutuphane: { tr: 'KÜTÜPHANE\'YE GİT', en: 'GO TO KÜTÜPHANE' },
    btnBackToHane:    { tr: 'HANE\'YE DÖN',      en: 'BACK TO HANE' },
    promptTapKahvehane:       { tr: 'üstteki menüden KAHVEHANE\'ye dokun', en: 'tap KAHVEHANE in the nav above' },
    promptTapKahvehaneMobile: { tr: 'alttaki sekmeden KAHVEHANE\'ye dokun', en: 'tap KAHVEHANE in the tab bar below' },
    promptTapKutuphane:       { tr: 'üstteki menüden KÜTÜPHANE\'ye dokun', en: 'tap KÜTÜPHANE in the nav above' },
    promptTapKutuphaneMobile: { tr: 'alttaki sekmeden KÜTÜPHANE\'ye dokun', en: 'tap KÜTÜPHANE in the tab bar below' },
    promptTapHane:            { tr: 'üstteki menüden HANE\'ye dokun',       en: 'tap HANE in the nav above' },
    promptTapHaneMobile:      { tr: 'alttaki sekmeden HANE\'ye dokun',      en: 'tap HANE in the tab bar below' },

    // Mascot reaction after the user actually taps their neighborhood.
    // Calls out the news-feed filter switching to "mahalle" — the news
    // section is still lit on the left, so the user can see the change.
    mapTapped: {
      tr: {
        cat: 'İşte. Mahallen. Sola bak — haber akışı da artık sadece senin mahallenden. Aklında bulunsun.',
        dog: 'EVET! İşte burada — senin mahallen! Bak, sol taraftaki haberler de değişti! Şimdi sadece mahallenden son dakika!',
      },
      en: {
        cat: 'There. Your district. Look left — the feed is filtered to your hood now. Keep it in mind.',
        dog: "YES! There it is — your district! And look, the news on the left changed too! It's just your hood's breaking news now!",
      },
    },
    promptTapHood: {
      tr: 'mahallene dokun',
      en: 'tap your district',
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
  let interactiveTarget; // Only set when the user must tap this element
  let firewallInstalled = false;
  // When set, a click anywhere on the page (outside the pane / interactive
  // target) advances the tour. Cleared after firing once.
  let tapAdvanceFn = null;

  // ── Helpers ──
  // Matches the 768px breakpoint used by all page layouts.
  function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }

  function fillKefil(s) {
    return (s || '').replace(/\{KEFIL\}/g, escapeHTML(kefilName || ''));
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function mascotImgHTML() {
    const src = mascot === 'cat' ? 'assets/mascot-cat.svg' : 'assets/mascot-dog.svg';
    return `<div class="ist-onb-mascot"><img src="${src}" alt=""></div>`;
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
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Cross-page state ──
  function saveState(stage) {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({
        stage, lang, palette, mascot, kefilName, referralCode, homeNb,
      }));
    } catch (e) { /* sessionStorage might be unavailable; flow restarts on next page */ }
  }
  function loadState() {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null'); }
    catch (e) { return null; }
  }
  function clearState() {
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) { /* ignore */ }
  }
  function hydrateFromState(s) {
    lang = s.lang || 'en';
    palette = s.palette || 'earth';
    mascot = s.mascot || 'dog';
    kefilName = s.kefilName || '';
    referralCode = s.referralCode || '';
    homeNb = s.homeNb || null;
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

  function stepLanguage() {
    clearStage();
    const s = COPY.languageScreen;
    addMsg(s.body);
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
    addChoices(s.choices, onPick, onConfirm, c => `<div>${c.label}</div><small>${c.sub}</small>`);
  }

  function stepPalette() {
    clearStage();
    const s = COPY.paletteScreen[lang];
    addMsg(s.body);
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
      stepTour(0);
    };
    addChoices(s.choices, onPick, onConfirm, c => `
      <div class="ist-onb-swatch ${c.value}"><span></span><span></span><span></span></div>
      <div>${c.label}</div>
      <small>${c.sub}</small>
    `);
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
    pane.setAttribute('data-palette', palette || 'earth');
  }

  // Add a newly-introduced element to the lit set. Previously-lit elements
  // stay lit (just lose the `.latest` brighter ring). Passing null = no new
  // spotlight (the mascot is speaking generally, e.g. reveal beat).
  function addSpotlight(el) {
    spotlightEl.classList.add('show');
    // Demote the previous "latest" so only the newest gets the brighter ring.
    litTargets.forEach(t => t.classList.remove('latest'));
    if (!el) return;
    if (!litTargets.includes(el)) litTargets.push(el);
    el.classList.add('ist-onb-target', 'latest');
    // Scroll into view if needed so the user can see the new highlight.
    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function clearSpotlight() {
    litTargets.forEach(t => t.classList.remove('ist-onb-target', 'interactive', 'latest'));
    litTargets = [];
    interactiveTarget = null;
    if (spotlightEl) spotlightEl.classList.remove('show');
  }

  // Block clicks/swipes/wheel/keyboard on the rest of the page during the
  // whole onboarding so the user can't navigate away. anahane.html attaches
  // touchstart + wheel listeners on `document` for swipe-pagination — we
  // stopImmediatePropagation in the capture phase so those never see the
  // event. Pane / modal clicks pass through, and the interactiveTarget (the
  // user's hood polygon) is allowed during the map step.
  function isInsideOnboarding(target) {
    return target && target.closest && target.closest('#ist-onb-root, #ist-onb-pane, .ist-onb-hint');
  }
  function gestureFirewall(e) {
    if (isInsideOnboarding(e.target)) return;
    if (interactiveTarget && interactiveTarget.contains(e.target)) return;
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
    if (interactiveTarget && interactiveTarget.contains(e.target)) return;
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
    if (interactiveTarget && interactiveTarget.contains(e.target)) return;
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
    mImg.innerHTML = `<img src="assets/mascot-${mascot}.svg" alt="">`;
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

  // ───── Tour steps ─────
  function stepTour() {
    enterSpotlightMode();
    const lines = COPY.tour[lang][mascot];

    const beats = [
      { target: null,                   speech: lines.reveal },
      { target: 'aside.col-left',       speech: lines.news },
      { target: '.map-panel',           speech: lines.map,    interactive: 'hood' },
      { target: 'aside.col-right',      speech: lines.events },
      // Last beat hands off to the cross-page leg. On desktop the nav lives
      // inside .section-rule (top bar); on mobile it's a fixed bottom tab bar
      // (header). Spotlight whichever is relevant so the user looks in the
      // right place for the Kahvehane link.
      { target: isMobile() ? 'header' : '.section-rule', speech: COPY.navLeave[lang][mascot], interactive: 'nav-kahvehane' },
    ];

    let idx = 0;
    runBeat();

    function runBeat() {
      const b = beats[idx];
      const el = b.target ? document.querySelector(b.target) : null;
      addSpotlight(el);

      if (b.interactive === 'hood' && homeNb) {
        const hoodEl = document.getElementById(homeNb);
        if (hoodEl) {
          // Let ONLY the user's hood polygon receive clicks through the firewall.
          interactiveTarget = hoodEl;
          hoodEl.classList.add('ist-onb-target', 'interactive', 'latest');
          if (!litTargets.includes(hoodEl)) litTargets.push(hoodEl);
          renderPane({
            speech: b.speech,
            promptText: COPY.promptTapHood[lang],
          });
          const handler = () => {
            hoodEl.removeEventListener('click', handler, true);
            interactiveTarget = null;
            // Switch the breaking-news feed to the user's neighborhood so
            // the reaction line ("see how the news changed?") actually
            // reflects what's on screen. The news section is still lit.
            // Calling applyNewsFilter directly bypasses our click firewall.
            if (typeof window.applyNewsFilter === 'function') {
              window.applyNewsFilter('mahalle');
            }
            // Mascot reaction — nothing specific to click, so use the
            // tap-anywhere pattern instead of a Next button.
            renderPane({ speech: COPY.mapTapped[lang][mascot] });
            addHint(COPY.tapToContinue[lang], advance);
          };
          hoodEl.addEventListener('click', handler, true);
          return;
        }
      }

      // Handoff to Kahvehane: user taps the real navbar link instead of
      // a Next button. We light the link, save state on click, then let
      // the page's own click handlers (view transition / swipe-pagination)
      // take over the navigation.
      if (b.interactive === 'nav-kahvehane') {
        renderPane({
          speech: b.speech,
          promptText: isMobile()
            ? COPY.promptTapKahvehaneMobile[lang]
            : COPY.promptTapKahvehane[lang],
        });
        wireNavLink('kahvehane.html', 'phase2-kahvehane');
        return;
      }

      // Non-interactive beat: no NEXT button — user taps anywhere to advance.
      // The hint at the bottom of the screen tells them so; clicks on the
      // dim go through the firewall, which fires tapAdvanceFn (set by addHint).
      renderPane({ speech: b.speech });
      addHint(COPY.tapToContinue[lang] || 'tap anywhere to continue', advance);
    }

    function advance() {
      idx++;
      if (idx >= beats.length) {
        exitSpotlightMode();
        stepKefilShare();
      } else {
        runBeat();
      }
    }
  }

  // Save state + hop to the next page. The destination page's onboarding
  // script picks up where we left off via loadState().
  function goToPage(href, nextStage) {
    saveState(nextStage);
    window.location.href = href;
  }

  // Wire a real navbar link as the interactive target for a handoff beat.
  // The user has to tap the link themselves; saveState fires in capture
  // phase so the value is committed to sessionStorage before the page's
  // own click handlers (view-transitions, swipe-pagination) take over.
  function wireNavLink(linkHref, nextStage, onPick) {
    const link = document.querySelector(`header nav a[href="${linkHref}"]`);
    if (!link) {
      // Page doesn't have the expected nav link — fall back to plain navigation.
      goToPage(linkHref, nextStage);
      return;
    }
    interactiveTarget = link;
    addSpotlight(link);
    const handler = () => {
      saveState(nextStage);
      // Don't preventDefault: the page's own click handler will run the
      // view-transition + navigate, OR the browser will follow the href.
      if (onPick) onPick();
    };
    link.addEventListener('click', handler, true);
  }

  // ───── Kahvehane mini-tour ─────
  function stepKahvehaneTour() {
    enterSpotlightMode();
    // Light the right-column aside (the games stack) AND the nav bar.
    // On desktop the nav lives in .section-rule (top); on mobile it's
    // the fixed bottom tab bar (header).
    const games = document.querySelector('aside.col-right') || document.querySelector('main');
    if (games) addSpotlight(games);
    const navBar = document.querySelector(isMobile() ? 'header' : '.section-rule');
    if (navBar) addSpotlight(navBar);
    renderPane({
      speech: COPY.kahvehaneIntro[lang][mascot],
      promptText: isMobile()
        ? COPY.promptTapKutuphaneMobile[lang]
        : COPY.promptTapKutuphane[lang],
    });
    wireNavLink('kutuphane.html', 'phase2-kutuphane');
  }

  // ───── Kütüphane mini-tour ─────
  function stepKutuphaneTour() {
    enterSpotlightMode();
    const lib = document.querySelector('aside.col-left') || document.querySelector('main');
    if (lib) addSpotlight(lib);
    const navBar = document.querySelector(isMobile() ? 'header' : '.section-rule');
    if (navBar) addSpotlight(navBar);
    renderPane({
      speech: COPY.kutuphaneIntro[lang][mascot],
      promptText: isMobile()
        ? COPY.promptTapHaneMobile[lang]
        : COPY.promptTapHane[lang],
    });
    wireNavLink('anahane.html', 'phase3-finale');
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
    root.setAttribute('data-palette', 'earth');
    root.innerHTML = `
      <div class="ist-onb-tap-zone"></div>
      <div id="ist-onb-stage"></div>
    `;
    document.body.appendChild(root);
  }

  async function maybeRun(opts) {
    sb = opts.sb;
    user = opts.user;
    if (!sb || !user) return false;
    const page = opts.page || 'anahane';

    // Always confirm we're not done already.
    const { data: profile } = await sb.from('profiles')
      .select('onboarded_at, referral_code, referred_by, neighborhood')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.onboarded_at) { clearState(); return false; }

    const saved = loadState();

    // ── kahvehane / kutuphane: only run if we're mid-flow on this stage.
    // Otherwise the user opened the page on their own and we should stay quiet.
    if (page === 'kahvehane') {
      if (!saved || saved.stage !== 'phase2-kahvehane') return false;
      hydrateFromState(saved);
      ensureRoot();
      show();
      stepKahvehaneTour();
      return true;
    }
    if (page === 'kutuphane') {
      if (!saved || saved.stage !== 'phase2-kutuphane') return false;
      hydrateFromState(saved);
      ensureRoot();
      show();
      stepKutuphaneTour();
      return true;
    }

    // ── anahane: either fresh start or returning for the finale.
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

    // If the user navigated back to anahane while mid-flow on another page,
    // bounce them to where they were supposed to be instead of restarting.
    if (saved && saved.stage === 'phase2-kahvehane') {
      window.location.replace('kahvehane.html');
      return false;
    }
    if (saved && saved.stage === 'phase2-kutuphane') {
      window.location.replace('kutuphane.html');
      return false;
    }

    ensureRoot();
    show();

    if (saved && saved.stage === 'phase3-finale') {
      hydrateFromState(saved);
      // Skip the welcome/language/palette/tour — go straight to the closing modals.
      stepKefilShare();
      return true;
    }

    stepWelcome();
    return true;
  }

  function ensureRoot() {
    if (!document.getElementById(ROOT_ID)) buildRoot();
    else root = document.getElementById(ROOT_ID);
  }

  global.IstOnboarding = { maybeRun };
})(window);
