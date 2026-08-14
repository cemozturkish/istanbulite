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

  // ── What your profile page shows, per page ──
  // Your profile is one page opened from three places, and where you
  // opened it from decides what it is *for* there: the week's games
  // belong to Kahvehane, where the games are; your account and your
  // settings to Kütüphane. The cover — frame, avatar, name, district —
  // shows on all three, because that is who you are rather than what
  // you are doing.
  //
  // The Kişiselleştir/Kaydet button and Çıkış Yap travel with the blocks
  // they act on (the settings sliders and the account), so they live
  // with them on Kütüphane.
  //
  // Anahane is the one page where the cover isn't rendered on its own:
  // there the frame becomes the middle cell of the hane honeycomb (see
  // hiveHTML), with the six member slots around it. Same frame, same
  // avatar, same stickers — it just has neighbours.
  //
  // Nothing here scrolls: each page's profile fits inside the sheet the
  // way a politician's does (see .profile-overlay-body in
  // profile-card.css). Adding a block to a page means checking it still
  // fits, not adding a scrollbar.
  const PROFILE_SECTIONS = {
    anahane:   { hive: true,  week: false, account: false, settings: false },
    kahvehane: { hive: false, week: true,  account: false, settings: false },
    kutuphane: { hive: false, week: false, account: true,  settings: true },
  };
  const DEFAULT_PAGE = 'anahane';

  // Which of the three carousel pages we're on. router.js stamps
  // body.dataset.page on every virtual navigation; on a real page load
  // the filename is the source of truth.
  function currentPageSlug() {
    const stamped = document.body && document.body.dataset ? document.body.dataset.page : '';
    if (PROFILE_SECTIONS[stamped]) return stamped;
    const file = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    return PROFILE_SECTIONS[file] ? file : DEFAULT_PAGE;
  }

  function sectionsFor(page) {
    return PROFILE_SECTIONS[page] || PROFILE_SECTIONS[DEFAULT_PAGE];
  }

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

  // Shirt overlays — the base clothing layer (see avatar.js), stacked
  // directly on the bald base before hair/hat/accessory. Defaults to null
  // (the plain bare look), same as hair/hat/accessory. 'black' is the one
  // shirt color so far, fully open to everyone — no lock, just like the
  // hair options.
  const AVATAR_SHIRT_OPTIONS = [
    { value: null,    label: 'Yok' },
    { value: 'black', label: 'Siyah Tişört' },
  ];

  // Hair overlays for the layered avatar (bald base + optional transparent
  // hair PNG on top — see avatar.js). `null` is kel (bald, no overlay).
  const AVATAR_HAIR_OPTIONS = [
    { value: null,    label: 'Kel' },
    { value: 'buzz',  label: 'Çok kısa saç' },
    { value: 'short', label: 'Kısa saç' },
    { value: 'long',  label: 'Uzun saç' },
  ];

  // Hat overlays — a second, independent layer stacked on top of hair (see
  // avatar.js), so any hat can be worn over any hair. The locked Sözcü
  // reward is the 'crown' hat (used to be a single full-image override
  // before profiles.avatar_hat existed — see db/avatar_hat.sql).
  const AVATAR_HAT_OPTIONS = [
    { value: null,    label: 'Yok' },
    { value: 'crown', label: 'Sözcü Tacı', requiresSozcuCount: IstAvatar.SOZCU_REQUIRED_COUNT },
  ];

  // Accessory overlays — a third independent layer, stacked above hat (see
  // avatar.js). Unlike the hat's numeric Sözcü-count lock, `locked: true`
  // here is unconditional — there's no unlock path yet, it's just not
  // available to anyone until that's designed (see db/avatar_accessory.sql).
  const AVATAR_ACCESSORY_OPTIONS = [
    { value: null,       label: 'Yok' },
    { value: 'glasses',  label: 'Gözlük', locked: true },
  ];

  // Cover badges (rozetler) — image stickers the user can place on the
  // Profil tab's cover, unlocked by matching their birth district
  // (profiles.birth_place). Add new badges here as new district stickers
  // are drawn; the picker/cover rendering below doesn't need to change.
  const BADGES = [
    { id: 'galata',    src: 'assets/galatakulesisticker.png', label: 'Galata Kulesi', district: 'beyoglu' },
    { id: 'kizkulesi', src: 'assets/kizkulesisticker.png',    label: 'Kız Kulesi',    district: 'uskudar' },
  ];

  // Where a newly-placed badge lands before the user drags it anywhere —
  // cycles by how many badges are already placed. profiles.cover_badges is
  // a jsonb array of {id, x, y} (x/y are 0-100 percentages of the hexagon
  // frame's own width/height, so a saved spot scales sensibly between the
  // settings sheet's large frame and the read-only popup's smaller one).
  // Pulled well inside the box because the frame is a hexagon, not a
  // rectangle: its mask cuts the corners off, so a sticker parked near one
  // would be sliced (see BADGE_DRAG_BOUNDS, which clamps dragging to the
  // same safe area).
  const DEFAULT_BADGE_SLOTS = [
    { x: 32, y: 34 }, { x: 68, y: 34 }, { x: 32, y: 66 }, { x: 68, y: 66 },
  ];
  const BADGE_DRAG_BOUNDS = { minX: 24, maxX: 76, minY: 22, maxY: 78 };

  // profiles.cover_badges briefly shipped as a plain text[] of ids (before
  // drag-and-drop positioning existed) — db/profile_badges.sql migrates any
  // existing rows, but this tolerates a stray un-migrated string entry too.
  function normalizeBadgeEntry(entry, idx) {
    if (typeof entry === 'string') {
      const slot = DEFAULT_BADGE_SLOTS[idx % DEFAULT_BADGE_SLOTS.length];
      return { id: entry, x: slot.x, y: slot.y };
    }
    return entry;
  }

  function normalizedCoverBadges(profile) {
    return (profile?.cover_badges || []).map(normalizeBadgeEntry);
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

  // Kahvehane's library-card button icon -- opens the same settings
  // overlay as the gear icon elsewhere, just with a coffee cup instead.
  const COFFEE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>'
    + '<path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"></path>'
    + '<line x1="6" y1="1" x2="6" y2="4"></line>'
    + '<line x1="10" y1="1" x2="10" y2="4"></line>'
    + '<line x1="14" y1="1" x2="14" y2="4"></line>'
    + '</svg>';

  // Hane's library-card button icon -- not wired to anything yet.
  const HOME_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path>'
    + '<polyline points="9 22 9 12 15 12 15 22"></polyline>'
    + '</svg>';

  const ARROW_ICON_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"></path></svg>';
  const ARROW_ICON_RIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"></path></svg>';

  // Index into AVATAR_SHIRT_OPTIONS / AVATAR_HAIR_OPTIONS / AVATAR_HAT_
  // OPTIONS / AVATAR_ACCESSORY_OPTIONS matching the currently-saved value
  // (defaulting to each list's first/"none" entry).
  function shirtOptionIndex(avatarShirt) {
    const i = AVATAR_SHIRT_OPTIONS.findIndex(o => o.value === avatarShirt);
    return i === -1 ? 0 : i;
  }
  function hairOptionIndex(avatarHair) {
    const i = AVATAR_HAIR_OPTIONS.findIndex(o => o.value === avatarHair);
    return i === -1 ? 0 : i;
  }
  function hatOptionIndex(avatarHat) {
    const i = AVATAR_HAT_OPTIONS.findIndex(o => o.value === avatarHat);
    return i === -1 ? 0 : i;
  }
  function accessoryOptionIndex(avatarAccessory) {
    const i = AVATAR_ACCESSORY_OPTIONS.findIndex(o => o.value === avatarAccessory);
    return i === -1 ? 0 : i;
  }

  // The shared avatar preview — the shirt, hair, hat, and accessory rows
  // all browse independently (see wireShirtCarousel/wireHairCarousel/
  // wireHatCarousel/wireAccessoryCarousel) but always render into this same
  // composite (base + shirt + hair + hat + accessory), so picking any one
  // of them immediately shows how it looks combined with whatever the
  // other three are currently set to. `locked` renders the
  // browsed-but-not-available layer with the lock badge, without actually
  // committing it (see wireHatCarousel's / wireAccessoryCarousel's
  // render()).
  function avatarPreviewHTML(avatarHair, avatarHat, avatarAccessory, avatarShirt, locked) {
    return IstAvatar.html(null, avatarHair, avatarHat, avatarAccessory, avatarShirt) + (locked ? AVATAR_LOCK_SVG : '');
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

  // The "Kefil Olduğu" account row -- when this user has sponsored anyone
  // (profiles.referred_by = this user's id), wraps the row in a <details>
  // so the list of names is one tap away instead of always taking up
  // vertical space in the settings page's already-tight account column.
  // No JS wiring needed: <details>/<summary> handles the open/close state
  // natively.
  function sponsoredListHTML(sponsoredList, t) {
    const count = (sponsoredList || []).length;
    if (count === 0) {
      return `
        <div class="ist-pc-info-row">
          <div class="ist-pc-info-label">${esc(t('profile.sponsoredcount'))}</div>
          <div class="ist-pc-info-value">0 ${esc(t('profile.people'))}</div>
        </div>
      `;
    }
    const items = sponsoredList.map(p => {
      const name = capitalizeName(`${p.first_name || ''} ${p.last_name || ''}`.trim()) || t('profile.unnamed');
      const nb = p.neighborhood ? (NB_NAMES[p.neighborhood] || p.neighborhood) : '';
      return `<li class="ist-pc-sponsored-item"><span>${esc(name)}</span>${nb ? `<span class="ist-pc-sponsored-nb">${esc(nb)}</span>` : ''}</li>`;
    }).join('');
    return `
      <details class="ist-pc-sponsored-row">
        <summary class="ist-pc-info-row">
          <span class="ist-pc-info-label">${esc(t('profile.sponsoredcount'))}</span>
          <span class="ist-pc-info-value">${count} ${esc(t('profile.people'))}</span>
        </summary>
        <ul class="ist-pc-sponsored-list">${items}</ul>
      </details>
    `;
  }

  // Read game scores from Supabase, aggregated per game. Currently unused —
  // the Oyun Skorları cards were pulled from the Profil tab (kept for now
  // in case they come back in some form) in favor of the weekly grid.
  async function getGameScores(sb, userId) {
    function currentStreakFor(winDates) {
      function seedForOffset(off) {
        // Unpadded "Y-M-D", matching game_results.date.
        const [y, m, d] = IstDate.iso(-off).split('-').map(Number);
        return `${y}-${m}-${d}`;
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

  function mondayOfIstWeek() {
    const nowIst = IstDate.now();
    return new Date(nowIst.getFullYear(), nowIst.getMonth(), nowIst.getDate() - istWeekdayIdx(nowIst));
  }

  // The 7 calendar dates (Monday…Sunday) of the current Istanbul week, each
  // as an unpadded "Y-M-D" key matching game_results.date (see
  // db/game_results.sql: "YYYY-M-D Istanbul-local", no zero-padding).
  function weekDatesIst() {
    const monday = mondayOfIstWeek();
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      out.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
    }
    return out;
  }

  // Same week, zero-padded ISO ("YYYY-MM-DD") to match
  // sozcel_sozcul_assignments.game_date — a real `date` column, unlike
  // game_results.date which is unpadded text. Index-aligned with
  // weekDatesIst() so the two can be zipped together.
  function weekDatesIstISO() {
    const monday = mondayOfIstWeek();
    const out = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      out.push(`${d.getFullYear()}-${m}-${dd}`);
    }
    return out;
  }

  // Fetches this user's game_results for the current Istanbul week and
  // reduces them to per (game, date) played/won flags for the weekly grid,
  // plus which of those days they were the assigned Sözcü (Sözcel's daily
  // word-of-day solver) — rendered as a distinct color in weekGridHTML
  // rather than the usual win/played states.
  async function getWeekGameStatus(sb, userId) {
    const dateKeys = weekDatesIst();
    const isoDateKeys = weekDatesIstISO();
    const empty = { dateKeys, played: new Set(), won: new Set(), sozcuDates: new Set() };
    try {
      const [{ data, error }, { data: sozcuData, error: sozcuError }] = await Promise.all([
        sb.from('game_results').select('game, date, won').eq('user_id', userId).in('date', dateKeys),
        sb.from('sozcel_sozcul_assignments').select('game_date').eq('user_id', userId).in('game_date', isoDateKeys),
      ]);
      if (error) throw error;
      (data || []).forEach(r => {
        const k = r.game + '|' + r.date;
        empty.played.add(k);
        if (r.won) empty.won.add(k);
      });
      if (!sozcuError) {
        (sozcuData || []).forEach(r => {
          const idx = isoDateKeys.indexOf(r.game_date);
          if (idx !== -1) empty.sozcuDates.add(dateKeys[idx]);
        });
      }
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
    const todayIdx = istWeekdayIdx(IstDate.now());

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
        } else if (game.id === 'sozcel' && status.sozcuDates && status.sozcuDates.has(dateKey)) {
          state = 'sozcu';
          title = `${game.label} — ${dayNames[i]}: Sözcü`;
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
    return IstDate.iso();
  }

  // Fetches everything the card/overlay needs exactly once per session.
  // `avatarUrl` is carried on the returned object (not recomputed on later
  // renders) because avatar picks mutate it in place so a later setPage()
  // call still reflects a just-picked avatar without re-fetching.
  async function fetchProfileData(sb, I18N, user) {
    const today = istanbulTodayISO();

    const [{ data: profile }, { data: sponsoredRows }, { count: sozcuCount }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).single(),
      sb.from('profiles').select('id, first_name, last_name, neighborhood, joined_at').eq('referred_by', user.id).order('joined_at', { ascending: true }),
      sb.from('sozcel_sozcul_assignments').select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('game_date', today),
    ]);
    const sponsoredList = sponsoredRows || [];
    const kefaletCount = sponsoredList.length;

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
      sb, I18N, user, profile, kefaletCount, sponsoredList, sozcuCount, kefilOfUser,
      avatarUrl: profile?.avatar_url || null,
      avatarHair: profile?.avatar_hair || null,
      avatarHat: profile?.avatar_hat || null,
      avatarAccessory: profile?.avatar_accessory || null,
      avatarShirt: profile?.avatar_shirt || null,
    };
  }

  // Renders the compact card into `container` for the given `page` context,
  // using already-fetched `state`. Callable repeatedly (via setPage) without
  // hitting Supabase again — only mount()'s first call ever fetches.
  // Every page gets the same single "Profil" button, opening the shared
  // bottom-sheet overlay (see openProfileOverlay below) — the actual
  // editing/settings/badges UI no longer lives in this compact card.
  function renderPage(container, page, state) {
    const { I18N, user, profile, kefaletCount, sponsoredList, sozcuCount, kefilOfUser } = state;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
    const yasadigi = profile?.neighborhood || '';
    let avatarUrl = state.avatarUrl;
    let avatarHair = state.avatarHair;
    let avatarHat = state.avatarHat;
    let avatarAccessory = state.avatarAccessory;
    let avatarShirt = state.avatarShirt;

    const yasadigiDisplay = yasadigi ? (NB_NAMES[yasadigi] || yasadigi) : '—';
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const toggleLabel = t('profile.toggle') || 'Profil';

    function avatarHTML() {
      return IstAvatar.html(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt);
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
        sozcuCount, kefaletCount, sponsoredList, kefilOfUser,
        // Which blocks this profile page shows is the page's call, not
        // this card's (see PROFILE_SECTIONS).
        page,
        avatarUrl: state.avatarUrl,
        avatarHair: state.avatarHair,
        avatarHat: state.avatarHat,
        avatarAccessory: state.avatarAccessory,
        avatarShirt: state.avatarShirt,
        onAvatarChange(hair, hat, accessory, shirt) {
          state.avatarHair = hair;
          state.avatarHat = hat;
          state.avatarAccessory = accessory;
          state.avatarShirt = shirt;
          avatarHair = hair;
          avatarHat = hat;
          avatarAccessory = accessory;
          avatarShirt = shirt;
          const av = document.getElementById('ist-pc-avatar');
          if (av) av.innerHTML = avatarHTML();
        },
      });
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Shared bottom-sheet profile overlay: the combined settings page (see
  // settingsPageHTML). Mirrors the game-overlay (kahvehane) / reader-overlay
  // (kutuphane) / detail-overlay (anahane) bottom sheets — same markup
  // shape, same slide-up transition, same shared frames.css card treatment
  // — so opening your profile reads as the same kind of surface as opening
  // a news item, an event, an article, or a game.
  //
  // Injected into <body> lazily (once) so every page that loads this
  // script gets it without needing its own overlay markup.
  // ══════════════════════════════════════════════════════════════
  let _ov = null; // { sb, I18N, user, profile, sozcuCount, kefaletCount, kefilOfUser, avatarUrl, activeTab, onAvatarChange }

  function ensureProfileOverlay() {
    if (document.getElementById('profile-overlay')) return;
    const el = document.createElement('div');
    el.className = 'ist-sheet-overlay profile-overlay';
    el.id = 'profile-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="ist-sheet-backdrop" id="profile-overlay-backdrop"></div>
      <div class="ist-sheet profile-overlay-sheet" id="profile-overlay-sheet">
        <button type="button" class="ist-sheet-close" id="profile-overlay-close" aria-label="Kapat" title="Kapat"><img class="close-icon" src="assets/cross.png" alt=""></button>
        <div class="ist-sheet-body profile-overlay-body" id="profile-overlay-body"></div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('profile-overlay-backdrop').addEventListener('click', closeProfileOverlay);
    document.getElementById('profile-overlay-close').addEventListener('click', closeProfileOverlay);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.classList.contains('open')) closeProfileOverlay();
    });
  }

  function openProfileOverlay(opts) {
    ensureProfileOverlay();
    _ov = Object.assign({ sozcuCount: 0, kefaletCount: 0, sponsoredList: [], kefilOfUser: null, page: currentPageSlug() }, opts);
    if (!PROFILE_SECTIONS[_ov.page]) _ov.page = currentPageSlug();
    if (_ov.avatarUrl === undefined) _ov.avatarUrl = _ov.profile?.avatar_url || null;
    if (_ov.avatarHair === undefined) _ov.avatarHair = _ov.profile?.avatar_hair || null;
    if (_ov.avatarHat === undefined) _ov.avatarHat = _ov.profile?.avatar_hat || null;
    if (_ov.avatarAccessory === undefined) _ov.avatarAccessory = _ov.profile?.avatar_accessory || null;
    if (_ov.avatarShirt === undefined) _ov.avatarShirt = _ov.profile?.avatar_shirt || null;
    // Settings page opens in read-only "info" mode every time — Kişiselleştir
    // switches it into the editable avatar-arrows + sliders mode (see
    // settingsPageHTML/coverHTML), Kaydet saves and the page reload resets
    // this back to false on its own.
    _ov.customizing = false;
    renderOverlayBody();
    document.getElementById('profile-overlay-body').scrollTop = 0;
    IstSheet.open('profile-overlay');
  }

  function closeProfileOverlay() {
    IstSheet.close('profile-overlay');
  }

  function renderOverlayBody() {
    const body = document.getElementById('profile-overlay-body');
    if (!body || !_ov) return;
    body.innerHTML = settingsPageHTML(_ov);
    wireSettingsEvents(_ov);
  }

  // ══════════════════════════════════════════════════════════════
  // ANOTHER MEMBER'S PROFILE
  //
  // The read-only half of the profile sheet: cover, weekly grid, member
  // since, kefil. Opens from any .author-link / .kefil-link anywhere on
  // the site — a comment byline, a scoreboard row, the kefil line inside
  // this very sheet (which is how the chain is walked: clicking a kefil
  // re-fills the same sheet rather than stacking a second one).
  //
  // One implementation for the whole site. Every page called
  // IstProfileCard.initMemberSheet({ sb, I18N }) once; it used to be a
  // centred modal copy-pasted into five pages, each with its own CSS.
  // ══════════════════════════════════════════════════════════════
  let _member = null;          // { sb, I18N } — set by initMemberSheet
  let _memberDelegated = false;

  function ensureMemberSheet() {
    if (document.getElementById('member-sheet')) return;
    const el = document.createElement('div');
    el.className = 'ist-sheet-overlay';
    el.id = 'member-sheet';
    // Created up front and left in the DOM for the rest of the session:
    // a virtual navigation (see router.js) disables the page's own
    // stylesheet, so an element relying on a page class alone would end
    // up unstyled. The `hidden` attribute's display:none comes from the
    // browser's own stylesheet, so it stays correct regardless.
    el.hidden = true;
    el.innerHTML = `
      <div class="ist-sheet-backdrop" id="member-sheet-backdrop"></div>
      <div class="ist-sheet" id="member-sheet-sheet" role="dialog" aria-modal="true">
        <button type="button" class="ist-sheet-close" id="member-sheet-close" aria-label="Kapat" title="Kapat"><img class="close-icon" src="assets/cross.png" alt=""></button>
        <div class="ist-sheet-body ist-member-body" id="member-sheet-body"></div>
      </div>
    `;
    document.body.appendChild(el);

    document.getElementById('member-sheet-backdrop').addEventListener('click', closeMemberSheet);
    document.getElementById('member-sheet-close').addEventListener('click', closeMemberSheet);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.classList.contains('open')) closeMemberSheet();
    });
  }

  function closeMemberSheet() {
    IstSheet.close('member-sheet');
  }

  async function openMemberSheet(userId) {
    if (!_member || !userId) return;
    const { sb, I18N } = _member;
    ensureMemberSheet();
    const body = document.getElementById('member-sheet-body');
    body.scrollTop = 0;
    IstSheet.open('member-sheet');
    body.innerHTML = '<div class="ist-member-loading">Yükleniyor…</div>';

    const [{ data, error }, weekStatus] = await Promise.all([
      sb.from('profiles')
        .select('id, first_name, last_name, neighborhood, avatar_url, avatar_hair, avatar_hat, avatar_accessory, avatar_shirt, cover_badges, joined_at, referred_by')
        .eq('id', userId)
        .maybeSingle(),
      getWeekGameStatus(sb, userId),
    ]);
    if (error || !data) {
      body.innerHTML = '<div class="ist-member-error">Profil yüklenemedi.</div>';
      return;
    }

    let kefilName = null, kefilId = null;
    if (data.referred_by) {
      const { data: kp } = await sb
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('id', data.referred_by)
        .maybeSingle();
      if (kp) {
        kefilName = capitalizeName(`${kp.first_name || ''} ${kp.last_name || ''}`.trim()) || 'İsimsiz Üye';
        kefilId = kp.id;
      }
    }

    const fullName = capitalizeName(`${data.first_name || ''} ${data.last_name || ''}`.trim()) || 'İsimsiz Üye';
    const nb = data.neighborhood ? (NB_NAMES[data.neighborhood] || data.neighborhood) : '—';
    body.innerHTML = `
      ${coverHTML({ profile: data, avatarUrl: data.avatar_url, avatarHair: data.avatar_hair, avatarHat: data.avatar_hat, avatarAccessory: data.avatar_accessory, avatarShirt: data.avatar_shirt, displayName: fullName, metaText: nb })}
      ${weekGridHTML(weekStatus, I18N)}
      <div class="ist-member-since">
        <div>${I18N.formatMemberSince(data.joined_at)}</div>
        ${kefilName ? `<div class="ist-member-kefil">${I18N.t('profile.kefil')}: <button type="button" class="kefil-link" data-user-id="${kefilId}">${esc(kefilName)}</button></div>` : ''}
      </div>
    `;
  }

  // Called once per page. The click delegation is registered on the
  // document, so it keeps working across virtual navigations and covers
  // links rendered long after this ran.
  function initMemberSheet(opts) {
    _member = { sb: opts.sb, I18N: opts.I18N };
    ensureMemberSheet();
    if (_memberDelegated) return;
    _memberDelegated = true;
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.author-link, .kefil-link');
      if (!link) return;
      const id = link.getAttribute('data-user-id');
      if (id) openMemberSheet(id);
    });
  }

  function coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt) {
    return IstAvatar.html(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt);
  }

  // The "pano" — the hexagon frame itself, with any rozetler (badges)
  // picked on the settings page (see settingsPageHTML/toggleCoverBadge)
  // dragged freely around *inside* it (see wireCoverDragging), over its
  // drawn background and under the avatar art. There is no cover rectangle
  // behind the frame anymore: the frame is the pano, and it's the same
  // fixed size for every member regardless of how long their name is
  // (see .ist-pc-cover in profile-card.css).
  // Shared between the self-editing settings page
  // (settingsPageHTML below, editable: true) and kutuphane.html's read-only
  // "someone else's profile" popup (exposed as IstProfileCard.coverHTML,
  // editable omitted) so both surfaces render badges identically — the
  // popup just doesn't wire up dragging or avatar-picking on top of it.
  //
  // When editable AND customizing, the avatar sits between two flanking
  // columns of uniform prev/next arrows — a left column of four "prev"
  // arrows and a right column of four "next" arrows, each stacked
  // top-to-bottom as hat, hair, accessory, shirt (see wireHatCarousel/
  // wireHairCarousel/wireAccessoryCarousel/wireShirtCarousel) — all the
  // same size, so no category reads as more "primary" than another. When
  // editable but not customizing, it's just a plain read-only avatar — same
  // as the non-editable popup — until Kişiselleştir turns the arrows on
  // (see settingsPageHTML). The arrow columns hang outside the frame in
  // both cases (absolutely positioned, see .ist-pc-cover-pick-col), so the
  // pano stickers sit on stays the exact same size and place whether or
  // not they're showing. `sozcuCount` is only
  // needed in the customizing case, to know whether the locked Sözcü hat
  // should show unlocked (the accessory row's lock is unconditional — see
  // AVATAR_ACCESSORY_OPTIONS — so it doesn't need it).
  function coverBadgesHTML(profile) {
    return normalizedCoverBadges(profile).map(p => {
      const badge = BADGES.find(b => b.id === p.id);
      if (!badge) return '';
      return `<img class="ist-pc-cover-badge" data-id="${badge.id}" draggable="false" style="left:${p.x}%; top:${p.y}%;" src="${badge.src}" alt="${esc(badge.label)}" title="${esc(badge.label)}">`;
    }).join('');
  }

  function coverHTML(opts) {
    const { profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName, metaText, editable, customizing, sozcuCount } = opts;
    const badgesHTML = coverBadgesHTML(profile);
    // The avatar art layer. It is always its own element inside the frame
    // (never the frame box itself) because the carousels replace its whole
    // innerHTML on every arrow press — sharing a parent with the stickers
    // would wipe them (see .ist-pc-cover-art in profile-card.css).
    let artHTML, arrowsHTML = '';
    if (editable && customizing) {
      const hairOpt = AVATAR_HAIR_OPTIONS[hairOptionIndex(avatarHair)];
      const hatOpt = AVATAR_HAT_OPTIONS[hatOptionIndex(avatarHat)];
      const accessoryOpt = AVATAR_ACCESSORY_OPTIONS[accessoryOptionIndex(avatarAccessory)];
      const shirtOpt = AVATAR_SHIRT_OPTIONS[shirtOptionIndex(avatarShirt)];
      const title = `${hairOpt.label} · ${hatOpt.label} · ${accessoryOpt.label} · ${shirtOpt.label}`;
      artHTML = `<div class="ist-pc-cover-art" id="po-avatar-preview" title="${esc(title)}">${avatarPreviewHTML(avatarHair, avatarHat, avatarAccessory, avatarShirt, false)}</div>`;
      arrowsHTML = `
        <div class="ist-pc-cover-pick-col ist-pc-cover-pick-prev">
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-hat-prev" aria-label="Önceki şapka">${ARROW_ICON_LEFT}</button>
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-hair-prev" aria-label="Önceki saç">${ARROW_ICON_LEFT}</button>
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-accessory-prev" aria-label="Önceki aksesuar">${ARROW_ICON_LEFT}</button>
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-shirt-prev" aria-label="Önceki tişört">${ARROW_ICON_LEFT}</button>
        </div>
        <div class="ist-pc-cover-pick-col ist-pc-cover-pick-next">
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-hat-next" aria-label="Sonraki şapka">${ARROW_ICON_RIGHT}</button>
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-hair-next" aria-label="Sonraki saç">${ARROW_ICON_RIGHT}</button>
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-accessory-next" aria-label="Sonraki aksesuar">${ARROW_ICON_RIGHT}</button>
          <button type="button" class="ist-pc-cover-pick-arrow" id="po-shirt-next" aria-label="Sonraki tişört">${ARROW_ICON_RIGHT}</button>
        </div>
      `;
    } else {
      artHTML = `<div class="ist-pc-cover-art">${coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt)}</div>`;
    }
    const customizingClass = (editable && customizing) ? ' ist-pc-cover-customizing' : '';
    // The frame box carries the badges (id po-cover — it's the drag surface
    // now that stickers live inside the frame rather than around it).
    return `
      <div class="ist-pc-cover${editable ? ' ist-pc-cover-editable' : ''}${customizingClass}">
        <div class="ist-pc-cover-picker">
          ${arrowsHTML}
          <div class="ist-pc-cover-avatar"${editable ? ' id="po-cover"' : ''}>
            ${badgesHTML}
            ${artHTML}
          </div>
        </div>
        <div class="ist-pc-cover-name">${esc(displayName)}</div>
        <div class="ist-pc-cover-meta">${esc(metaText)}</div>
      </div>
    `;
  }

  // ══════════════════════════════════════════════════════════════
  // THE HANE HONEYCOMB (anahane's profile page)
  //
  // Your own frame in the middle cell, six slots packed around it. A
  // slot is a place the user puts *another member*, so that opening
  // their own profile on the middle page is also how they look in on
  // the handful of people they keep close — the profile stays the
  // anchor point of the middle page, but it stops being only about the
  // person holding the phone.
  //
  // Reading the honeycomb as three rows of 2 / 3 / 2 cells (the middle
  // cell of the middle row being the user) is what packs them: the
  // short rows are centred against the long one, which offsets them by
  // exactly half a cell, and the rows overlap slightly so the frames
  // interlock instead of sitting in a table (see .ist-hive in
  // profile-card.css). Each slot's readout — what that member is up to
  // — is printed on the outer side of its own row, so the pairs read
  // outward from the middle rather than into it.
  //
  // The slots hold nobody yet: who may be put in one, and what of them
  // is shown, is a rule that doesn't exist yet. Until it does, every
  // slot renders empty (a muted frame with a "+") and the readout beside
  // it is placeholder ruling, not data. When that rule lands, fill
  // `members` below with the profiles in each slot — the layout does not
  // need to change for it.
  // ══════════════════════════════════════════════════════════════
  const HIVE_SLOT_COUNT = 6;

  // How the three rows are laid out, in slot order (0-5, clockwise-ish
  // from the top-left): two slots up top, one either side of the user,
  // two along the bottom. `me` marks where the user's own frame goes.
  const HIVE_ROWS = [
    { slots: [0, 1] },
    { slots: [2, 3], me: 1 },   // user sits between the two middle slots
    { slots: [4, 5] },
  ];

  // Placeholder ruling for a slot's readout — the lines are what a
  // member's stats will occupy once there is something to print, so
  // they're deliberately uneven (a rendered stat block is never a
  // rectangle) and purely decorative, hence aria-hidden.
  const HIVE_LINE_WIDTHS = [
    [96, 72, 88],
    [82, 96, 64],
    [90, 66, 80],
    [70, 92, 78],
    [88, 74, 94],
    [76, 90, 68],
  ];

  function hiveLinesHTML(slot, side) {
    const widths = HIVE_LINE_WIDTHS[slot % HIVE_LINE_WIDTHS.length];
    const lines = widths.map(w => `<span class="ist-hive-line" style="width:${w}%"></span>`).join('');
    return `<div class="ist-hive-lines ist-hive-lines-${side}" aria-hidden="true">${lines}</div>`;
  }

  // One slot cell. `member` is always null for now (see the block
  // comment above); the filled branch is written out so wiring a member
  // in later is a matter of passing one, not of rebuilding the cell.
  function hiveSlotHTML(slot, member, t) {
    if (member) {
      return `
        <div class="ist-hive-cell ist-hive-slot-filled" data-slot="${slot}" data-user-id="${esc(member.id)}">
          <div class="ist-pc-cover-avatar ist-hive-frame">
            ${coverBadgesHTML(member)}
            <div class="ist-pc-cover-art">${coverAvatarHTML(member.avatar_url, member.avatar_hair, member.avatar_hat, member.avatar_accessory, member.avatar_shirt)}</div>
          </div>
        </div>
      `;
    }
    const label = t('profile.hive.empty');
    return `
      <div class="ist-hive-cell" data-slot="${slot}">
        <div class="hexframe ist-hive-frame ist-hive-slot" title="${esc(label)}" aria-label="${esc(label)}" role="img">
          <span class="ist-hive-plus" aria-hidden="true">+</span>
        </div>
      </div>
    `;
  }

  function hiveMeHTML(opts) {
    const { profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName } = opts;
    return `
      <div class="ist-hive-cell ist-hive-me">
        <div class="ist-pc-cover-avatar ist-hive-frame" title="${esc(displayName)}">
          ${coverBadgesHTML(profile)}
          <div class="ist-pc-cover-art">${coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt)}</div>
        </div>
      </div>
    `;
  }

  function hiveHTML(opts) {
    const t = opts.t;
    // Slot → member map, once slots can actually hold anyone. Empty
    // until that rule exists, which is what makes every cell render as
    // an empty frame today.
    const members = opts.members || {};
    const rows = HIVE_ROWS.map(row => {
      const cells = [];
      row.slots.forEach((slot, i) => {
        if (row.me === i) cells.push(hiveMeHTML(opts));
        cells.push(hiveSlotHTML(slot, members[slot] || null, t));
      });
      if (row.me === row.slots.length) cells.push(hiveMeHTML(opts));
      const [leftSlot, rightSlot] = [row.slots[0], row.slots[row.slots.length - 1]];
      return `
        <div class="ist-hive-row">
          ${hiveLinesHTML(leftSlot, 'left')}
          <div class="ist-hive-cells">${cells.join('')}</div>
          ${hiveLinesHTML(rightSlot, 'right')}
        </div>
      `;
    }).join('');
    return `<div class="ist-hive" data-slots="${HIVE_SLOT_COUNT}">${rows}</div>`;
  }

  // Drag-and-drop repositioning of cover badges (Profil tab only — the
  // read-only popup never passes editable: true to coverHTML, so it has no
  // .ist-pc-cover-badge with pointer-events enabled to drag). `#po-cover`
  // is the hexagon frame the stickers live inside. Position is tracked as
  // a percentage of that frame's own box so it scales sensibly if the same
  // profile is later viewed in a differently-sized container.
  function wireCoverDragging(state) {
    const cover = document.getElementById('po-cover');
    if (!cover) return;
    let dragEl = null, startClientX = 0, startClientY = 0, startLeft = 0, startTop = 0;

    function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

    function onPointerDown(e) {
      const badge = e.target.closest('.ist-pc-cover-badge');
      if (!badge) return;
      e.preventDefault();
      dragEl = badge;
      dragEl.setPointerCapture(e.pointerId);
      dragEl.classList.add('dragging');
      startClientX = e.clientX;
      startClientY = e.clientY;
      startLeft = parseFloat(dragEl.style.left) || 50;
      startTop = parseFloat(dragEl.style.top) || 50;
    }

    function onPointerMove(e) {
      if (!dragEl) return;
      const rect = cover.getBoundingClientRect();
      const b = BADGE_DRAG_BOUNDS;
      const x = clamp(startLeft + ((e.clientX - startClientX) / rect.width) * 100, b.minX, b.maxX);
      const y = clamp(startTop + ((e.clientY - startClientY) / rect.height) * 100, b.minY, b.maxY);
      dragEl.style.left = x + '%';
      dragEl.style.top = y + '%';
    }

    async function onPointerUp(e) {
      if (!dragEl) return;
      const badge = dragEl;
      dragEl = null;
      badge.classList.remove('dragging');
      await saveCoverBadgePosition(badge.dataset.id, parseFloat(badge.style.left), parseFloat(badge.style.top), state);
    }

    cover.addEventListener('pointerdown', onPointerDown);
    cover.addEventListener('pointermove', onPointerMove);
    cover.addEventListener('pointerup', onPointerUp);
    cover.addEventListener('pointercancel', onPointerUp);
  }

  // The settings page: replaces the old Profil/Ayarlar/Rozetler tab split
  // with a single non-paginated view — cover (with the avatar carousel
  // baked in, see coverHTML) and the weekly game grid on the left; account
  // info and personalization (language/color/appearance) on the right,
  // matching a two-column layout so both halves fit on screen together
  // without scrolling between "pages". The rozetler (badges) picker that
  // used to sit under the week grid is temporarily removed to save
  // vertical space on mobile — see BADGES/buildBadgePicker/toggleCoverBadge
  // above, kept intact so it can be re-added later; already-placed cover
  // badges still render via coverHTML.
  function settingsPageHTML(state) {
    const { I18N, user, profile, sozcuCount, sponsoredList, kefilOfUser, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, customizing } = state;
    const show = sectionsFor(state.page);
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
    const yasadigiIlce = profile?.neighborhood || '';
    const dogumYeri = profile?.birth_place || '';
    const phone = profile?.phone || '';
    const referralCode = profile?.referral_code || '';
    const languagePref = normalizeLang(profile?.language_pref);
    const themePref = normalizeTheme(profile?.theme_pref);
    const palettePref = normalizePalette(profile?.palette_pref);
    const langLabel = LANG_VALUES.indexOf(languagePref) === 1 ? 'Daha Türkçe' : 'Daha İngilizce';
    const paletteLabel = PALETTE_VALUES.indexOf(palettePref) === 1 ? 'Kahverengi' : 'Siyah-Beyaz';
    const themeLabel = THEME_VALUES.indexOf(themePref) === 1 ? 'Koyu' : 'Açık';

    const yasadigiDisplay = yasadigiIlce ? (NB_NAMES[yasadigiIlce] || yasadigiIlce) : '—';
    const dogumDisplay = dogumYeri ? (NB_NAMES[dogumYeri] || dogumYeri) : '—';
    const joinedDate = I18N.formatDate(user.created_at, { year: 'numeric', month: 'long', day: 'numeric' });
    const kefilLabel = kefilOfUser
      ? esc(capitalizeName(`${kefilOfUser.first_name||''} ${kefilOfUser.last_name||''}`.trim()) || t('profile.unnamed'))
      : '';

    return `
      <div class="ist-pc-settings-grid">
        <div class="ist-pc-settings-col ist-pc-settings-left">
          ${show.hive
            ? hiveHTML({ profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName, t })
            : `${coverHTML({ profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName, metaText: yasadigiDisplay, editable: true, customizing, sozcuCount })}
          <div class="ist-pc-avatar-msg" id="po-avatar-msg" role="status" aria-live="polite"></div>`}

          ${show.week ? `
          <div class="ist-pc-section-title">${esc(t('profile.thisweek'))}</div>
          <div id="po-weekgrid-mount"></div>
          ` : ''}
        </div>

        <div class="ist-pc-settings-col ist-pc-settings-right">
          ${show.account ? `
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
            <div class="ist-pc-info-label">${esc(t('profile.birthplace'))}</div>
            <div class="ist-pc-info-value">${esc(dogumDisplay)}</div>
          </div>
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.membership'))}</div>
            <div class="ist-pc-info-value">${esc(joinedDate)}</div>
          </div>
          ${kefilOfUser ? `
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.kefil'))}</div>
            <div class="ist-pc-info-value">${kefilLabel}</div>
          </div>` : ''}
          ${sponsoredListHTML(sponsoredList, t)}
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.sozcucount'))}</div>
            <div class="ist-pc-info-value">${sozcuCount ?? 0} ${esc(t('profile.times'))}</div>
          </div>
          ${referralCode ? `
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.referralcode'))}</div>
            <div class="ist-pc-info-value">
              <span class="ist-pc-code">${esc(referralCode)}</span>
              <button type="button" class="ist-pc-copy" id="po-copy">${esc(t('profile.copy'))}</button>
            </div>
          </div>` : ''}
          ` : ''}

          ${show.settings ? `
          <div class="ist-pc-section-title">${esc(t('profile.tab.ayarlar'))}</div>
          ${customizing ? `
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
          ` : `
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.langpref'))}</div>
            <div class="ist-pc-info-value">${esc(langLabel)}</div>
          </div>
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.colortheme'))}</div>
            <div class="ist-pc-info-value">${esc(paletteLabel)}</div>
          </div>
          <div class="ist-pc-info-row">
            <div class="ist-pc-info-label">${esc(t('profile.appearance'))}</div>
            <div class="ist-pc-info-value">${esc(themeLabel)}</div>
          </div>
          `}
          <div class="ist-pc-actions">
            <button type="button" class="ist-pc-save" id="po-save">${esc(customizing ? t('profile.save') : t('profile.customize'))}</button>
          </div>
          <div class="ist-pc-msg" id="po-save-msg"></div>
          ` : ''}
        </div>
      </div>

      ${show.account ? `<button type="button" class="ist-pc-signout" id="po-signout">${esc(t('profile.signout'))}</button>` : ''}
    `;
  }

  // Wires every interactive piece of the combined settings page in one
  // pass (cover dragging + avatar carousel live on the same cover now, so
  // both always need wiring together — there's no more per-tab split).
  function wireSettingsEvents(state) {
    const { sb, I18N, user } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;

    if (state.customizing) {
      wireCoverDragging(state);
    }
    wireHairCarousel(state);
    wireHatCarousel(state);
    wireAccessoryCarousel(state);
    wireShirtCarousel(state);
    // Every block below is optional: which ones exist depends on the page
    // this was opened from (see PROFILE_SECTIONS).
    if (document.getElementById('po-weekgrid-mount')) {
      getWeekGameStatus(sb, user.id).then(status => {
        const m = document.getElementById('po-weekgrid-mount');
        if (m) m.innerHTML = weekGridHTML(status, I18N);
      });
    }
    const saveBtn = document.getElementById('po-save');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      if (state.customizing) {
        saveSettings(state);
      } else {
        state.customizing = true;
        renderOverlayBody();
      }
    });
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
    const signoutBtn = document.getElementById('po-signout');
    if (signoutBtn) signoutBtn.addEventListener('click', async () => {
      await sb.auth.signOut();
      window.location.href = 'index.html';
    });
  }

  // Saves the settings page's only editable fields — language/palette/
  // appearance. Ad/Soyad/Yaşadığı İlçe are read-only for now (see the
  // comment above the info rows in settingsPageHTML), so there's nothing
  // else to send.
  async function saveSettings(state) {
    const { sb, I18N, user } = state;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const msgEl = document.getElementById('po-save-msg');
    const btn = document.getElementById('po-save');
    // The sliders only exist on the page that renders the settings block
    // (see PROFILE_SECTIONS) -- elsewhere Kaydet is saving avatar picks
    // alone, so each preference keeps whatever is already stored.
    const sliderValue = (id, values, fallback) => {
      const el = document.getElementById(id);
      if (!el) return fallback;
      return values[parseInt(el.value, 10)] || values[0];
    };
    const newLang = sliderValue('po-language', LANG_VALUES, normalizeLang(state.profile?.language_pref));
    const newTheme = sliderValue('po-theme', THEME_VALUES, normalizeTheme(state.profile?.theme_pref));
    const newPalette = sliderValue('po-palette', PALETTE_VALUES, normalizePalette(state.profile?.palette_pref));

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

  // Wires the hair row's prev/next arrows. Browsing is purely local — `idx`
  // tracks whatever hair is currently shown, independent of what's actually
  // saved — and each step immediately picks it (hair is never locked, so
  // this always commits). All four carousels render into the same
  // #po-avatar-preview, using the *other* three's current value for the
  // layers they don't control (state.avatarHat/avatarAccessory/avatarShirt
  // here).
  function wireHairCarousel(state) {
    const prevBtn = document.getElementById('po-hair-prev');
    const nextBtn = document.getElementById('po-hair-next');
    const previewEl = document.getElementById('po-avatar-preview');
    if (!prevBtn || !nextBtn || !previewEl) return;

    let idx = hairOptionIndex(state.avatarHair);

    function render() {
      const hair = AVATAR_HAIR_OPTIONS[idx].value;
      previewEl.innerHTML = avatarPreviewHTML(hair, state.avatarHat, state.avatarAccessory, state.avatarShirt, false);
      previewEl.classList.remove('locked');
    }

    function step(delta) {
      idx = (idx + delta + AVATAR_HAIR_OPTIONS.length) % AVATAR_HAIR_OPTIONS.length;
      render();
      pickOverlayHair(AVATAR_HAIR_OPTIONS[idx].value, state);
    }

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
  }

  // Wires the hat row's prev/next arrows — same immediate-pick convention,
  // except landing on a locked hat shows it (with the lock badge) on the
  // shared preview without committing, so browsing further or away doesn't
  // leave a half-saved state (see pickOverlayHat's own lock check, which is
  // the actual source of truth — this is just the matching visual).
  function wireHatCarousel(state) {
    const prevBtn = document.getElementById('po-hat-prev');
    const nextBtn = document.getElementById('po-hat-next');
    const previewEl = document.getElementById('po-avatar-preview');
    if (!prevBtn || !nextBtn || !previewEl) return;

    let idx = hatOptionIndex(state.avatarHat);

    function render() {
      const opt = AVATAR_HAT_OPTIONS[idx];
      const locked = !!opt.requiresSozcuCount && (state.sozcuCount || 0) < opt.requiresSozcuCount;
      previewEl.innerHTML = avatarPreviewHTML(state.avatarHair, opt.value, state.avatarAccessory, state.avatarShirt, locked);
      previewEl.classList.toggle('locked', locked);
    }

    function step(delta) {
      idx = (idx + delta + AVATAR_HAT_OPTIONS.length) % AVATAR_HAT_OPTIONS.length;
      render();
      pickOverlayHat(AVATAR_HAT_OPTIONS[idx].value, state);
    }

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
  }

  // Wires the accessory row's prev/next arrows — same shape as the hat
  // row, except the lock is unconditional (see AVATAR_ACCESSORY_OPTIONS):
  // there's no count to check, `opt.locked` alone decides it, and picking
  // a locked accessory never commits, now or later, until that changes.
  function wireAccessoryCarousel(state) {
    const prevBtn = document.getElementById('po-accessory-prev');
    const nextBtn = document.getElementById('po-accessory-next');
    const previewEl = document.getElementById('po-avatar-preview');
    if (!prevBtn || !nextBtn || !previewEl) return;

    let idx = accessoryOptionIndex(state.avatarAccessory);

    function render() {
      const opt = AVATAR_ACCESSORY_OPTIONS[idx];
      const locked = !!opt.locked;
      previewEl.innerHTML = avatarPreviewHTML(state.avatarHair, state.avatarHat, opt.value, state.avatarShirt, locked);
      previewEl.classList.toggle('locked', locked);
    }

    function step(delta) {
      idx = (idx + delta + AVATAR_ACCESSORY_OPTIONS.length) % AVATAR_ACCESSORY_OPTIONS.length;
      render();
      pickOverlayAccessory(AVATAR_ACCESSORY_OPTIONS[idx].value, state);
    }

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
  }

  // Wires the shirt row's prev/next arrows — never locked (unlike hat/
  // accessory), just a plain immediate-pick toggle between the default
  // 'black' and 'Yok' (bare).
  function wireShirtCarousel(state) {
    const prevBtn = document.getElementById('po-shirt-prev');
    const nextBtn = document.getElementById('po-shirt-next');
    const previewEl = document.getElementById('po-avatar-preview');
    if (!prevBtn || !nextBtn || !previewEl) return;

    let idx = shirtOptionIndex(state.avatarShirt);

    function render() {
      const shirt = AVATAR_SHIRT_OPTIONS[idx].value;
      previewEl.innerHTML = avatarPreviewHTML(state.avatarHair, state.avatarHat, state.avatarAccessory, shirt, false);
      previewEl.classList.remove('locked');
    }

    function step(delta) {
      idx = (idx + delta + AVATAR_SHIRT_OPTIONS.length) % AVATAR_SHIRT_OPTIONS.length;
      render();
      pickOverlayShirt(AVATAR_SHIRT_OPTIONS[idx].value, state);
    }

    prevBtn.addEventListener('click', () => step(-1));
    nextBtn.addEventListener('click', () => step(1));
  }

  async function pickOverlayHair(hair, state) {
    const { sb, user } = state;
    if (state.avatarHair === hair) return;
    const { data, error } = await sb.from('profiles').update({ avatar_hair: hair }).eq('id', user.id).select('id');
    if (error) { showOverlayAvatarMsg('Avatar kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showOverlayAvatarMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }
    state.avatarHair = hair;
    if (typeof state.onAvatarChange === 'function') state.onAvatarChange(hair, state.avatarHat, state.avatarAccessory, state.avatarShirt);
  }

  async function pickOverlayHat(hat, state) {
    const { sb, user, sozcuCount } = state;
    if (state.avatarHat === hat) return;
    const opt = AVATAR_HAT_OPTIONS.find(o => o.value === hat);
    if (opt && opt.requiresSozcuCount && (sozcuCount || 0) < opt.requiresSozcuCount) {
      showOverlayAvatarMsg(`Bu şapka kilitli — ${opt.requiresSozcuCount} kez Sözcü olmak gerekiyor (${sozcuCount || 0}/${opt.requiresSozcuCount}).`);
      return;
    }
    const { data, error } = await sb.from('profiles').update({ avatar_hat: hat }).eq('id', user.id).select('id');
    if (error) { showOverlayAvatarMsg('Avatar kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showOverlayAvatarMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }
    state.avatarHat = hat;
    if (typeof state.onAvatarChange === 'function') state.onAvatarChange(state.avatarHair, hat, state.avatarAccessory, state.avatarShirt);
  }

  async function pickOverlayAccessory(accessory, state) {
    const { sb, user } = state;
    if (state.avatarAccessory === accessory) return;
    const opt = AVATAR_ACCESSORY_OPTIONS.find(o => o.value === accessory);
    if (opt && opt.locked) {
      showOverlayAvatarMsg('Bu aksesuar henüz kullanılamıyor.');
      return;
    }
    const { data, error } = await sb.from('profiles').update({ avatar_accessory: accessory }).eq('id', user.id).select('id');
    if (error) { showOverlayAvatarMsg('Avatar kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showOverlayAvatarMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }
    state.avatarAccessory = accessory;
    if (typeof state.onAvatarChange === 'function') state.onAvatarChange(state.avatarHair, state.avatarHat, accessory, state.avatarShirt);
  }

  async function pickOverlayShirt(shirt, state) {
    const { sb, user } = state;
    if (state.avatarShirt === shirt) return;
    const { data, error } = await sb.from('profiles').update({ avatar_shirt: shirt }).eq('id', user.id).select('id');
    if (error) { showOverlayAvatarMsg('Avatar kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showOverlayAvatarMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }
    state.avatarShirt = shirt;
    if (typeof state.onAvatarChange === 'function') state.onAvatarChange(state.avatarHair, state.avatarHat, state.avatarAccessory, shirt);
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

    const current = normalizedCoverBadges(profile);
    const has = current.some(e => e.id === id);
    let next;
    if (has) {
      next = current.filter(e => e.id !== id);
    } else {
      const slot = DEFAULT_BADGE_SLOTS[current.length % DEFAULT_BADGE_SLOTS.length];
      next = [...current, { id, x: slot.x, y: slot.y }];
    }

    const { data, error } = await sb.from('profiles').update({ cover_badges: next }).eq('id', user.id).select('id');
    if (error) { showBadgeMsg('Rozet kaydedilemedi: ' + error.message); return; }
    if (!data || data.length === 0) { showBadgeMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.'); return; }

    if (profile) profile.cover_badges = next;
    renderOverlayBody();
  }

  // Persists a badge's dragged position. Best-effort: the drag already
  // reflects visually regardless of whether the save round-trips, since
  // reverting mid-drag would feel worse than a rare silent failure here.
  async function saveCoverBadgePosition(id, x, y, state) {
    const { sb, user, profile } = state;
    const next = normalizedCoverBadges(profile).map(e => (e.id === id ? { id, x, y } : e));
    const { error } = await sb.from('profiles').update({ cover_badges: next }).eq('id', user.id);
    if (error) return;
    if (profile) profile.cover_badges = next;
  }

  // ══════════════════════════════════════════════════════════════
  // Shared desktop identity card: avatar, name, neighborhood, top-right
  // button. Mirrors kütüphane.html's own top-of-col-left `.library-card`
  // (kept local there — see the comment above .library-card in
  // profile-card.css). Desktop-only; each page hides #library-card on
  // mobile in its own <768px query since #ist-pc-mount already covers that.
  //
  // Each page that calls this wants a different button: kütüphane's own
  // local card (not this shared one) keeps the settings gear; anahane and
  // kahvehane call this and pass their own `icon` + `onEdit` so the same
  // card markup can open a different (or no) overlay per page.
  //
  // Usage: IstProfileCard.mountLibraryCard({ sb, I18N, icon, onEdit }).
  //   icon: button SVG string (defaults to GEAR_SVG, which opens the
  //     settings overlay by default too).
  //   onEdit({ sb, I18N, user, profile, sozcuCount, kefaletCount,
  //     kefilOfUser, state }): called on click instead of the default
  //     settings overlay. Pass a no-op to leave the button inert for now.
  // Assumes a <div id="library-card"> exists in the page.
  // ══════════════════════════════════════════════════════════════
  async function mountLibraryCard(opts) {
    const sb = opts.sb;
    const I18N = opts.I18N;
    const icon = opts.icon || GEAR_SVG;
    const cardEl = opts.mountEl || document.getElementById('library-card');
    if (!cardEl || !sb) return;

    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;
    const user = session.user;
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;

    const state = await fetchProfileData(sb, I18N, user);
    const { profile, kefaletCount, sponsoredList, sozcuCount, kefilOfUser } = state;

    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
    const yasadigiIlce = profile?.neighborhood || '';

    function avatarDisplayHTML() {
      return IstAvatar.html(state.avatarUrl, state.avatarHair, state.avatarHat, state.avatarAccessory, state.avatarShirt);
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
          <button type="button" class="edit-btn" id="lc-edit-btn" aria-label="${esc(t('profile.toggle'))}" title="${esc(t('profile.toggle'))}">${icon}</button>
        </div>
      `;
      document.getElementById('lc-edit-btn').addEventListener('click', () => {
        if (opts.onEdit) {
          opts.onEdit({ sb, I18N, user, profile, sozcuCount, kefaletCount, sponsoredList, kefilOfUser, state });
          return;
        }
        openProfileOverlay({
          sb, I18N, user, profile, page: opts.page || currentPageSlug(),
          sozcuCount, kefaletCount, sponsoredList, kefilOfUser,
          avatarUrl: state.avatarUrl,
          avatarHair: state.avatarHair,
          avatarHat: state.avatarHat,
          avatarAccessory: state.avatarAccessory,
          avatarShirt: state.avatarShirt,
          onAvatarChange(hair, hat, accessory, shirt) {
            state.avatarHair = hair;
            state.avatarHat = hat;
            state.avatarAccessory = accessory;
            state.avatarShirt = shirt;
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
    initMemberSheet,
    openMemberSheet,
    closeMemberSheet,
    AVATAR_SHIRT_OPTIONS,
    AVATAR_HAIR_OPTIONS,
    AVATAR_HAT_OPTIONS,
    AVATAR_ACCESSORY_OPTIONS,
    AVATAR_LOCK_SVG,
    GEAR_SVG,
    COFFEE_SVG,
    HOME_SVG,
    coverHTML,
    getWeekGameStatus,
    weekGridHTML,
  };
}(window));
