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
      tr: 'Burası oyunlar. Her gece yarısı yeni oyunlar gelir — Sözcel, Tümcel, Çengel, Güncel; her gece ikisi.\n\nPeteğindekilerin sonuçları altıgenlerinde görünür. Günün skorları da İstanbulite’in Instagram hesabından paylaşılıyor.',
      en: 'These are the games. New ones every midnight — Sözcel, Tümcel, Çengel, Güncel; two each night.\n\nYour petek’s results show on their hexagons. The day’s scores are also shared on Istanbulite’s Instagram account.',
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
  const OK = { tr: 'TAMAM', en: 'GOT IT' };

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
  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.createElement('div');
    root.id = 'ist-intro';
    root.hidden = true;
    root.innerHTML = `
      <div class="ist-intro-wash"></div>
      <div class="ist-intro-card ui-box ui-foot" role="dialog" aria-modal="false">
        <div class="ist-intro-lead ui-label" hidden></div>
        <div class="ist-intro-body"></div>
        <button type="button" class="ui-btn ui-small ist-intro-ok"></button>
      </div>`;
    document.body.appendChild(root);
    // One press anywhere puts it away. Nothing of the press reaches the
    // app underneath: a drag that starts on the wash starts nothing, and
    // the click that ends the press is the dismissal.
    ['pointerdown', 'pointerup', 'touchstart', 'mousedown'].forEach(t => {
      root.addEventListener(t, (e) => { e.stopPropagation(); }, { passive: true });
    });
    root.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      hideCard();
    });
    document.addEventListener('keydown', (e) => {
      if (showing && (e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); hideCard(); }
    }, true);
    return root;
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
    body.innerHTML = copyFor(key, l).split(/\n\s*\n/)
      .map(p => `<p class="ui-body">${escapeHTML(p)}</p>`).join('');
    const card = el.querySelector('.ist-intro-card');
    // The document is lang="tr"; an English card says so, or CSS
    // uppercases the button the Turkish way ("GOT İT").
    card.setAttribute('lang', l);
    el.querySelector('.ist-intro-ok').textContent = OK[l];
    // Seen the moment it is shown: a reader who closes the app with the
    // card up has still been told.
    seen.add(key);
    writeLocal();
    writeServer();
    el.hidden = false;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function hideCard() {
    if (!root || !showing) return;
    showing = null;
    root.classList.remove('show');
    setTimeout(() => {
      if (showing) return;
      root.hidden = true;
      // The next one, if anything was reached while this one stood.
      setTimeout(pump, 120);
    }, 180);
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
