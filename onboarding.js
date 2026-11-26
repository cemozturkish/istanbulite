// Onboarding — first-time introductions, not a tour.
//
// A new member is not walked through anything. They land on the home
// screen standing in their own petek and do whatever they like; the FIRST
// time they reach something (a stop of the layered home, a game, an
// evening's card, the whole petek behind the logo, their own profile, ...)
// a small card says what it is, and one press puts it away for good. The
// next card waits until they reach the next thing they have never reached.
//
// That replaced a forced tour (welcome → language hold → a dozen locked
// beats → kefil code → finish) that held the whole app behind a firewall
// until the end. Consent to the rules is given at signup (index.html), so
// nothing here has to gate anything.
//
// project.html (the only page that loads this) says when something has
// been reached:
//   IstOnboarding.first(key, { still })
// `still`, when given, is asked again at the moment the card would show:
// a card queued behind another one is dropped (and NOT marked seen) if
// the reader has meanwhile left the thing it is about. A few reaches are
// noticed here instead, off the petek's own markup and events (a free
// seat pressed, the reader's own hexagon pressed, a member named on the
// bar, the reader's own profile sheet opened), so profile-card.js needs no
// hooks of its own.
//
// Who gets them: accounts that are new when this runs (onboarded_at is
// null — it is written straight away) and, after that, any account with
// an intro record (profiles.intro_seen, db/onboarding_v2_intros.sql, or
// this browser's own copy). A member who went through the old tour has
// neither and sees nothing. The admin's kill switch
// (app_settings.onboarding_enabled = false) turns all of it off.
//
// Mount once after auth:
//   IstOnboarding.maybeRun({ sb, user })  → true on the account's first launch

(function (global) {
  // ── Copy ──
  // One card per key, TR / EN. `\n\n` breaks a paragraph. Every key can
  // be overridden from admin.html (Users → Onboarding), stored in
  // onboarding_copy under 'intro.<key>' (see copyFor) — an empty field
  // falls back to the text written here.
  const COPY = {
    petek: {
      tr: 'Burası peteğin. Ortadaki altıgen sensin; etrafındakiler, yanına eklemlenen İstanbulitler.\n\nEklemlenmek yüz yüze olur: boş bir +’ya bas, çıkan kodu yanındakine söyle; o da kendi altıgenine basıp kodu yazsın — artık yan yanasınız.\n\nAşağıdaki İstanbulite logosuna basarsan bütün peteği görürsün; bir daha basınca geri döner.',
      en: 'This is your petek. The hexagon in the middle is you; around it, the Istanbulites attached to you.\n\nAttaching happens face to face: press an empty +, read the code out to the person beside you, and they press their own hexagon and type it in — now you stand side by side.\n\nPress the İstanbulite logo at the bottom to see the whole petek; press it again to come back.',
    },
    whole: {
      tr: 'Bu bütün petek: birbirine bağlı herkes. Herkes yanındakiyle yüz yüze tanıştı; sen de öyle büyüteceksin.\n\nLogoya bir daha bas, geri dön. Logoyu basılı tutarsan da uygulama Türkçe ile İngilizce arasında geçiş yapar.',
      en: 'This is the whole petek: everybody joined to everybody. Each of them met the one beside them face to face — and that is how yours grows too.\n\nPress the logo again to come back. Hold it down and the app switches between Turkish and English.',
    },
    seat: {
      tr: 'Bu kod bu boş yerin: on dakika geçerli, tek kişilik. Yanındakine söyle; kendi altıgenine basıp yazsın, tam buraya yerleşir.',
      en: 'This code is this empty place: good for ten minutes, for one person. Read it to the person beside you; they press their own hexagon, type it in, and land right here.',
    },
    self: {
      tr: 'Biri sana kod söylediyse buraya yaz: onun yanına yerleşirsin. Kodlar yalnızca yüz yüzeyken verilir.',
      en: 'If somebody read you a code, type it here: you land next to them. Codes are only ever given face to face.',
    },
    member: {
      tr: 'Adı yukarıda, çubukta. Ada basarsan profilini görürsün.\n\nİstanbulite’te kimseye mesaj yazılmaz — ama onu dışarıda bulabilirsin.',
      en: 'Their name is up on the bar. Press it to see their profile.\n\nNobody messages anybody on Istanbulite — but you can find them outside.',
    },
    profile: {
      tr: 'Burası senin sayfan. Avatarını buradan giydirirsin; şapkalar ve rozetler dışarıda, etkinliklere giderek kazanılır — satın alınamaz.\n\nKefalet kodun da burada. Gerçekten kefil olabileceğin birine ver: yanlış davranırsa sorumluluk sende.',
      en: 'This is your page. Dress your avatar here; hats and badges are earned outside, by going to evenings — they cannot be bought.\n\nYour kefil code is here too. Give it to somebody you would really vouch for: if they misbehave, it is on you.',
    },
    city: {
      tr: 'Burası şehir. Haritadaki işaretler bu haftanın akşamları; kırmızı haleli olan bugün. Birine bas: ne, nerede, kim gidiyor.\n\nAltta haftalık ajandan duruyor — yukarı çekersen bütün hafta açılır.',
      en: 'This is the city. The marks on the map are this week’s evenings; the one with a red halo is today. Press one: what, where, who is going.\n\nYour weekly agenda sits at the bottom — pull it up for the whole week.',
    },
    games: {
      tr: 'Burası oyunlar. Her gece yarısı iki yeni oyun gelir; bu gece {games} var.\n\nPeteğindekilerin sonuçları altıgenlerinde görünür. Günün skorları da İstanbulite’in Instagram hesabından paylaşılıyor.',
      en: 'These are the games. Two new ones every midnight; tonight it is {games}.\n\nYour petek’s results show on their hexagons. The day’s scores are also shared on Istanbulite’s Instagram account.',
    },
    'game.sozcel': {
      tr: 'Sözcel: günün kelimesini bul. Altı tahminin var. Yerindeki harf koyu, kelimede olup yeri yanlış olan kırmızı.\n\nKelimeyi her gün bir İstanbulite seçer: Günün Sözcüsü.',
      en: 'Sözcel: find the day’s word. You have six guesses. A letter in its place goes dark, a right letter in the wrong place goes red.\n\nEvery day an Istanbulite picks the word: the Sözcü of the day.',
    },
    'game.tumcel': {
      tr: 'Tümcel: on altı parça, dört alıntı. Parçaları doğru bir araya getir, dört cümleyi geri kur.',
      en: 'Tümcel: sixteen fragments, four quotes. Put the pieces back together and rebuild the four sentences.',
    },
    'game.bulmaca': {
      tr: 'Çengel: günün küçük bulmacası. Bir kareye bas, tanımını oku, harfleri yaz.',
      en: 'Çengel: the day’s small crossword. Press a square, read its clue, type the letters.',
    },
    'game.guncel': {
      tr: 'Güncel: bu olaylardan dördü dün oldu. Hangileri? Her yanlış bir can götürür; dört canın var.',
      en: 'Güncel: four of these happened yesterday. Which ones? Every wrong press costs a life; you have four.',
    },
    event: {
      tr: 'Bu bir akşam: ne, nerede, ne zaman ve kim kefil. GİDİYORUM dersen peteğindekiler görür.\n\nKart açıkken petek bu akşamın misafir listesidir: gidenlerin altıgeni kırmızı.',
      en: 'This is an evening: what, where, when, and who vouches for it. Say GOING and your petek sees it.\n\nWhile the card is open, the petek is its guest list: the hexagons of those going turn red.',
    },
    agenda: {
      tr: 'Haftalık ajandan: gideceğini söylediğin her akşam ve kendi planların, gün gün. Bir güne basarsan o gün için plan kurarsın.',
      en: 'Your weekly agenda: every evening you said you are going to and your own plans, day by day. Press a day to make a plan for it.',
    },
    plan: {
      tr: 'Bir yere mi gidiyorsun? Ne, nerede, ne zaman. Kimin göreceğini sen seçersin: peteğin, peteğinin peteği ya da sana bağlı bütün İstanbul.',
      en: 'Going somewhere? What, where, when. You choose who sees it: your petek, your petek’s petek, or all of İstanbul joined to you.',
    },
  };
  // The first card a new account meets carries a welcome over it.
  const WELCOME = {
    tr: { lead: 'Hoş geldin.', kefil: '{KEFIL} sana kefil oldu.' },
    en: { lead: 'Welcome.',    kefil: '{KEFIL} vouched for you.' },
  };
  const TAP = { tr: 'Devam etmek için herhangi bir yere dokun', en: 'Tap anywhere to continue' };

  // ── What each card is ABOUT ──
  // Everything on the screen is dimmed except the card and these. Each
  // entry answers a list of GROUPS; a group is one or more elements and is
  // cut out of the wash as ONE hole around all of them (the petek's
  // hexagons are one hole, the two game buttons two). An element that is
  // not on the screen right now is simply left out, so a card about
  // something that is not there just dims the whole screen.
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const PETEK_CELLS = '#fb-petek .ist-hive-cell[data-me], #fb-petek .ist-hive-cell[data-member-id], #fb-petek .ist-hive-cell[data-dir]';
  const sheetOf = (id) => $('#' + id + ':not([hidden]) .ist-sheet');
  const FOCUS = {
    petek:   () => [$$(PETEK_CELLS), [$('#fb-logo-btn')]],
    whole:   () => [[$('#fb-map')], [$('#fb-logo-btn')]],
    seat:    () => [[$('#fb-petek .ist-hive-cell-open[data-dir]')]],
    self:    () => [[$('#fb-petek .ist-hive-cell[data-me]')]],
    member:  () => [[$('#ist-pc-me')], [$('#fb-petek .ist-hive-picked')]],
    profile: () => [[sheetOf('profile-overlay')]],
    city:    () => [[$('#fb-evdrawer')]].concat($$('#fb-home-dots > *').map(d => [d])),
    games:   () => $$('#fb-home-games .fb-gbtn').map(b => [b]),
    event:   () => [[$('#fb-evdrawer') || $('#fb-evcard:not([hidden])')], $$(PETEK_CELLS)],
    agenda:  () => [[sheetOf('fb-plan-overlay') || $('#fb-evdrawer')]],
    plan:    () => [[sheetOf('fb-plan-overlay')]],
  };
  function focusFor(key) {
    if (key.indexOf('game.') === 0) {
      const inline = $('#fb-inline-game:not([hidden])');
      return [[inline || sheetOf('fb-game-overlay')]];
    }
    return FOCUS[key] ? FOCUS[key]() : [];
  }

  // ── State ──
  let sb = null, user = null, kefilName = '';
  let active = false;          // intros are on for this account
  let decided = false;         // maybeRun has finished deciding `active`
  let seen = new Set();        // keys already introduced
  let welcomePending = false;  // the next card carries WELCOME
  let hasColumn = true;        // profiles.intro_seen exists
  let dbCopy = {};             // admin overrides, keyed 'intro.<key>'
  const queue = [];            // [{ key, still }] waiting for the card
  let showing = null;          // the key on screen
  let root = null;

  function lang() {
    return global.I18N && I18N.isEnglish && I18N.isEnglish() ? 'en' : 'tr';
  }
  function localKey() { return user ? 'ist_intro_' + user.id : null; }
  function readLocal() {
    try {
      const raw = localStorage.getItem(localKey());
      if (raw == null) return null;
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return null; }
  }
  function writeLocal() {
    try { localStorage.setItem(localKey(), JSON.stringify(Array.from(seen))); } catch (e) { /* ignore */ }
  }
  // Best-effort, fire-and-forget: the server copy is what carries the
  // record to a second device. A database without the column simply
  // never hears it.
  function writeServer() {
    if (!hasColumn || !sb || !user) return;
    sb.from('profiles').update({ intro_seen: Array.from(seen) }).eq('id', user.id)
      .then(({ error }) => { if (error && error.code === '42703') hasColumn = false; },
            () => {});
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function copyFor(key, l) {
    const row = dbCopy['intro.' + key];
    const over = row && (l === 'en' ? row.body_en : row.body_tr);
    if (over) return over;
    return COPY[key] ? COPY[key][l] : '';
  }

  // ── The card ──
  const SVGNS = 'http://www.w3.org/2000/svg';
  const HOLE_PAD = 8;     // paper around what is shown, px
  const HOLE_R = 8;       // the hole's corner
  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.id = 'ist-intro';
    root.hidden = true;
    // The wash is one even-odd path: the screen, with a rounded hole
    // around each thing the card is about. Built with DOM calls (an SVG
    // fragment through innerHTML is parsed as HTML on WebKit).
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'ist-intro-wash');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('fill-rule', 'evenodd');
    svg.appendChild(path);
    root.appendChild(svg);
    const card = document.createElement('div');
    card.className = 'ist-intro-card ui-box ui-foot';
    card.setAttribute('role', 'dialog');
    card.innerHTML = `
        <div class="ist-intro-lead ui-label" hidden></div>
        <div class="ist-intro-body"></div>
        <div class="ist-intro-tap ui-label ui-quiet"></div>`;
    root.appendChild(card);
    document.body.appendChild(root);
    // One press anywhere puts it away. Nothing of the press reaches the
    // app underneath -- not even where a hole shows a button through the
    // wash: a drag that starts on it starts nothing, and the click that
    // ends the press is the dismissal.
    ['pointerdown', 'pointerup', 'touchstart', 'mousedown'].forEach(t => {
      root.addEventListener(t, (e) => { e.stopPropagation(); }, { passive: true });
    });
    root.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideCard();
    });
    document.addEventListener('keydown', (e) => {
      if (showing && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault(); hideCard();
      }
    }, true);
    return root;
  }

  // The rect around everything in one group, or null if none of it is on
  // the screen (hidden, faded right out, or of no size).
  function groupRect(els) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    (els || []).forEach(el => {
      if (!el || !el.isConnected) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return;
      const q = el.getBoundingClientRect();
      if (q.width < 1 || q.height < 1) return;
      x0 = Math.min(x0, q.left); y0 = Math.min(y0, q.top);
      x1 = Math.max(x1, q.right); y1 = Math.max(y1, q.bottom);
    });
    if (x0 === Infinity) return null;
    x0 = Math.max(0, x0 - HOLE_PAD); y0 = Math.max(0, y0 - HOLE_PAD);
    x1 = Math.min(innerWidth, x1 + HOLE_PAD); y1 = Math.min(innerHeight, y1 + HOLE_PAD);
    return (x1 - x0 > 1 && y1 - y0 > 1) ? { x0, y0, x1, y1 } : null;
  }
  function roundRect(q) {
    const R = Math.min(HOLE_R, (q.x1 - q.x0) / 2, (q.y1 - q.y0) / 2);
    return `M${q.x0 + R},${q.y0}H${q.x1 - R}A${R},${R} 0 0 1 ${q.x1},${q.y0 + R}` +
           `V${q.y1 - R}A${R},${R} 0 0 1 ${q.x1 - R},${q.y1}H${q.x0 + R}` +
           `A${R},${R} 0 0 1 ${q.x0},${q.y1 - R}V${q.y0 + R}A${R},${R} 0 0 1 ${q.x0 + R},${q.y0}Z`;
  }
  // Where the card stands: under the top bar, at the foot, or in the
  // middle -- whichever covers least of what it is about. A tie keeps it
  // where it was, so it does not jump about while the holes follow a
  // move (the game buttons stepping up, a drawer rising).
  let cardAt = 'top';
  function placeCard(holes) {
    const card = root.querySelector('.ist-intro-card');
    const H = innerHeight, h = card.offsetHeight;
    const bar = document.getElementById('ist-pc-mount');
    const top = Math.max(12, bar ? bar.getBoundingClientRect().bottom + 14 : 60);
    const spots = {
      top:    top,
      bottom: Math.max(top, H - h - 24),
      middle: Math.max(top, (H - h) / 2),
    };
    const cost = (y) => holes.reduce((n, q) =>
      n + Math.max(0, Math.min(q.y1, y + h) - Math.max(q.y0, y)) * (q.x1 - q.x0), 0);
    let best = cardAt, bestCost = cost(spots[cardAt]);
    ['top', 'bottom', 'middle'].forEach(k => {
      const c = cost(spots[k]);
      if (c < bestCost - 1) { best = k; bestCost = c; }
    });
    cardAt = best;
    card.style.top = Math.round(spots[best]) + 'px';
  }
  // While a card stands, the holes follow what they are cut around, every
  // frame: a stop settling, the game buttons stepping up, a sheet sliding
  // in. A handful of rects a frame costs nothing.
  let washRaf = 0;
  function paintWash() {
    washRaf = 0;
    if (!showing || !root) return;
    const W = innerWidth, H = innerHeight;
    const holes = focusFor(showing).map(groupRect).filter(Boolean);
    const svg = root.querySelector('.ist-intro-wash');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.querySelector('path').setAttribute('d',
      `M0,0H${W}V${H}H0Z` + holes.map(roundRect).join(''));
    placeCard(holes);
    washRaf = requestAnimationFrame(paintWash);
  }

  function showCard(key) {
    const el = ensureRoot();
    const l = lang();
    showing = key;
    const lead = el.querySelector('.ist-intro-lead');
    if (welcomePending) {
      welcomePending = false;
      const w = WELCOME[l];
      lead.textContent = w.lead + (kefilName ? ' ' + w.kefil.replace('{KEFIL}', kefilName) : '');
      lead.hidden = false;
    } else {
      lead.hidden = true;
    }
    const body = el.querySelector('.ist-intro-body');
    body.innerHTML = fillVars(copyFor(key, l), l).split(/\n\s*\n/)
      .map(p => `<p class="ui-body">${escapeHTML(p)}</p>`).join('');
    const card = el.querySelector('.ist-intro-card');
    // The document is lang="tr"; an English card says so, or CSS
    // uppercases its line the Turkish way ("TAP ANYWHERE TO CONTİNUE").
    card.setAttribute('lang', l);
    el.querySelector('.ist-intro-tap').textContent = TAP[l];
    // Seen the moment it is shown: a reader who closes the app with the
    // card up has still been told.
    seen.add(key);
    writeLocal();
    writeServer();
    el.hidden = false;
    el.classList.remove('show');
    cardAt = 'top';
    cancelAnimationFrame(washRaf);
    paintWash();
    void el.offsetWidth;
    el.classList.add('show');
  }

  function hideCard() {
    if (!root || !showing) return;
    showing = null;
    root.classList.remove('show');
    setTimeout(() => {
      if (showing) return;
      cancelAnimationFrame(washRaf); washRaf = 0;
      root.hidden = true;
      // The next one, if anything was reached while this one stood.
      setTimeout(pump, 120);
    }, 200);
  }

  // {games}: tonight's games, read off the buttons the card is about, so
  // the text names exactly what is lit.
  function fillVars(text, l) {
    if (text.indexOf('{games}') < 0) return text;
    const names = $$('#fb-home-games .fb-gbtn .nm').map(n => n.textContent.trim()).filter(Boolean);
    const games = names.length ? names.join(l === 'en' ? ' and ' : ' ve ')
                               : (l === 'en' ? 'two games' : 'iki oyun');
    return text.replace(/\{games\}/g, games);
  }

  function pump() {
    if (!active || showing) return;
    while (queue.length) {
      const next = queue.shift();
      if (seen.has(next.key)) continue;
      if (next.still && !safe(next.still)) continue;   // left it; not seen
      showCard(next.key);
      return;
    }
  }
  function safe(fn) { try { return !!fn(); } catch (e) { return false; } }

  // ── The one entry point project.html calls ──
  function first(key, opts) {
    if (!COPY[key]) return;
    if (decided && !active) return;
    if (seen.has(key) || showing === key) return;
    if (queue.some(q => q.key === key)) return;
    queue.push({ key, still: opts && opts.still });
    // A card asked for at the very moment of a press would come up under
    // the frame that press is still painting; a beat later reads better.
    if (decided) setTimeout(pump, 260);
  }

  // ── What is noticed here rather than in project.html ──
  // The petek's own buttons (profile-card.js) and the bar's own name.
  function wireNotices() {
    document.addEventListener('click', (e) => {
      if (!active || !e.target.closest) return;
      const cell = e.target.closest('.ist-hive-cell');
      if (cell) {
        // A free side of the reader's own hexagon: the code is minted and
        // printed in the seat. Wait for it to be there.
        if (cell.matches('.ist-hive-empty[data-dir]')) {
          const dir = cell.dataset.dir;
          first('seat', { still: () => {
            const c = document.querySelector(`.ist-hive-cell[data-dir="${dir}"]`);
            return c && c.classList.contains('ist-hive-cell-open');
          } });
          return;
        }
        if (cell.matches('[data-me]')) {
          first('self', { still: () => {
            const c = document.querySelector('.ist-hive-cell[data-me]');
            return c && c.classList.contains('ist-hive-cell-open');
          } });
        }
        return;
      }
      // The reader's own name on the top bar → their profile sheet (or,
      // with a member named there, that member's; only the first is ours).
      if (e.target.closest('#ist-pc-me')) {
        setTimeout(() => {
          if (global.IstSheet && IstSheet.isOpen && IstSheet.isOpen('profile-overlay')) {
            first('profile', { still: () => IstSheet.isOpen('profile-overlay') });
          }
        }, 450);
      }
    }, true);
    // A member pressed on the petek and named on the bar.
    document.addEventListener('ist-hive-pick', (e) => {
      if (!active) return;
      const d = e.detail;
      if (d && d.id && (!user || d.id !== String(user.id))) {
        first('member', { still: () => {
          const pc = global.IstProfileCard;
          return !pc || !pc.barMemberId || !!pc.barMemberId();
        } });
      }
    });
  }

  // ── Deciding ──
  let running = false;
  async function maybeRun(opts) {
    if (running) return false;
    running = true;
    sb = opts.sb; user = opts.user;
    let firstLaunch = false;
    try {
      if (!sb || !user) return false;
      // Admin kill switch. Missing row = on.
      const { data: setting } = await sb.from('app_settings')
        .select('value').eq('key', 'onboarding_enabled').maybeSingle();
      if (setting && setting.value === false) return false;

      let profile = null;
      let res = await sb.from('profiles')
        .select('onboarded_at, referred_by, intro_seen').eq('id', user.id).maybeSingle();
      if (res.error && res.error.code === '42703') {
        hasColumn = false;
        res = await sb.from('profiles')
          .select('onboarded_at, referred_by').eq('id', user.id).maybeSingle();
      }
      profile = res.data;
      if (!profile) return false;

      const local = readLocal();
      const server = hasColumn && Array.isArray(profile.intro_seen) ? profile.intro_seen : null;

      if (!profile.onboarded_at) {
        // A brand-new account. Mark it onboarded at once: there is no
        // "end" to reach any more, and the record of what has been seen
        // is what keeps the intros going on later launches.
        firstLaunch = true;
        active = true;
        welcomePending = true;
        const upd = {
          onboarded_at: new Date().toISOString(),
          // Never shown; admin-notification.js reads it (see CLAUDE.md).
          mascot: document.documentElement.getAttribute('data-palette') === 'earth' ? 'dog' : 'cat',
        };
        if (hasColumn) upd.intro_seen = [];
        sb.from('profiles').update(upd).eq('id', user.id).then(() => {}, () => {});
        if (profile.referred_by) {
          try {
            const { data: k } = await sb.from('profiles_public')
              .select('first_name').eq('id', profile.referred_by).maybeSingle();
            kefilName = (k && k.first_name) || '';
          } catch (e) { kefilName = ''; }
        }
      } else if (local || server) {
        active = true;
      }
      if (!active) { queue.length = 0; return false; }

      (local || []).forEach(k => seen.add(k));
      (server || []).forEach(k => seen.add(k));
      writeLocal();

      try {
        const { data: rows } = await sb.from('onboarding_copy').select('key, body_tr, body_en');
        (rows || []).forEach(r => { dbCopy[r.key] = r; });
      } catch (e) { dbCopy = {}; }

      wireNotices();
      return firstLaunch;
    } catch (e) {
      console.error('intros did not start', e);
      return firstLaunch;
    } finally {
      decided = true;
      if (!active) queue.length = 0;
      else setTimeout(pump, 400);
    }
  }

  global.IstOnboarding = {
    maybeRun,
    first,
    get active() { return active; },
    // The copy, for admin.html's editor to show the defaults.
    COPY,
  };
})(window);
