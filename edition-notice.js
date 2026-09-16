// The edition notice — a one-line screen the reader gets the first time
// they open the app since the sun last rose or set over Istanbul: "the sun
// set in Istanbul today at 19:42." / "the sun rose... at 06:58." Tap
// anywhere to continue. That is the whole of it.
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
(function (global) {
  const ROOT_ID = 'ist-edn-root';
  // Which edition the reader has already been told about, so a second
  // launch inside the same day/night says nothing.
  const SEEN_KEY = 'istanbulite_edition_seen';

  const COPY = {
    sunrise: {
      tr: (t) => `Güneş bugün İstanbul'da ${t}'te doğdu.`,
      en: (t) => `The sun rose over Istanbul today at ${t}.`,
    },
    sunset: {
      tr: (t) => `Güneş bugün İstanbul'da ${t}'te battı.`,
      en: (t) => `The sun set over Istanbul today at ${t}.`,
    },
    tapHint: { tr: 'devam etmek için herhangi bir yere dokun', en: 'tap anywhere to continue' },
  };

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
      <button type="button" class="ist-edn-hint"></button>
    `;
    document.body.appendChild(root);
    return root;
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

    let root = document.getElementById(ROOT_ID);
    if (!root) root = buildRoot();
    root.querySelector('.ist-edn-msg').textContent = line;
    const hint = root.querySelector('.ist-edn-hint');
    hint.textContent = COPY.tapHint[l];

    function dismiss() {
      markSeen(key);
      root.classList.remove('show');
      document.body.classList.remove('ist-edn-locked');
      root.removeEventListener('click', dismiss);
    }
    root.addEventListener('click', dismiss);

    document.body.classList.add('ist-edn-locked');
    root.classList.add('show');
    return true;
  }

  global.IstEditionNotice = { show };
})(window);
