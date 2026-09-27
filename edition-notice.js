// The edition notice — a one-line screen the reader gets the first time
// they open the app since the sun last rose or set over Istanbul: "the sun
// rose over Istanbul today at 06:58. Kütüphane has been renewed." / "the
// sun set... at 19:42. Kahvehane has been renewed." Tap anywhere to
// continue. That is the whole of it.
//
// The second sentence is the reason the first one is worth saying.
// SUNRISE RENEWS KÜTÜPHANE AND SUNSET RENEWS KAHVEHANE (see ist-date.js),
// so each edge of the day turns exactly one side's page, and this is the
// one place the reader is told which -- the sun is not a clock to them
// until it is shown to be doing something.
//
// It is the same object onboarding's own welcome screen is (full-screen,
// centered, tap-anywhere) but it says one sentence instead of holding a
// conversation, and it runs once per EDITION rather than once per account —
// see ist-date.js's editionKey(), which is exactly "which paper is out, and
// which day it belongs to" (a night edition spans midnight, so it is named
// for the day it began on, and this notice follows that same key rather
// than re-deriving its own).
//
// It never competes with onboarding: project.html only calls show() once
// onboarding has declined to run (already onboarded, or no session) — a
// brand-new account gets the welcome screen, not this one, on its first
// launch.
//
// THE SOUND BELONGS TO THE TAP, and that is a platform rule rather than a
// preference. This screen opens itself the moment the app does, with no
// user gesture behind it, and every engine — WKWebView hardest of all —
// refuses to play audio until there has been one. The dismissing tap IS
// that gesture, so the crows are what the reader lets the day in WITH
// rather than what greets them, and they carry over into the app behind
// the screen for their couple of seconds. Anything that tried to play on
// arrival would be silently refused on the platform ~90% of readers are
// on, which is the worst of both: code that looks like it works and a
// feature nobody ever hears.
(function (global) {
  const ROOT_ID = 'ist-edn-root';
  // Which edition the reader has already been told about, so a second
  // launch inside the same day/night says nothing.
  const SEEN_KEY = 'istanbulite_edition_seen';

  // The Turkish locative after a clock time follows the LAST WORD SPOKEN,
  // not the last digit written: "19:42" is read "on dokuz kırk iki", so it
  // is 19:42'de; "07:03" ends on üç, so 07:03'te; "18:30" on otuz, so
  // 18:30'da; and on the hour the minutes are not said at all, so 07:00 is
  // yedi'de. It used to be 'te on every time, which is right for three
  // minutes in ten. Vowel harmony and the hardened t after ç/ş/t/k are
  // baked into the two tables rather than derived -- there are only
  // fifteen number words that can end a time.
  const LOC_UNITS = ['da', 'de', 'de', 'te', 'te', 'te', 'da', 'de', 'de', 'da']; // sıfır, bir … dokuz
  const LOC_TENS = ['da', 'da', 'de', 'da', 'ta', 'de'];                          // (sıfır), on, yirmi, otuz, kırk, elli
  function trAt(t) {
    const [h, m] = String(t).split(':').map(Number);
    const n = m || h || 0;
    return n % 10 ? LOC_UNITS[n % 10] : LOC_TENS[Math.floor(n / 10)];
  }

  const COPY = {
    sunrise: {
      tr: (t) => `Güneş bugün İstanbul'da ${t}'${trAt(t)} doğdu. Kütüphane yenilendi.`,
      en: (t) => `The sun rose over Istanbul today at ${t}. Kütüphane has been renewed.`,
    },
    sunset: {
      tr: (t) => `Güneş bugün İstanbul'da ${t}'${trAt(t)} battı. Kahvehane yenilendi.`,
      en: (t) => `The sun set over Istanbul today at ${t}. Kahvehane has been renewed.`,
    },
    tapHint: { tr: 'devam etmek için herhangi bir yere dokun', en: 'tap anywhere to continue' },
  };

  // What each edition arrives with. Two entries because a sunrise and a
  // sunset are not the same moment — today they are one recording of the
  // same crows, and giving the sunset its own is changing one line here.
  // A missing file is silence and nothing else (see play()), so the screen
  // works exactly as it did before a recording is dropped in.
  const SOUND = {
    sunrise: 'assets/sound/crows.m4a',
    sunset: 'assets/sound/crows.m4a',
  };

  // Every way this can fail — no file there yet, a codec the device will
  // not take, a play() the engine refuses anyway — is silence, never an
  // exception thrown into the dismissal. The screen must always close.
  function play(audio) {
    if (!audio) return;
    try {
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    } catch (err) { /* ignore */ }
  }

  function lang() {
    return (global.I18N && global.I18N.isEnglish && global.I18N.isEnglish()) ? 'en' : 'tr';
  }

  function fmtTime(d) {
    return new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d);
  }

  // The key is the edition itself (date + gun/gece), not a timestamp — two
  // launches inside the same edition must read as the same notice, however
  // far apart they are, and a launch in the next one must always read as new.
  function editionSeenKey() {
    if (!global.IstDate) return null;
    const e = IstDate.editionKey();
    return `${e.date}_${e.edition}`;
  }

  function lastSeen() {
    try { return localStorage.getItem(SEEN_KEY); } catch (e) { return null; }
  }
  function markSeen(key) {
    try { localStorage.setItem(SEEN_KEY, key); } catch (e) { /* ignore */ }
  }

  function buildRoot() {
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="ist-edn-msg"></div>
      <div class="ist-edn-hint"></div>
    `;
    document.body.appendChild(root);
    return root;
  }

  // Types `text` into `el` one letter at a time, the same plain letter-by-
  // letter reveal onboarding's own welcome screen uses (addMsgTypedOnly in
  // onboarding.js) — resolves once the whole sentence is on screen.
  function typeInto(el, text, speed) {
    return new Promise(resolve => {
      let i = 0;
      (function tick() {
        el.textContent = text.slice(0, i);
        if (i >= text.length) { resolve(); return; }
        i++;
        setTimeout(tick, speed);
      })();
    });
  }

  // Shows the notice if the reader has not seen this edition yet. Returns
  // true if it showed, false if there was nothing to say (already seen, or
  // the clock/sun module is not on this page).
  function show() {
    const key = editionSeenKey();
    if (!key || lastSeen() === key) return false;

    const e = IstDate.editionKey();
    const rising = e.edition === 'gun';
    const { sunrise, sunset } = IstDate.sunTimes();
    const t = fmtTime(rising ? sunrise : sunset);
    const l = lang();
    const line = (rising ? COPY.sunrise : COPY.sunset)[l](t);

    // Armed as the screen goes up so the bytes are in by the time the
    // reader taps — the tap's own permission to play does not survive a
    // wait for the network.
    const crows = new Audio(SOUND[rising ? 'sunrise' : 'sunset']);
    crows.preload = 'auto';
    crows.load();

    let root = document.getElementById(ROOT_ID);
    if (!root) root = buildRoot();
    const msg = root.querySelector('.ist-edn-msg');
    const hint = root.querySelector('.ist-edn-hint');
    msg.textContent = '';
    hint.textContent = COPY.tapHint[l];
    hint.classList.remove('show');

    function dismiss() {
      // First thing, and synchronously: play() is allowed only while the
      // tap that triggered it is being handled, and anything awaited before
      // it spends that permission.
      play(crows);
      markSeen(key);
      root.classList.remove('show');
      document.body.classList.remove('ist-edn-locked');
      root.removeEventListener('click', dismiss);
    }
    root.addEventListener('click', dismiss);

    document.body.classList.add('ist-edn-locked');
    root.classList.add('show');
    // The hint — and the "tap anywhere" it promises — only appears once the
    // whole sentence has actually typed out; showing it earlier would be a
    // hint for a gesture that skips text the reader hasn't read yet.
    typeInto(msg, line, 28).then(() => hint.classList.add('show'));
    return true;
  }

  global.IstEditionNotice = { show };
})(window);
