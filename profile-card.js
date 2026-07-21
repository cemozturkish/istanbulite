// ══════════════════════════════════════════════════════════════
// Shared profile UI: a compact mobile card (avatar + name + neighborhood +
// "Profil" button) plus a shared bottom-sheet overlay — the same slide-up
// card used for news/event details (anahane), games (kahvehane), and
// articles (kutuphane) — that houses three tabs: Profil (identity/account),
// Ayarlar (language/theme/color + sign out), Rozetler (badges).
//
// Included by anahane.html, kahvehane.html, and kutuphane.html.
//
// Usage:
//   IstProfileCard.mount({ sb, I18N, page });           // mobile compact card
//   IstProfileCard.mountLibraryCard({ sb, I18N });       // desktop identity card
//   IstProfileCard.openProfileOverlay({ sb, I18N, user, profile, ... });
// ══════════════════════════════════════════════════════════════
(function (global) {
  const NB_NAMES = {
    bakirkoy:'Bakırköy', bayrampasa:'Bayrampaşa', bahcelievler:'Bahçelievler',
    sisli:'Şişli', eyupsultan:'Eyüpsultan', gop:'Gaziosmanpaşa',
    esenler:'Esenler', bagcilar:'Bağcılar', basaksehir:'Başakşehir',
    kucukcekmece:'Küçükçekmece', sultangazi:'Sultangazi', uskudar:'Üsküdar',
    kadikoy:'Kadıköy', maltepe:'Maltepe', umraniye:'Ümraniye',
    cekmekoy:'Çekmeköy', beykoz:'Beykoz', sariyer:'Sarıyer',
    besiktas:'Beşiktaş', beyoglu:'Beyoğlu', gungoren:'Güngören',
    kagithane:'Kağıthane', atasehir:'Ataşehir', zeytinburnu:'Zeytinburnu',
    fatih:'Fatih', istanbul_disi:'İstanbul Dışı'
  };

  // Two-option toggles. Legacy `more_turkish` and `system` values are
  // remapped via normalize* below to their nearest neighbour.
  // palette_pref reuses the column written by onboarding.js: 'mono' = siyah-beyaz, 'earth' = kahverengi.
  const LANG_VALUES    = ['more_english', 'default'];   // 0: Daha İngilizce, 1: Daha Türkçe
  const THEME_VALUES   = ['light', 'dark'];             // 0: Açık,           1: Koyu
  const PALETTE_VALUES = ['mono', 'earth'];             // 0: Siyah-Beyaz,    1: Kahverengi
  const ADMIN_EMAIL = 'cemwozturk@gmail.com';

  function normalizeLang(v)    { return v === 'more_english' ? 'more_english' : 'default'; }
  function normalizeTheme(v)   { return v === 'dark' ? 'dark' : 'light'; }
  function normalizePalette(v) { return v === 'earth' ? 'earth' : 'mono'; }

  // Which Istanbul-local weekdays each game runs on (Monday=0 … Sunday=6),
  // driving the Profil tab's weekly grid. Purely a display concern here —
  // it does not gate access to the game pages (see game-locks.js for the
  // actual Tümcel-win-unlocks-Bulmaca rule).
  const GAME_SCHEDULE = [
    { id: 'sozcel',  label: 'Sözcel',  days: [0, 1, 2, 3, 4, 5, 6] },
    { id: 'tumcel',  label: 'Tümcel',  days: [0, 2, 4, 6] },
    { id: 'bulmaca', label: 'Bulmaca', days: [1, 3, 5] },
  ];

  // Preset avatars, shared between the profile-overlay picker and this
  // mobile widget. `requiresSozculCount` gates an option behind a lifetime
  // sözcü count.
  const AVATAR_OPTIONS = [
    { url: 'assets/avatar-long.png',  label: 'Uzun saç' },
    { url: 'assets/avatar-short.png', label: 'Kısa saç' },
    { url: 'assets/avatar-bald.png',  label: 'Saçsız' },
    { url: 'assets/avatar-sozcu.png', label: 'Sözcü', requiresSozculCount: 10 },
  ];

  // Cover badges (rozetler) — image stickers the user can place on the
  // Profil tab's cover, unlocked by matching their birth district
  // (profiles.birth_place). Add new badges here as new district stickers
  // are drawn; the picker/cover rendering below doesn't need to change.
  const BADGES = [
    { id: 'galata',    src: 'assets/galatakulesisticker.png', label: 'Galata Kulesi', district: 'beyoglu' },
    { id: 'kizkulesi', src: 'assets/kizkulesisticker.png',    label: 'Kız Kulesi',    district: 'uskudar' },
  ];

  // Colors are a viewer-side preference, not a property of the profile
  // owner: resolve avatar_url to the mono or brown file depending on the
  // *current visitor's* palette_pref (see palette.js avatarSrc).
  function avatarSrc(url) {
    return (global.Palette && global.Palette.avatarSrc) ? global.Palette.avatarSrc(url) : url;
  }

  const AVATAR_LOCK_SVG = '<span class="ist-avatar-lock" aria-hidden="true">'
    + '<svg viewBox="0 0 12 12" fill="currentColor">'
    + '<path d="M6 1.5a2.5 2.5 0 0 0-2.5 2.5V5.5h-.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5H8.5V4A2.5 2.5 0 0 0 6 1.5zm-1.5 4V4a1.5 1.5 0 1 1 3 0v1.5h-3z"/>'
    + '</svg></span>';

  // Gear icon for the profile/settings toggle — icon-only so the button
  // stays a small square regardless of the current language's label
  // length, and sits inline next to the avatar/name instead of pushing
  // onto its own line below them.
  const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<circle cx="12" cy="12" r="3"></circle>'
    + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
    + '</svg>';

  function buildAvatarPicker(currentAvatarUrl, sozculCount, opts) {
    opts = opts || {};
    const optionClass = opts.optionClass || 'ist-avatar-option';
    return AVATAR_OPTIONS.map(o => {
      const required = o.requiresSozculCount || 0;
      const locked = required > 0 && (sozculCount || 0) < required;
      const selected = currentAvatarUrl === o.url;
      const title = locked
        ? `${o.label} — ${required} kez Sözcü olmak gerekiyor (${sozculCount || 0}/${required})`
        : o.label;
      const cls = [optionClass];
      if (selected) cls.push('selected');
      if (locked)   cls.push('locked');
      return `
        <button type="button"
          class="${cls.join(' ')}"
          data-url="${o.url}"
          ${locked ? 'aria-disabled="true"' : ''}
          title="${title}"
          aria-label="${o.label}">
          <img src="${avatarSrc(o.url)}" alt="${o.label}">
          ${locked ? AVATAR_LOCK_SVG : ''}
        </button>
      `;
    }).join('');
  }

  function lookupAvatarOption(url) {
    return AVATAR_OPTIONS.find(o => o.url === url) || null;
  }

  function lockedAvatarMessage(opt, sozculCount) {
    const need = opt.requiresSozculCount;
    return `Bu avatar kilitli — ${need} kez Sözcü olmak gerekiyor (${sozculCount || 0}/${need}).`;
  }

  function buildBadgePicker(badges, placedIds, birthDistrict) {
    return badges.map(b => {
      const unlocked = !!birthDistrict && b.district === birthDistrict;
      const selected = placedIds.includes(b.id);
      const cls = ['ist-pc-badge-option'];
      if (selected) cls.push('selected');
      if (!unlocked) cls.push('locked');
      const title = unlocked
        ? b.label
        : `${b.label} — ${NB_NAMES[b.district] || b.district} doğumlular için kilitli`;
      return `
        <button type="button"
          class="${cls.join(' ')}"
          data-id="${b.id}"
          ${unlocked ? '' : 'aria-disabled="true"'}
          title="${esc(title)}"
          aria-label="${esc(b.label)}">
          <img src="${b.src}" alt="${esc(b.label)}">
          ${unlocked ? '' : AVATAR_LOCK_SVG}
          <span class="ist-pc-badge-label">${esc(b.label)}</span>
        </button>
      `;
    }).join('');
  }

  function capitalizeName(s) {
    if (!s) return '';
    return s.trim().split(/\s+/).map(w =>
      w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR') : ''
    ).join(' ');
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function formatLastSeen(dateStr, I18N) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    const en = I18N && I18N.isEnglish && I18N.isEnglish();
    if (diffMins < 1) return en ? 'Online now' : 'Şimdi çevrimiçi';
    if (diffMins < 60) return en ? `${diffMins}m ago` : `${diffMins} dk önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return en ? `${diffHours}h ago` : `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return en ? `${diffDays}d ago` : `${diffDays} gün önce`;
    return I18N.formatDate(d, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Read game scores from Supabase, aggregated per game. Currently unused —
  // the Oyun Skorları cards were pulled from the Profil tab (kept for now
  // in case they come back in some form) in favor of the weekly grid.
  async function getGameScores(sb, userId) {
    function currentStreakFor(winDates) {
      function seedForOffset(off) {
        const now = new Date();
        const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        ist.setDate(ist.getDate() - off);
        return `${ist.getFullYear()}-${ist.getMonth() + 1}-${ist.getDate()}`;
      }
      let streak = 0;
      let offset = winDates.has(seedForOffset(0)) ? 0 : 1;
      while (winDates.has(seedForOffset(offset))) { streak++; offset++; }
      return streak;
    }
    const empty = {
      bulmacaWins: 0, bulmacaPlayed: 0, bulmacaStreak: 0,
      sozcelWins: 0, sozcelPlayed: 0, sozcelStreak: 0,
      tumcelWins: 0, tumcelPlayed: 0, tumcelStreak: 0,
    };
    try {
      const { data, error } = await sb
        .from('game_results')
        .select('game, won, date')
        .eq('user_id', userId);
      if (error) throw error;
      const byGameDate = {};
      (data || []).forEach(r => {
        const key = r.game + '|' + r.date;
        if (!byGameDate[key]) byGameDate[key] = { game: r.game, date: r.date, won: false };
        if (r.won) byGameDate[key].won = true;
      });
      const agg = { ...empty };
      const winDatesByGame = { bulmaca: new Set(), sozcel: new Set(), tumcel: new Set() };
      Object.values(byGameDate).forEach(entry => {
        const g = entry.game;
        if (!(g in winDatesByGame)) return;
        agg[g + 'Played']++;
        if (entry.won) { agg[g + 'Wins']++; winDatesByGame[g].add(entry.date); }
      });
      agg.sozcelStreak = currentStreakFor(winDatesByGame.sozcel);
      agg.bulmacaStreak = currentStreakFor(winDatesByGame.bulmaca);
      agg.tumcelStreak = currentStreakFor(winDatesByGame.tumcel);
      return agg;
    } catch (e) {
      return empty;
    }
  }

  function scoresHTML(scores) {
    function detail(played, streak) {
      if (played === 0) return 'Henüz oynanmadı';
      if (streak && streak > 0) return streak + ' seri';
      return played + ' oyun';
    }
    return `
      <div class="ist-pc-scores">
        <div class="ist-pc-score-card">
          <div class="ist-pc-score-game">Bulmaca</div>
          <div class="ist-pc-score-value">${scores.bulmacaWins || 0}</div>
          <div class="ist-pc-score-detail">${detail(scores.bulmacaPlayed||0, scores.bulmacaStreak||0)}</div>
        </div>
        <div class="ist-pc-score-card">
          <div class="ist-pc-score-game">Sözcel</div>
          <div class="ist-pc-score-value">${scores.sozcelWins || 0}</div>
          <div class="ist-pc-score-detail">${detail(scores.sozcelPlayed||0, scores.sozcelStreak||0)}</div>
        </div>
        <div class="ist-pc-score-card">
          <div class="ist-pc-score-game">Tümcel</div>
          <div class="ist-pc-score-value">${scores.tumcelWins || 0}</div>
          <div class="ist-pc-score-detail">${detail(scores.tumcelPlayed||0, scores.tumcelStreak||0)}</div>
        </div>
      </div>
    `;
  }

  // Monday-first day index (0…6) of "now" in Istanbul time.
  function istWeekdayIdx(d) {
    const dow = d.getDay(); // 0=Sun…6=Sat
    return dow === 0 ? 6 : dow - 1;
  }

  // The 7 calendar dates (Monday…Sunday) of the current Istanbul week, each
  // as an unpadded "Y-M-D" key matching game_results.date (see
  // db/game_results.sql: "YYYY-M-D Istanbul-local", no zero-padding).
  function weekDatesIst() {
    const nowIst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const monday = new Date(nowIst.getFullYear(), nowIst.getMonth(), nowIst.getDate() - istWeekdayIdx(nowIst));
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      out.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
    }
    return out;
  }

  // Fetches this user's game_results for the current Istanbul week and
  // reduces them to per (game, date) played/won flags for the weekly grid.
  async function getWeekGameStatus(sb, userId) {
    const dateKeys = weekDatesIst();
    const empty = { dateKeys, played: new Set(), won: new Set() };
    try {
      const { data, error } = await sb
        .from('game_results')
        .select('game, date, won')
        .eq('user_id', userId)
        .in('date', dateKeys);
      if (error) throw error;
      (data || []).forEach(r => {
        const k = r.game + '|' + r.date;
        empty.played.add(k);
        if (r.won) empty.won.add(k);
      });
      return empty;
    } catch (e) {
      return empty;
    }
  }

  // Renders the 3-game × 7-day grid: white = day hasn't arrived yet, grey =
  // arrived but not played, yellow = played without winning, green = won.
  // Days outside a given game's own schedule (GAME_SCHEDULE) render as a
  // muted dashed cell instead of a color, since the game has nothing to
  // show there.
  function weekGridHTML(status, I18N) {
    const en = I18N && I18N.isEnglish && I18N.isEnglish();
    const dayLetters = en ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
    const dayNames = en
      ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      : ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const todayIdx = istWeekdayIdx(new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul' })));

    const header = `
      <div class="ist-pc-weekgrid-header">
        <span class="ist-pc-weekgrid-label-spacer"></span>
        <div class="ist-pc-weekgrid-days">
          ${dayLetters.map(l => `<span>${l}</span>`).join('')}
        </div>
      </div>
    `;

    const rows = GAME_SCHEDULE.map(game => {
      const cells = status.dateKeys.map((dateKey, i) => {
        let state, title;
        if (!game.days.includes(i)) {
          state = 'inactive';
          title = `${game.label} — ${dayNames[i]}`;
        } else if (i > todayIdx) {
          state = 'future';
          title = `${game.label} — ${dayNames[i]}`;
        } else {
          const k = game.id + '|' + dateKey;
          if (status.won.has(k)) { state = 'win'; title = `${game.label} — ${dayNames[i]}: kazandı`; }
          else if (status.played.has(k)) { state = 'played'; title = `${game.label} — ${dayNames[i]}: oynadı, kazanamadı`; }
          else { state = 'none'; title = `${game.label} — ${dayNames[i]}: oynamadı`; }
        }
        return `<span class="ist-pc-daycell ist-pc-daycell-${state}" title="${esc(title)}"></span>`;
      }).join('');
      return `
        <div class="ist-pc-weekgrid-row">
          <span class="ist-pc-weekgrid-label">${esc(game.label)}</span>
          <div class="ist-pc-weekgrid-cells">${cells}</div>
        </div>
      `;
    }).join('');

    return `<div class="ist-pc-weekgrid">${header}${rows}</div>`;
  }

  // Wires a range input to its tick labels: clicking a tick jumps the
  // slider, dragging the slider highlights the nearest tick.
  function syncTicks(sliderId, ticksId) {
    const slider = document.getElementById(sliderId);
    const ticks = document.getElementById(ticksId);
    if (!slider || !ticks) return;
    const update = () => {
      const v = parseInt(slider.value, 10);
      ticks.querySelectorAll('span').forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.idx, 10) === v);
      });
    };
    slider.addEventListener('input', update);
    ticks.querySelectorAll('span').forEach(s => {
      s.addEventListener('click', () => {
        slider.value = s.dataset.idx;
        slider.dispatchEvent(new Event('input'));
      });
    });
    update();
  }

  // Module-level state so a page can call setPage() to re-render the card
  // for a new page context (e.g. after a client-side navigation) without
  // re-fetching from Supabase. `_state` holds everything fetched once;
  // `_resizeListener` is tracked so unmount() can remove it instead of
  // leaking one more registration per mount() call.
  let _mounted = false;
  let _state = null;
  let _resizeListener = null;

  async function mount(opts) {
    const sb = opts.sb;
    const I18N = opts.I18N;
    const page = opts.page || 'anahane'; // 'anahane' | 'kahvehane' | 'kutuphane'
    const container = document.getElementById('ist-pc-mount');
    if (!container || !sb) return;

    // Already mounted this session (e.g. a router re-invoking mount on a
    // virtual navigation) — just re-render for the new page, no re-fetch.
    if (_mounted) { setPage(page); return; }

    // Only show on mobile — bail early on desktop to save Supabase calls.
    if (window.innerWidth > 768) {
      let resolved = false;
      _resizeListener = () => {
        if (!resolved && window.innerWidth <= 768) {
          resolved = true;
          window.removeEventListener('resize', _resizeListener);
          _resizeListener = null;
          doMount();
        }
      };
      window.addEventListener('resize', _resizeListener);
      return;
    }
    doMount();

    async function doMount() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const user = session.user;
      container.innerHTML = `<div class="ist-pc"><div class="ist-pc-loading"><span>Yükleniyor…</span></div></div>`;
      _state = await fetchProfileData(sb, I18N, user);
      _mounted = true;
      renderPage(container, page, _state);
    }
  }

  function setPage(page) {
    const container = document.getElementById('ist-pc-mount');
    if (!container || !_state) return;
    renderPage(container, page, _state);
  }

  function unmount() {
    if (_resizeListener) { window.removeEventListener('resize', _resizeListener); _resizeListener = null; }
    _mounted = false;
    _state = null;
  }

  function istanbulTodayISO() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fetches everything the card/overlay needs exactly once per session.
  // `avatarUrl` is carried on the returned object (not recomputed on later
  // renders) because avatar picks mutate it in place so a later setPage()
  // call still reflects a just-picked avatar without re-fetching.
  async function fetchProfileData(sb, I18N, user) {
    const today = istanbulTodayISO();

    const [{ data: profile }, { count: kefaletCount }, { count: sozculCount }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).single(),
      sb.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id),
      sb.from('sozcel_sozcul_assignments').select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('game_date', today),
    ]);

    let kefilOfUser = null;
    if (profile && profile.referred_by) {
      const { data: kp } = await sb
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', profile.referred_by)
        .maybeSingle();
      if (kp) kefilOfUser = kp;
    }

    const palettePref = normalizePalette(profile?.palette_pref);
    // Apply the freshly-fetched DB value now, synchronously, so the
    // avatar (and everything else gated on Palette.current) renders in
    // the right colors immediately instead of racing the slower
    // Palette.syncFromSupabase call some pages also make on load.
    if (global.Palette) global.Palette.setPalette(palettePref);

    return {
      sb, I18N, user, profile, kefaletCount, sozculCount, kefilOfUser,
      avatarUrl: profile?.avatar_url || null,
    };
  }

  // Renders the compact card into `container` for the given `page` context,
  // using already-fetched `state`. Callable repeatedly (via setPage) without
  // hitting Supabase again — only mount()'s first call ever fetches.
  // Every page gets the same single "Profil" button, opening the shared
  // bottom-sheet overlay (see openProfileOverlay below) — the actual
  // editing/settings/badges UI no longer lives in this compact card.
  function renderPage(container, page, state) {
    const { I18N, user, profile, kefaletCount, sozculCount, kefilOfUser } = state;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
    const yasadigi = profile?.neighborhood || '';
    let avatarUrl = state.avatarUrl;

    const yasadigiDisplay = yasadigi ? (NB_NAMES[yasadigi] || yasadigi) : '—';
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const toggleLabel = t('profile.toggle') || 'Profil';

    function avatarHTML() {
      return avatarUrl
        ? `<img src="${esc(avatarSrc(avatarUrl))}" alt="">`
        : esc(displayName.charAt(0).toUpperCase());
    }

    container.innerHTML = `
      <div class="ist-pc" id="ist-pc-root">
        <div class="ist-pc-row">
          <div class="ist-pc-avatar" id="ist-pc-avatar">${avatarHTML()}</div>
          <div class="ist-pc-id">
            <div class="ist-pc-name">${esc(displayName)}</div>
            <div class="ist-pc-meta">${esc(yasadigiDisplay)}</div>
          </div>
          <button type="button" class="ist-pc-toggle" id="ist-pc-toggle" aria-label="${esc(toggleLabel)}" title="${esc(toggleLabel)}">${GEAR_SVG}</button>
        </div>
      </div>
    `;

    document.getElementById('ist-pc-toggle').addEventListener('click', () => {
      openProfileOverlay({
        sb: state.sb, I18N, user, profile,
        sozculCount, kefaletCount, kefilOfUser,
        avatarUrl: state.avatarUrl,
        defaultTab: 'profil',
        onAvatarChange(url) {
          state.avatarUrl = url;
          avatarUrl = url;
          const av = document.getElementById('ist-pc-avatar');
          if (av) av.innerHTML = avatarHTML();
        },
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Shared bottom-sheet profile overlay: Profil / Ayarlar / Rozetler tabs.
  // Mirrors the game-overlay (kahvehane) / reader-overlay (kutuphane) /
  // detail-overlay (anahane) bottom sheets — same markup shape, same
  // slide-up transition, same shared frames.css card treatment — so
  // opening your profile reads as the same kind of surface as opening a
  // news item, an event, an article, or a game.
  //
  // Injected into <body> lazily (once) so every page that loads this
  // script gets it without needing its own overlay markup.
  // ══════════════════════════════════════════════════════════════
  let _ov = null; // { sb, I18N, user, profile, sozculCount, kefaletCount, kefilOfUser, avatarUrl, activeTab, onAvatarChange }

  function ensureProfileOverlay() {
    if (document.getElementById('profile-overlay')) return;
    const el = document.createElement('div');
    el.className = 'profile-overlay';
    el.id = 'profile-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="profile-overlay-backdrop" id="profile-overlay-backdrop"></div>
      <div class="profile-overlay-sheet" id="profile-overlay-sheet">
        <button type="button" class="profile-overlay-close" id="profile-overlay-close" aria-label="Kapat" title="Kapat"><img class="close-icon" src="assets/cross.png" alt=""></button>
        <div class="profile-overlay-tabs" id="profile-overlay-tabs"></div>
        <div class="profile-overlay-body" id="profile-overlay-body"></div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('profile-overlay-backdrop').addEventListener('click', closeProfileOverlay);
    document.getElementById('profile-overlay-close').addEventListener('click', closeProfileOverlay);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.classList.contains('open')) closeProfileOverlay();
    });
    document.getElementById('profile-overlay-tabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.profile-overlay-tab');
      if (btn) setActiveTab(btn.dataset.tab);
    });
  }

  // On mobile, the sheet rises from just below the compact #ist-pc-mount
  // card (same convention as kahvehane's game-overlay / kutuphane's
  // reader-overlay) rather than clearing the whole viewport — measured
  // live since the mount card's height varies with its content.
  function positionProfileSheet() {
    const sheet = document.getElementById('profile-overlay-sheet');
    if (!sheet) return;
    if (!window.matchMedia('(max-width: 768px)').matches) { sheet.style.top = ''; return; }
    const framePad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-pad')) || 10;
    const pcMount = document.getElementById('ist-pc-mount');
    const cardBottom = pcMount ? pcMount.getBoundingClientRect().bottom : 0;
    sheet.style.top = `${Math.max(cardBottom, 0) + framePad}px`;
  }

  let _ovResizeListener = null;

  function openProfileOverlay(opts) {
    ensureProfileOverlay();
    _ov = Object.assign({ sozculCount: 0, kefaletCount: 0, kefilOfUser: null }, opts);
    if (_ov.avatarUrl === undefined) _ov.avatarUrl = _ov.profile?.avatar_url || null;
    setActiveTab(opts.defaultTab || 'profil');
    const overlay = document.getElementById('profile-overlay');
    positionProfileSheet();
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
    if (!_ovResizeListener) {
      _ovResizeListener = () => {
        const ov = document.getElementById('profile-overlay');
        if (ov && ov.classList.contains('open')) positionProfileSheet();
      };
      window.addEventListener('resize', _ovResizeListener);
    }
  }

  function closeProfileOverlay() {
    const overlay = document.getElementById('profile-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    // Matches the sheet's own 0.55s transition (see profile-card.css)
    // so hiding doesn't cut the closing slide-down short.
    setTimeout(() => { overlay.hidden = true; }, 550);
  }

  function setActiveTab(tab) {
    if (!_ov) return;
    _ov.activeTab = tab;
    const t = (k) => (_ov.I18N && _ov.I18N.t) ? _ov.I18N.t(k) : k;
    const tabs = [
      { id: 'profil',    label: t('profile.tab.profil') },
      { id: 'ayarlar',   label: t('profile.tab.ayarlar') },
      { id: 'rozetler',  label: t('profile.tab.rozetler') },
    ];
    document.getElementById('profile-overlay-tabs').innerHTML = tabs.map(tb => `
      <button type="button" class="profile-overlay-tab${tb.id === tab ? ' active' : ''}" data-tab="${tb.id}">${esc(tb.label)}</button>
    `).join('');
    renderOverlayBody();
  }

  function renderOverlayBody() {
    const body = document.getElementById('profile-overlay-body');
    if (!body || !_ov) return;
    if (_ov.activeTab === 'ayarlar') body.innerHTML = ayarlarTabHTML(_ov);
    else if (_ov.activeTab === 'rozetler') body.innerHTML = rozetlerTabHTML(_ov);
    else body.innerHTML = profilTabHTML(_ov);
    wireTabEvents(_ov.activeTab, _ov);
  }

  function coverAvatarHTML(avatarUrl, displayName) {
    return avatarUrl
      ? `<img src="${esc(avatarSrc(avatarUrl))}" alt="">`
      : esc(displayName.charAt(0).toUpperCase());
  }

  // Profil tab: a white "pano" cover — the avatar sits on it like a Twitter
  // cover photo, and any rozetler (badges) picked in the Rozetler tab (see
  // rozetlerTabHTML/toggleCoverBadge) are pinned to its corners — plus the
  // weekly game grid and the lifetime score cards. No editable fields here:
  // account info and personalization all live in the Ayarlar tab now (see
  // ayarlarTabHTML).
  function profilTabHTML(state) {
    const { I18N, user, profile, avatarUrl } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
    const yasadigiIlce = profile?.neighborhood || '';
    const yasadigiDisplay = yasadigiIlce ? (NB_NAMES[yasadigiIlce] || yasadigiIlce) : '—';

    const placedIds = profile?.cover_badges || [];
    const placedBadges = BADGES.filter(b => placedIds.includes(b.id));

    return `
      <div class="ist-pc-cover">
        ${placedBadges.map((b, i) => `<img class="ist-pc-cover-badge ist-pc-cover-badge-${i % 4}" src="${b.src}" alt="${esc(b.label)}" title="${esc(b.label)}">`).join('')}
        <div class="ist-pc-cover-avatar">${coverAvatarHTML(avatarUrl, displayName)}</div>
        <div class="ist-pc-cover-name">${esc(displayName)}</div>
        <div class="ist-pc-cover-meta">${esc(yasadigiDisplay)}</div>
      </div>

      <div class="ist-pc-section-title">${esc(t('profile.thisweek'))}</div>
      <div id="po-weekgrid-mount"></div>
    `;
  }

  // Ayarlar tab: everything about the account (avatar, name, district,
  // birthplace, membership/kefil info) plus personalization (language,
  // color palette, appearance) and sign out — moved here from Profil so
  // that tab is just identity + games.
  function ayarlarTabHTML(state) {
    const { I18N, user, profile, sozculCount, kefaletCount, kefilOfUser, avatarUrl } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const yasadigiIlce = profile?.neighborhood || '';
    const dogumYeri = profile?.birth_place || '';
    const phone = profile?.phone || '';
    const referralCode = profile?.referral_code || '';
    const languagePref = normalizeLang(profile?.language_pref);
    const themePref = normalizeTheme(profile?.theme_pref);
    const palettePref = normalizePalette(profile?.palette_pref);

    const yasadigiDisplay = yasadigiIlce ? (NB_NAMES[yasadigiIlce] || yasadigiIlce) : '—';
    const dogumDisplay = dogumYeri ? (NB_NAMES[dogumYeri] || dogumYeri) : '—';
    const joinedDate = I18N.formatDate(user.created_at, { year: 'numeric', month: 'long', day: 'numeric' });
    const lastSeenText = formatLastSeen(user.last_sign_in_at, I18N);
    const kefilLabel = kefilOfUser
      ? esc(capitalizeName(`${kefilOfUser.first_name||''} ${kefilOfUser.last_name||''}`.trim()) || t('profile.unnamed'))
      : '';

    return `
      <div class="ist-pc-section-title">${esc(t('profile.profileinfo'))}</div>
      <div class="ist-pc-avatar-field">
        <div class="ist-pc-label">${esc(t('profile.chooseavatar'))}</div>
        <div class="ist-pc-avatar-picker" id="po-avatar-picker">${buildAvatarPicker(avatarUrl, sozculCount)}</div>
        <div class="ist-pc-avatar-msg" id="po-avatar-msg" role="status" aria-live="polite"></div>
      </div>

      <!-- Ad, soyad and district are not user-editable for now (protect_profile_columns
           already reverted district for non-admins; name/lastname are locked here too
           until an editing flow is decided) — shown read-only, all on one line. -->
      <div class="ist-pc-info-line">
        <div class="ist-pc-info-line-cell">
          <div class="ist-pc-label">${esc(t('profile.firstname'))}</div>
          <div class="ist-pc-display">${esc(firstName || '—')}</div>
        </div>
        <div class="ist-pc-info-line-cell">
          <div class="ist-pc-label">${esc(t('profile.lastname'))}</div>
          <div class="ist-pc-display">${esc(lastName || '—')}</div>
        </div>
        <div class="ist-pc-info-line-cell">
          <div class="ist-pc-label">${esc(t('profile.district'))}</div>
          <div class="ist-pc-display">${esc(yasadigiDisplay)}</div>
        </div>
        <div class="ist-pc-info-line-cell">
          <div class="ist-pc-label">${esc(t('profile.birthplace'))}</div>
          <div class="ist-pc-display">${esc(dogumDisplay)}</div>
        </div>
      </div>

      <div class="ist-pc-two-col">
        <div class="ist-pc-col">
          <div class="ist-pc-section-title">${esc(t('profile.account'))}</div>
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.email'))}</div>
            <div class="ist-pc-info-value">${esc(user.email)}</div>
          </div>
          ${phone ? `
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.phone') || 'Telefon')}</div>
            <div class="ist-pc-info-value">${esc(phone)}</div>
          </div>` : ''}
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.membership'))}</div>
            <div class="ist-pc-info-value">${esc(joinedDate)}</div>
          </div>
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.lastseen'))}</div>
            <div class="ist-pc-info-value">${esc(lastSeenText)}</div>
          </div>
          ${kefilOfUser ? `
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.kefil'))}</div>
            <div class="ist-pc-info-value">${kefilLabel}</div>
          </div>` : ''}
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.sponsoredcount'))}</div>
            <div class="ist-pc-info-value">${kefaletCount ?? 0} ${esc(t('profile.people'))}</div>
          </div>
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.sozculcount'))}</div>
            <div class="ist-pc-info-value">${sozculCount ?? 0} ${esc(t('profile.times'))}</div>
          </div>
          ${referralCode ? `
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.referralcode'))}</div>
            <div class="ist-pc-info-value">
              <span class="ist-pc-code">${esc(referralCode)}</span>
              <button type="button" class="ist-pc-copy" id="po-copy">${esc(t('profile.copy'))}</button>
            </div>
          </div>` : ''}
        </div>

        <div class="ist-pc-col">
          <div class="ist-pc-section-title">${esc(t('profile.tab.ayarlar'))}</div>
          <div class="ist-pc-field">
            <div class="ist-pc-label">${esc(t('profile.langpref'))}</div>
            <input class="ist-pc-slider" id="po-language" type="range" min="0" max="1" step="1" value="${LANG_VALUES.indexOf(languagePref)}">
            <div class="ist-pc-ticks" id="po-language-ticks">
              <span data-idx="0">Daha İngilizce</span>
              <span data-idx="1">Daha Türkçe</span>
            </div>
          </div>
          <div class="ist-pc-field">
            <div class="ist-pc-label">${esc(t('profile.colortheme'))}</div>
            <input class="ist-pc-slider" id="po-palette" type="range" min="0" max="1" step="1" value="${PALETTE_VALUES.indexOf(palettePref)}">
            <div class="ist-pc-ticks" id="po-palette-ticks">
              <span data-idx="0">Siyah-Beyaz</span>
              <span data-idx="1">Kahverengi</span>
            </div>
          </div>
          <div class="ist-pc-field">
            <div class="ist-pc-label">${esc(t('profile.appearance'))}</div>
            <input class="ist-pc-slider" id="po-theme" type="range" min="0" max="1" step="1" value="${THEME_VALUES.indexOf(themePref)}">
            <div class="ist-pc-ticks" id="po-theme-ticks">
              <span data-idx="0">Açık</span>
              <span data-idx="1">Koyu</span>
            </div>
          </div>
          <div class="ist-pc-actions">
            <button type="button" class="ist-pc-save" id="po-save">${esc(t('profile.save'))}</button>
          </div>
          <div class="ist-pc-msg" id="po-save-msg"></div>
        </div>
      </div>

      <button type="button" class="ist-pc-signout" id="po-signout">${esc(t('profile.signout'))}</button>
    `;
  }

  // Rozetler tab: a picker grid of district-locked badge stickers. Clicking
  // an unlocked one toggles it onto the Profil tab's cover (see
  // profilTabHTML) and saves immediately — same immediate-save pattern as
  // the avatar picker, no separate Kaydet button.
  function rozetlerTabHTML(state) {
    const { I18N, profile } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const birthDistrict = profile?.birth_place || '';
    const placedIds = profile?.cover_badges || [];
    return `
      <div class="ist-pc-section-title">${esc(t('profile.tab.rozetler'))}</div>
      <div class="ist-pc-badge-hint">${esc(t('profile.rozetler.hint'))}</div>
      <div class="ist-pc-badge-grid" id="po-badge-grid">${buildBadgePicker(BADGES, placedIds, birthDistrict)}</div>
      <div class="ist-pc-badge-msg" id="po-badge-msg" role="status" aria-live="polite"></div>
    `;
  }

  function wireTabEvents(tab, state) {
    const { sb, I18N, user } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;

    if (tab === 'profil') {
      getWeekGameStatus(sb, user.id).then(status => {
        const m = document.getElementById('po-weekgrid-mount');
        if (m) m.innerHTML = weekGridHTML(status, I18N);
      });
    } else if (tab === 'ayarlar') {
      document.querySelectorAll('#po-avatar-picker .ist-avatar-option').forEach(btn => {
        btn.addEventListener('click', () => pickOverlayAvatar(btn.dataset.url, state));
      });
      document.getElementById('po-save').addEventListener('click', () => saveAyarlar(state));
      const copyBtn = document.getElementById('po-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(state.profile?.referral_code || '');
          const orig = copyBtn.textContent;
          copyBtn.textContent = t('profile.copied');
          setTimeout(() => { copyBtn.textContent = orig; }, 1500);
        });
      }
      syncTicks('po-language', 'po-language-ticks');
      syncTicks('po-palette', 'po-palette-ticks');
      syncTicks('po-theme', 'po-theme-ticks');
      document.getElementById('po-signout').addEventListener('click', async () => {
        await sb.auth.signOut();
        window.location.href = 'index.html';
      });
    } else if (tab === 'rozetler') {
      document.querySelectorAll('#po-badge-grid .ist-pc-badge-option').forEach(btn => {
        btn.addEventListener('click', () => toggleCoverBadge(btn.dataset.id, state));
      });
    }
  }

  // Saves the Ayarlar tab's only editable fields — language/palette/
  // appearance. Ad/Soyad/Yaşadığı İlçe are read-only for now (see the
  // comment in ayarlarTabHTML), so there's nothing else to send.
  async function saveAyarlar(state) {
    const { sb, I18N, user } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const msgEl = document.getElementById('po-save-msg');
    const btn = document.getElementById('po-save');
    const newLang = LANG_VALUES[parseInt(document.getElementById('po-language').value, 10)] || 'default';
    const newTheme = THEME_VALUES[parseInt(document.getElementById('po-theme').value, 10)] || 'light';
    const newPalette = PALETTE_VALUES[parseInt(document.getElementById('po-palette').value, 10)] || 'mono';

    const payload = {
      language_pref: newLang,
      theme_pref: newTheme,
      palette_pref: newPalette,
    };

    btn.textContent = t('profile.saving');
    btn.disabled = true;
    msgEl.textContent = '';

    try {
      const { data, error } = await sb.from('profiles').update(payload).eq('id', user.id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.');
      // Cache the new palette locally so the reload starts in the right
      // colors instead of flashing the old palette.
      if (global.Palette) global.Palette.setPalette(newPalette);
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      btn.textContent = t('profile.save');
      btn.disabled = false;
      msgEl.textContent = (err && err.message) || 'Kaydedilemedi.';
      msgEl.style.color = 'var(--accent)';
    }
  }

  let _ovAvatarMsgTimer = null;
  function showOverlayAvatarMsg(text) {
    const el = document.getElementById('po-avatar-msg');
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(_ovAvatarMsgTimer);
    _ovAvatarMsgTimer = setTimeout(() => el.classList.remove('show'), 5000);
  }

  async function pickOverlayAvatar(url, state) {
    const { sb, user, sozculCount } = state;
    if (!url || url === state.avatarUrl) return;
    const opt = lookupAvatarOption(url);
    if (opt?.requiresSozculCount && (sozculCount || 0) < opt.requiresSozculCount) {
      showOverlayAvatarMsg(lockedAvatarMessage(opt, sozculCount));
      return;
    }
    const { data, error } = await sb.from('profiles').update({ avatar_url: url }).eq('id', user.id).select('id');
    if (error) { showOverlayAvatarMsg('Avatar kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showOverlayAvatarMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }
    state.avatarUrl = url;
    document.querySelectorAll('#po-avatar-picker .ist-avatar-option').forEach(b => {
      b.classList.toggle('selected', b.dataset.url === url);
    });
    if (typeof state.onAvatarChange === 'function') state.onAvatarChange(url);
  }

  let _badgeMsgTimer = null;
  function showBadgeMsg(text) {
    const el = document.getElementById('po-badge-msg');
    if (!el) return;
    el.textContent = text;
    clearTimeout(_badgeMsgTimer);
    _badgeMsgTimer = setTimeout(() => { el.textContent = ''; }, 4000);
  }

  // Toggles a badge on/off the cover and saves straight to Supabase (no
  // separate Kaydet button, same immediate-save pattern as the avatar
  // picker). Mutates `state.profile.cover_badges` in place rather than
  // reassigning `state.profile` — every call site (mobile card, desktop
  // library card, kutuphane's own profile fetch) hands this overlay the
  // *same* profile object, so the mutation is visible everywhere without
  // extra plumbing, mirroring how avatar picks rely on onAvatarChange.
  async function toggleCoverBadge(id, state) {
    const { sb, user, profile } = state;
    const badge = BADGES.find(b => b.id === id);
    if (!badge) return;
    const birthDistrict = profile?.birth_place || '';
    if (badge.district !== birthDistrict) return;

    const current = profile?.cover_badges || [];
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];

    const { data, error } = await sb.from('profiles').update({ cover_badges: next }).eq('id', user.id).select('id');
    if (error) { showBadgeMsg('Rozet kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showBadgeMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }

    if (profile) profile.cover_badges = next;
    renderOverlayBody();
  }

  // ══════════════════════════════════════════════════════════════
  // Shared desktop identity card: avatar, name, neighborhood, "Profil"
  // button — opens the same bottom-sheet overlay used everywhere else.
  // Mirrors kütüphane.html's own top-of-col-left `.library-card` (kept
  // local there — see the comment above .library-card in profile-card.css).
  // Desktop-only; each page hides #library-card on mobile in its own
  // <768px query since #ist-pc-mount already covers that.
  //
  // Usage: IstProfileCard.mountLibraryCard({ sb, I18N });
  // Assumes a <div id="library-card"> exists in the page.
  // ══════════════════════════════════════════════════════════════
  async function mountLibraryCard(opts) {
    const sb = opts.sb;
    const I18N = opts.I18N;
    const cardEl = opts.mountEl || document.getElementById('library-card');
    if (!cardEl || !sb) return;

    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    const user = session.user;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;

    const state = await fetchProfileData(sb, I18N, user);
    const { profile, kefaletCount, sozculCount, kefilOfUser } = state;

    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
    const yasadigiIlce = profile?.neighborhood || '';

    function avatarDisplayHTML() {
      return state.avatarUrl
        ? `<img src="${esc(avatarSrc(state.avatarUrl))}" alt="">`
        : esc(displayName.charAt(0).toUpperCase());
    }

    const yasadigiDisplay = yasadigiIlce ? (NB_NAMES[yasadigiIlce] || yasadigiIlce) : '—';

    function renderView() {
      cardEl.innerHTML = `
        <div class="card-top">
          <div class="avatar" id="lc-avatar-display">${avatarDisplayHTML()}</div>
          <div class="card-id">
            <div class="card-name">${esc(displayName)}</div>
            <div class="card-meta">${esc(yasadigiDisplay)}</div>
          </div>
          <button type="button" class="edit-btn" id="lc-edit-btn" aria-label="${esc(t('profile.toggle'))}" title="${esc(t('profile.toggle'))}">${GEAR_SVG}</button>
        </div>
      `;
      document.getElementById('lc-edit-btn').addEventListener('click', () => {
        openProfileOverlay({
          sb, I18N, user, profile,
          sozculCount, kefaletCount, kefilOfUser,
          avatarUrl: state.avatarUrl,
          defaultTab: 'profil',
          onAvatarChange(url) {
            state.avatarUrl = url;
            const av = document.getElementById('lc-avatar-display');
            if (av) av.innerHTML = avatarDisplayHTML();
          },
        });
      });
    }

    renderView();
  }

  global.IstProfileCard = {
    mount,
    setPage,
    unmount,
    mountLibraryCard,
    openProfileOverlay,
    closeProfileOverlay,
    AVATAR_OPTIONS,
    AVATAR_LOCK_SVG,
    GEAR_SVG,
    buildAvatarPicker,
    lookupAvatarOption,
    lockedAvatarMessage,
  };
}(window));
