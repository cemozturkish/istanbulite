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
  // The petek used to be Anahane's profile page, then a sheet opened
  // from a button over Anahane's map. It is the middle page *itself*
  // now (see mountHivePage below) — the petek is who you keep close,
  // which is a destination of its own, not a page of your account.
  // Anahane's own profile is therefore the cover alone: who you are,
  // nothing else.
  //
  // Nothing here scrolls: each page's profile fits inside the sheet the
  // way a politician's does (see .profile-overlay-body in
  // profile-card.css). Adding a block to a page means checking it still
  // fits, not adding a scrollbar.
  const PROFILE_SECTIONS = {
    anahane:   { hive: false, week: false, account: false, settings: false },
    kahvehane: { hive: false, week: true,  account: false, settings: false },
    kutuphane: { hive: false, week: false, account: true,  settings: true },
  };
  const DEFAULT_PAGE = 'anahane';

  // ── Where the two names stand on the top bar, per page ──
  // The bar over the three carousel pages says where you are standing by
  // where the names on it are standing: the seat at one edge and you at
  // the other on the two pages that name a seat, and you alone in the
  // middle on Hane, which names none (the petek is the people; there is
  // no map on that page for a seat to be true of). Swiping walks your own
  // name between those three positions, so the bar makes the same move
  // the pages under it make.
  //
  // See "THE TOP BAR" in profile-card.css for the classes themselves.
  const BAR_LAYOUT = {
    kutuphane: 'ist-pc-seat-left',
    anahane:   'ist-pc-seat-none',
    kahvehane: 'ist-pc-seat-right',
  };
  const BAR_LAYOUT_CLASSES = ['ist-pc-seat-left', 'ist-pc-seat-none', 'ist-pc-seat-right'];

  // Moves the bar into `page`'s layout, sliding whichever names are
  // already on it into their new positions (a FLIP: measure, re-lay out,
  // put each block back where it was with a transform, then release it —
  // there is nothing about a flex row changing ends that CSS can
  // transition on its own).
  //
  // Called by renderPage when the row is first built (nothing to slide
  // yet), by setPage, and by router.js at the exact moment a virtual
  // navigation swaps the page under the bar — that timing is the whole
  // point: the names have to travel *with* the page, not after it.
  function setBarLayout(page, opts) {
    const row = document.querySelector('#ist-pc-mount .ist-pc-row');
    const cls = BAR_LAYOUT[page];
    if (!row || !cls || row.classList.contains(cls)) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animate = !(opts && opts.animate === false) && !reduced && window.innerWidth <= 768;
    // Only what carries words moves; an empty seat slot has nothing to
    // slide (it is emptied on every navigation, see politician-card.js).
    const movers = animate
      ? Array.from(row.querySelectorAll('.ist-pc-id')).filter(el => el.textContent.trim())
      : [];
    const before = movers.map(el => el.getBoundingClientRect().left);

    BAR_LAYOUT_CLASSES.forEach(c => row.classList.remove(c));
    row.classList.add(cls);

    movers.forEach((el, i) => {
      const dx = before[i] - el.getBoundingClientRect().left;
      if (!dx) return;
      el.style.transition = 'none';
      el.style.transform = `translateX(${dx}px)`;
    });
    // Force the offset positions above to be committed as the transition's
    // starting point before it is handed back to the stylesheet's own
    // transform transition on the next line.
    void row.offsetWidth;
    movers.forEach(el => {
      if (!el.style.transform) return;
      el.style.transition = '';
      el.style.transform = '';
    });
  }

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
  // The page the bar is currently standing over — read when you press
  // yourself (which blocks your profile shows is the page's call, see
  // PROFILE_SECTIONS) so the row itself never has to be rebuilt for it.
  let _page = DEFAULT_PAGE;

  async function mount(opts) {
    const sb = opts.sb;
    const I18N = opts.I18N;
    const page = opts.page || DEFAULT_PAGE; // 'anahane' | 'kahvehane' | 'kutuphane'
    const container = document.getElementById('ist-pc-mount');
    if (!container || !sb) return;
    _page = page;

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
      // _page rather than `page`: the reader may have swiped on while this
      // fetch was in flight, and the row has to arrive standing over the
      // page that is actually on screen.
      renderPage(container, _page, _state);
    }
  }

  // A navigation does not rebuild this row. The two lines of type on it —
  // your name and your district — are the same on all three pages; what
  // the page decides is which blocks your profile opens with
  // (PROFILE_SECTIONS, read off _page when it is opened) and where on the
  // bar the names stand. Rebuilding it would also take the seat's markup
  // and, mid-navigation, the very transform the layout move is riding on.
  function setPage(page) {
    // Recorded first, before either guard: a navigation during the bar's
    // own first fetch has nothing to move yet, but it is still the page
    // the row about to be built belongs to (see doMount).
    _page = page;
    const container = document.getElementById('ist-pc-mount');
    if (!container || !_state) return;
    if (!container.querySelector('.ist-pc-row')) { renderPage(container, page, _state); return; }
    setBarLayout(page);
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
    const yasadigiDisplay = yasadigi ? (NB_NAMES[yasadigi] || yasadigi) : '—';
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const toggleLabel = t('profile.toggle') || 'Profil';
    _page = page;

    container.innerHTML = `
      <div class="ist-pc" id="ist-pc-root">
        <div class="ist-pc-row">
          <!-- Whoever holds power over what this page is showing. Filled
               by politician-card.js (see its paintBar), never by this
               module -- the bar only keeps the slot. Which end of the row
               it stands at, and whether the page names a seat at all, is
               setBarLayout's (Kütüphane left, Kahvehane right, Hane
               none). -->
          <div class="ist-pc-seat" id="ist-pc-seat"></div>
          <!-- You. The whole block is the button that opens your profile --
               there is no gear beside it any more: on a bar where the other
               end is a person you press to read about them, pressing a
               person is already the gesture, and a gear would be a second
               way to do what pressing yourself does. -->
          <div class="ist-pc-me" id="ist-pc-me" role="button" tabindex="0"
               aria-label="${esc(toggleLabel)}" title="${esc(toggleLabel)}">
            <div class="ist-pc-id">
              <div class="ist-pc-name">${esc(displayName)}</div>
              <div class="ist-pc-meta">${esc(yasadigiDisplay)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // The row above was just rebuilt from scratch, which empties the seat
    // slot; the seat's own module knows what belonged there.
    if (global.IstPoliticianCard) global.IstPoliticianCard.paintBar();
    // Where the two names stand is the page's (see setBarLayout). Nothing
    // to slide on a row that has only just appeared.
    setBarLayout(page, { animate: false });

    const meEl = document.getElementById('ist-pc-me');
    const openMine = () => {
      openProfileOverlay({
        sb: state.sb, I18N, user, profile,
        sozcuCount, kefaletCount, sponsoredList, kefilOfUser,
        // Which blocks this profile page shows is the page's call, not
        // this card's (see PROFILE_SECTIONS). Read live rather than closed
        // over: the row outlives a navigation now (see setPage), so the
        // page it was built for is not necessarily the page it is standing
        // over when it is finally pressed.
        page: _page,
        avatarUrl: state.avatarUrl,
        avatarHair: state.avatarHair,
        avatarHat: state.avatarHat,
        avatarAccessory: state.avatarAccessory,
        avatarShirt: state.avatarShirt,
        // The bar prints no portrait (see the row's markup above), so a new
        // avatar has nothing to repaint here -- it is only recorded, for the
        // next time this sheet is opened.
        onAvatarChange(hair, hat, accessory, shirt) {
          state.avatarHair = hair;
          state.avatarHat = hat;
          state.avatarAccessory = accessory;
          state.avatarShirt = shirt;
        },
      });
    };
    meEl.addEventListener('click', openMine);
    // It is a div wearing role="button" (a real <button> around a portrait
    // and two lines of type fights the bar's own type rules), so the keys a
    // button would answer have to be answered by hand.
    meEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMine(); }
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
    // Anahane's profile (the cover and nothing else) is one fixed shape
    // rather than a column of blocks read top-down — so it sits centred
    // in the sheet instead of stacked against its top edge with the
    // whole void left under it. See .profile-overlay-centred in
    // profile-card.css.
    const show = sectionsFor(_ov.page);
    body.classList.toggle('profile-overlay-centred', !show.week && !show.account && !show.settings);
    wireSettingsEvents(_ov);
  }

  // ── THE PETEK PAGE ──
  // Hane *is* the petek. The middle page is the shared grid itself —
  // there is no map on it any more and no button to open anything: you
  // arrive on the page and you are standing in the honeycomb, which is
  // what the middle page was always about (the self and the city, and
  // the city's other half — the map — is one swipe away on Kahvehane).
  //
  // So this mounts into a node the page owns rather than into an overlay.
  // Everything below (hiveHTML, renderHive, loadHive) only ever looks up
  // #po-hive-mount by id, so none of it cares what wraps it.
  //
  // It fetches the profile itself: the compact card doesn't mount on
  // desktop (see mount), so there is no fetched state to borrow there,
  // and the page has to draw either way.
  let _sharedState = null;
  let _hive = null; // { sb, I18N, user, profile, ..., hive, hiveOpen, hiveLoaded }

  async function ensureProfileState(sb, I18N) {
    if (_state) return _state;
    if (_sharedState) return _sharedState;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    _sharedState = await fetchProfileData(sb, I18N, session.user);
    return _sharedState;
  }

  // Called by anahane on every entry — including a virtual one, which
  // swaps #ist-content and takes the previous mount with it. The map is
  // re-fetched each time on purpose: somebody else's attachment may have
  // carried this whole petek somewhere since it was last drawn (see
  // hive_bond_code in db/hive_lattice_v4.sql).
  async function mountHivePage(opts) {
    const sb = opts && opts.sb;
    const I18N = opts && opts.I18N;
    const mountId = (opts && opts.mountId) || 'hive-page';
    const host = document.getElementById(mountId);
    if (!sb || !host) return;
    host.innerHTML = `<div class="ist-hive-page">${hiveMountHTML()}</div>`;
    const st = await ensureProfileState(sb, I18N);
    // The page can be swapped out from under the fetch (a swipe away
    // while it is in flight), and then there is nothing to draw into.
    if (!st || !document.getElementById('po-hive-mount')) return;
    _hive = Object.assign({}, st, { sb, I18N, hiveOpen: null, hiveLoaded: false, hivePan: { x: 0, y: 0 } });
    _hive.hiveDisplayName = `${_hive.profile?.first_name || ''} ${_hive.profile?.last_name || ''}`.trim() || _hive.user.email;
    renderHive(_hive);
    loadHive(_hive);
  }

  // The window onto the grid is the page now, so it changes size with the
  // window — a phone rotating, a desktop window dragged narrower. The
  // drawing is re-fitted into it rather than left at the scale it was
  // measured for (see fitHive).
  window.addEventListener('resize', () => {
    if (_hive && document.getElementById('po-hive-view')) fitHive(_hive);
  });

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
  // THE PETEK (anahane's map, the PETEK button)
  //
  // One shared honeycomb, not six slots each. A member is a single
  // hexagon; attaching to somebody makes you their neighbour on a grid
  // everybody is standing on, and a third member who attaches to either
  // of you arrives into the shape the two of you have already made. What
  // you see here is that grid, drawn from where you happen to be
  // standing in it — you in the middle (always), everyone else exactly
  // where they are relative to you.
  //
  // This replaced a design where every member had a comb of their own:
  // six numbered slots, mirrored pairwise into the other person's six.
  // Two people who were both in your comb had no relation to each other
  // in it, so the drawing was a diagram of your contacts rather than a
  // thing being built — and a petek that is redrawn per viewer is not
  // one object, it is a picture of one. See db/hive_lattice_v4.sql.
  //
  // A cell is filled hand-to-hand, by code (db/hive_slots.sql): every
  // member holds one code per Istanbul week, tapping a free side of your
  // own hexagon asks for someone else's, and from then on they are
  // standing there. There is no member search and no follow button on
  // purpose — to attach to someone you have to have been told their
  // code, which means you saw them. It is a record of contact, not a
  // follower list.
  //
  // Attaching is mutual, and locked for the week it was made in: you
  // cannot unpick it until the week turns over. What is *shown* of a
  // member is the undesigned half — name and district, no more — and it
  // lands in the dock below when their hexagon is tapped, never beside
  // it, so the grid itself never moves for a tap.
  // ══════════════════════════════════════════════════════════════
  const HIVE_CODE_LENGTH = 6;

  // The six sides of a hexagon in axial coordinates, in the order the
  // drawing reads them (two above, one either side, two below). This is
  // the same numbering hive_dir() uses in db/hive_lattice_v4.sql — the
  // server decides where a member lands, and it says so in these terms,
  // so renumbering here silently mis-aims every tap.
  //
  //     0 (0,-1)   1 (+1,-1)
  //   2 (-1, 0)  ME  3 (+1, 0)
  //     4 (-1,+1)  5 ( 0,+1)
  const HIVE_DIRS = [[0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1]];
  // How far a cell scales down before the grid is panned instead. A
  // petek keeps growing and the page it is drawn on does not (see
  // .ist-hive-page in profile-card.css), so past a point shrinking it
  // further would make the members unreadable to fit a shape nobody can
  // make out anyway.
  const HIVE_MIN_SCALE = 0.45;
  // The air left after a name when the grid is fitted (see fitHive).
  const HIVE_NAME_BREATH = 5;

  function hiveMemberName(member) {
    return capitalizeName(`${member.first_name || ''} ${member.last_name || ''}`.trim()) || 'İsimsiz Üye';
  }

  function hiveMemberDistrict(member) {
    return member.neighborhood ? (NB_NAMES[member.neighborhood] || member.neighborhood) : '';
  }

  // Axial (q, r) → the cell's place on the drawing. Rows step down by
  // --ist-hive-step-y and each row is offset half a step across, which
  // is what interlocks the hexagons; both steps are written in CSS
  // against the cell width, so the whole grid is laid out in calc() and
  // holds at whatever size the cells are drawn at.
  function hivePos(q, r, minX, minY) {
    return {
      x: (q + r / 2) - minX,
      y: r - minY,
    };
  }

  // ── One cell ──
  // A member's hexagon, an empty side of your own, or you. All three are
  // absolutely placed on the plane; the first two are buttons that open
  // their panel in the dock (see hiveDockHTML) — the frame itself never
  // resizes for a tap, it is only marked, so no neighbour ever moves.
  function hiveCellHTML(inner, style, attrs, cls) {
    return `<div class="ist-hive-cell${cls ? ' ' + cls : ''}" style="${style}" ${attrs || ''}>${inner}</div>`;
  }

  // ── The name beside a hexagon ──
  // A member is named in the paper *outside* their own frame, on
  // whichever side of the reader they are standing: everyone to the left
  // of you is named to the left of their hexagon, ranged right against
  // it, and everyone to the right is named to the right, ranged left —
  // so the names read outward from the middle the way the old comb's
  // readouts did, and the middle of the drawing stays the people.
  //
  // The label is only printed when the cell just outside it is empty. It
  // lives in the drawing's own gaps, so a name can never be laid over
  // somebody's frame; a member walled in on their outer side is named by
  // the dock when they are tapped, which is where the district is
  // anyway. It is absolutely placed and never in flow — a name is a
  // caption on the drawing, and nothing about the packing may depend on
  // how long somebody's name happens to be.
  function hiveNameHTML(member, side) {
    if (!side) return '';
    return `<span class="ist-hive-name ist-hive-name-${side}">${esc(hiveMemberName(member))}</span>`;
  }

  function hiveMemberCellHTML(member, style, isOpen, nameSide) {
    const name = hiveMemberName(member);
    const cls = `ist-hive-filled${member.bonded ? ' ist-hive-bonded' : ''}${isOpen ? ' ist-hive-cell-open' : ''}`;
    return `
      <button type="button" class="ist-hive-cell ${cls}" style="${style}"
              data-member="${esc(member.member_id)}" aria-expanded="${isOpen ? 'true' : 'false'}"
              title="${esc(name)}" aria-label="${esc(name)}">
        <div class="ist-pc-cover-avatar ist-hive-frame">
          ${coverBadgesHTML(member)}
          <div class="ist-pc-cover-art">${coverAvatarHTML(member.avatar_url, member.avatar_hair, member.avatar_hat, member.avatar_accessory, member.avatar_shirt)}</div>
        </div>
        ${hiveNameHTML(member, nameSide)}
      </button>
    `;
  }

  function hiveEmptyCellHTML(dir, style, isOpen, t) {
    const label = t('profile.hive.empty');
    return `
      <button type="button" class="ist-hive-cell ist-hive-empty${isOpen ? ' ist-hive-cell-open' : ''}" style="${style}"
              data-dir="${dir}" aria-expanded="${isOpen ? 'true' : 'false'}"
              title="${esc(label)}" aria-label="${esc(label)}">
        <div class="hexframe ist-hive-frame ist-hive-slot">
          <span class="ist-hive-plus" aria-hidden="true">+</span>
        </div>
      </button>
    `;
  }

  function hiveMeCellHTML(opts, style) {
    const { profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName } = opts;
    return hiveCellHTML(`
      <div class="ist-pc-cover-avatar ist-hive-frame" title="${esc(displayName)}">
        ${coverBadgesHTML(profile)}
        <div class="ist-pc-cover-art">${coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt)}</div>
      </div>
    `, style, '', 'ist-hive-me');
  }

  // ── The grid ──
  // Everyone on the caller's map, plus the free sides of the caller's own
  // hexagon — those are the only openings shown, because they are the
  // only ones the caller can attach to. Somebody else's free sides are
  // theirs to give away, not yours to fill.
  function hiveGridHTML(opts) {
    const t = opts.t;
    const cells = (opts.hive && opts.hive.cells) || [];
    const open = opts.open || null;
    const taken = new Set(cells.map(c => `${c.q},${c.r}`));
    // The caller stands at (0,0) too — a name must not be printed over
    // their frame either.
    const occupied = new Set(taken); occupied.add('0,0');

    const items = [{ q: 0, r: 0, kind: 'me' }];
    cells.forEach(c => items.push({ q: c.q, r: c.r, kind: 'member', member: c }));
    HIVE_DIRS.forEach((v, dir) => {
      if (!taken.has(`${v[0]},${v[1]}`)) items.push({ q: v[0], r: v[1], kind: 'empty', dir });
    });

    // The plane is sized to what is actually on it, then centred on the
    // caller's own cell by renderHive — so the reader is in the middle
    // whatever shape has grown around them.
    const xs = items.map(i => i.q + i.r / 2);
    const ys = items.map(i => i.r);
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);

    const html = items.map(item => {
      const p = hivePos(item.q, item.r, minX, minY);
      const style = `left: calc(var(--ist-hive-step-x) * ${p.x}); top: calc(var(--ist-hive-step-y) * ${p.y});`;
      if (item.kind === 'me') return hiveMeCellHTML(opts, style);
      if (item.kind === 'member') {
        // Which side of the reader they are standing on — and whether the
        // cell further out that way is free to print a name into.
        const side = (item.q + item.r / 2) < 0 ? 'left' : 'right';
        const outward = side === 'left' ? `${item.q - 1},${item.r}` : `${item.q + 1},${item.r}`;
        const nameSide = occupied.has(outward) ? null : side;
        return hiveMemberCellHTML(item.member, style, !!open && open.member === item.member.member_id, nameSide);
      }
      return hiveEmptyCellHTML(item.dir, style, !!open && open.dir === item.dir, t);
    }).join('');

    const w = `calc(var(--ist-hive-step-x) * ${maxX - minX} + var(--ist-hive-cell-w))`;
    const h = `calc(var(--ist-hive-step-y) * ${maxY - minY} + var(--ist-hive-cell-h))`;
    return `
      <div class="ist-hive" id="po-hive-view">
        <div class="ist-hive-plane" id="po-hive-plane" style="width: ${w}; height: ${h};">${html}</div>
      </div>
    `;
  }

  // ── The dock ──
  // One fixed spot under the grid that a tap talks to, so nothing on the
  // grid itself has to grow, shift or make room. It rests on your own
  // code when nothing is selected, and swaps to the tapped hexagon's
  // panel while one is open: the code form for a free side, the member
  // for a taken one — with Çıkar when you are the one attached to them,
  // and why not when you are not.
  function hiveCodeHTML(hive, t) {
    if (!hive || !hive.code) return `<div class="ist-hive-code ist-hive-code-empty">&nbsp;</div>`;
    return `
      <div class="ist-hive-code">
        <span class="ist-hive-code-label">${esc(t('profile.hive.codelabel'))}</span>
        <span class="ist-hive-code-value">${esc(hive.code)}</span>
        <button type="button" class="ist-pc-copy" id="po-hive-copy">${esc(t('profile.copy'))}</button>
        <span class="ist-hive-code-hint">${esc(t('profile.hive.codehint'))}</span>
      </div>
    `;
  }

  function hiveMemberPanelHTML(member, open, t) {
    const nb = hiveMemberDistrict(member);
    let action;
    if (!member.bonded) {
      // Somebody else's neighbour. You can see them — the petek is one
      // shape and it would be a lie to hide part of it — but they are
      // not yours to detach, and you attach to them the same way you
      // attach to anyone: by being handed their code.
      action = `<div class="ist-hive-ext-note">${esc(t('profile.hive.notyours'))}</div>`;
    } else if (member.locked) {
      action = `<div class="ist-hive-ext-note">${esc(t('profile.hive.lockednote'))}</div>`;
    } else {
      action = `<button type="button" class="ist-hive-remove" id="po-hive-remove">${esc(t('profile.hive.remove'))}</button>`;
    }
    return `
      <div class="ist-hive-readout-name">${esc(hiveMemberName(member))}</div>
      ${nb ? `<div class="ist-hive-readout-meta">${esc(nb)}</div>` : ''}
      ${action}
      <div class="ist-hive-ext-msg" id="po-hive-msg">${esc(open.error || '')}</div>
    `;
  }

  function hiveFormHTML(open, t) {
    return `
      <label class="ist-hive-ext-label" for="po-hive-code">${esc(t('profile.hive.codeprompt'))}</label>
      <input class="ist-pc-input ist-hive-input" id="po-hive-code" type="text"
             inputmode="latin" autocomplete="off" autocapitalize="characters" spellcheck="false"
             maxlength="${HIVE_CODE_LENGTH}" placeholder="${'•'.repeat(HIVE_CODE_LENGTH)}"
             value="${esc(open.value || '')}">
      <button type="button" class="ist-pc-save ist-hive-submit" id="po-hive-submit">${esc(t('profile.hive.add'))}</button>
      <div class="ist-hive-ext-msg" id="po-hive-msg">${esc(open.error || '')}</div>
    `;
  }

  function hiveDockHTML(opts) {
    const t = opts.t;
    const open = opts.open;
    if (open && open.member) {
      const member = ((opts.hive && opts.hive.cells) || []).find(c => c.member_id === open.member);
      if (member) return `<div class="ist-hive-dock-panel">${hiveMemberPanelHTML(member, open, t)}</div>`;
    }
    if (open && open.dir != null) {
      return `<div class="ist-hive-dock-panel">${hiveFormHTML(open, t)}</div>`;
    }
    return hiveCodeHTML(opts.hive, t);
  }

  function hiveHTML(opts) {
    return `
      ${hiveGridHTML(opts)}
      <div class="ist-hive-dock" id="po-hive-dock">${hiveDockHTML(opts)}</div>
    `;
  }

  // ── The petek's own little render/fetch loop ──
  // It re-renders in place (into #po-hive-mount) rather than through
  // renderOverlayBody, so opening a hexagon or closing it again doesn't
  // rebuild the rest of the profile page under it.
  function hiveMountHTML() {
    return `<div id="po-hive-mount"></div>`;
  }

  // ── Fitting the grid into a page that never resizes ──
  // The window is whatever room the page has (see .ist-hive-page in
  // profile-card.css) and the petek grows without asking it. So the
  // drawing is scaled to fit that room, centred on the caller's own cell
  // — and when it would have to shrink past legibility it is left at
  // that floor and dragged instead.
  function fitHive(state) {
    const view = document.getElementById('po-hive-view');
    const plane = document.getElementById('po-hive-plane');
    if (!view || !plane) return;
    const me = plane.querySelector('.ist-hive-me');
    if (!me) return;

    const vw = view.clientWidth, vh = view.clientHeight;
    const pw = plane.offsetWidth, ph = plane.offsetHeight;
    // The grid is drawn before the page is unhidden (see
    // renderHiveOverlayBody), so the first measurement is a screenful of
    // zeroes. Wait for a frame that has real numbers in it rather than
    // leaving the plane hanging off the middle of a window it was never
    // measured against — bounded, so a page that is closed again before
    // it ever laid out doesn't leave a frame loop behind.
    if (!vw || !vh || !pw || !ph) {
      const tries = (state.hiveFitTries || 0) + 1;
      state.hiveFitTries = tries;
      if (tries < 30) requestAnimationFrame(() => fitHive(state));
      return;
    }
    state.hiveFitTries = 0;

    const cx = me.offsetLeft + me.offsetWidth / 2;
    const cy = me.offsetTop + me.offsetHeight / 2;
    // The names hang outside the plane's own box (see hiveNameHTML), so
    // the drawing is wider than the cells are: measure what is actually
    // on the paper rather than what the grid's arithmetic came to, or the
    // outermost name is the one thing the window clips.
    let minL = 0, maxR = pw;
    plane.querySelectorAll('.ist-hive-name').forEach(el => {
      const left = el.parentElement.offsetLeft + el.offsetLeft;
      // A capital with letter-spacing after it paints a little past its
      // own box, so the track is not quite the ink: fit the wider of the
      // two, and leave a breath after it — a name whose last letter lands
      // exactly on the window's edge reads as a clipped name, not a
      // fitted one.
      const w = Math.max(el.offsetWidth, el.scrollWidth) + HIVE_NAME_BREATH;
      if (left - HIVE_NAME_BREATH < minL) minL = left - HIVE_NAME_BREATH;
      if (left + w > maxR) maxR = left + w;
    });

    // What has to fit is not the drawing's own box but the box it needs
    // *around the reader*: they stay in the middle of the window, so a
    // petek that has grown out to one side only is still asking for that
    // much room on both. Fitting the raw box instead leaves the far side
    // clipped by a window the arithmetic had just called roomy.
    const reqW = 2 * Math.max(cx - minL, maxR - cx);
    const reqH = 2 * Math.max(cy, ph - cy);
    const scale = Math.max(HIVE_MIN_SCALE, Math.min(1, vw / reqW, vh / reqH));

    // Scaling about the caller's own cell and then hanging that point off
    // the middle of the window keeps them in the middle at any scale —
    // and the pan, when there is one, is a plain offset from there.
    const pan = state.hivePan || { x: 0, y: 0 };
    state.hiveFit = { scale, cx, cy, vw, vh, reqW, reqH };
    plane.style.transformOrigin = `${cx}px ${cy}px`;
    plane.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
    plane.style.marginLeft = `${-cx}px`;
    plane.style.marginTop = `${-cy}px`;
    // Panning is only offered when the fit had to give up: a grid that
    // fits has nowhere to go, and a page that slides under the finger
    // for no reason reads as broken.
    const pannable = (reqW * scale > vw + 1) || (reqH * scale > vh + 1);
    view.classList.toggle('ist-hive-pannable', pannable);
    if (!pannable && (pan.x || pan.y)) {
      state.hivePan = { x: 0, y: 0 };
      plane.style.transform = `scale(${scale})`;
    }
  }

  function renderHive(state) {
    const mount = document.getElementById('po-hive-mount');
    if (!mount) return;
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    // Replacing the mount's markup destroys the code field, so if the
    // caret was in it (loadHive landing mid-typing, say) it is put back
    // afterwards rather than dropping the user out of the field.
    if (document.activeElement && document.activeElement.id === 'po-hive-code') state.hiveFocusInput = true;
    mount.innerHTML = hiveHTML({
      profile: state.profile,
      avatarUrl: state.avatarUrl, avatarHair: state.avatarHair, avatarHat: state.avatarHat,
      avatarAccessory: state.avatarAccessory, avatarShirt: state.avatarShirt,
      displayName: state.hiveDisplayName || '',
      hive: state.hive, open: state.hiveOpen, t,
    });
    fitHive(state);
    wireHiveEvents(state);
  }

  // Both calls are best-effort: before db/hive_lattice_v4.sql has been
  // run the RPCs simply aren't there, and the petek should still draw
  // (your own hexagon with six free sides, no code) rather than the page
  // failing to open.
  async function loadHive(state) {
    state.hiveLoaded = true;
    const { sb } = state;
    const [codeRes, mapRes] = await Promise.all([
      sb.rpc('hive_my_code'),
      sb.rpc('hive_map'),
    ]);
    const code = Array.isArray(codeRes.data) ? codeRes.data[0] : codeRes.data;
    state.hive = { code: code ? code.code : null, cells: mapRes.data || [] };
    renderHive(state);
  }

  async function reloadHiveMap(state) {
    const { data } = await state.sb.rpc('hive_map');
    state.hive = Object.assign({}, state.hive, { cells: data || [] });
  }

  // Dragging the grid. Only ever offered when the drawing genuinely
  // outruns the page (see fitHive); it moves the plane and nothing else,
  // so the dock below stays exactly where the finger left it.
  function wireHivePan(state) {
    const view = document.getElementById('po-hive-view');
    const plane = document.getElementById('po-hive-plane');
    if (!view || !plane || !view.classList.contains('ist-hive-pannable')) return;
    let from = null;

    view.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      from = { x: e.clientX, y: e.clientY, pan: Object.assign({ x: 0, y: 0 }, state.hivePan) };
      view.setPointerCapture(e.pointerId);
    });
    view.addEventListener('pointermove', (e) => {
      if (!from) return;
      const fit = state.hiveFit || { scale: 1, reqW: 0, reqH: 0, vw: 0, vh: 0 };
      // Clamped to the drawing's own overhang, so the petek can never be
      // dragged off the page and lost.
      const slackX = Math.max(0, (fit.reqW * fit.scale - fit.vw) / 2);
      const slackY = Math.max(0, (fit.reqH * fit.scale - fit.vh) / 2);
      const x = Math.max(-slackX, Math.min(slackX, from.pan.x + (e.clientX - from.x)));
      const y = Math.max(-slackY, Math.min(slackY, from.pan.y + (e.clientY - from.y)));
      state.hivePan = { x, y };
      plane.style.transform = `translate(${x}px, ${y}px) scale(${fit.scale})`;
    });
    ['pointerup', 'pointercancel'].forEach(ev => view.addEventListener(ev, () => { from = null; }));
  }

  function wireHiveEvents(state) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const mount = document.getElementById('po-hive-mount');
    if (!mount) return;

    // Bound to the mount, never to `document`: all three carousel pages
    // share one document (see router.js), so a document-level handler
    // would keep firing after navigating away from Anahane.
    mount.querySelectorAll('.ist-hive-cell[data-dir]').forEach(cell => {
      cell.addEventListener('click', () => {
        const dir = parseInt(cell.dataset.dir, 10);
        // Pressing the open hexagon again folds it back up, so the frame
        // is its own close button and nothing else has to carry one.
        state.hiveOpen = (state.hiveOpen && state.hiveOpen.dir === dir)
          ? null
          : { dir, value: '', error: '' };
        state.hiveFocusInput = !!state.hiveOpen;
        renderHive(state);
      });
    });

    mount.querySelectorAll('.ist-hive-cell[data-member]').forEach(cell => {
      cell.addEventListener('click', () => {
        const id = cell.dataset.member;
        state.hiveOpen = (state.hiveOpen && state.hiveOpen.member === id)
          ? null
          : { member: id, value: '', error: '' };
        renderHive(state);
      });
    });

    const copyBtn = document.getElementById('po-hive-copy');
    if (copyBtn) copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText((state.hive && state.hive.code) || '');
      const orig = copyBtn.textContent;
      copyBtn.textContent = t('profile.copied');
      setTimeout(() => { copyBtn.textContent = orig; }, 1500);
    });

    const input = document.getElementById('po-hive-code');
    const submit = document.getElementById('po-hive-submit');
    if (input && submit) {
      input.addEventListener('input', () => {
        // The codes are printed uppercase and read off a screen, so type
        // them in whatever case and drop anything that isn't in the
        // alphabet (see db/hive_slots.sql).
        const cleaned = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, HIVE_CODE_LENGTH);
        if (cleaned !== input.value) input.value = cleaned;
        if (state.hiveOpen) state.hiveOpen.value = cleaned;
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit.click();
        if (e.key === 'Escape') { state.hiveOpen = null; renderHive(state); }
      });
      submit.addEventListener('click', () => bindHiveMember(state, input.value));
      // Focus only when the panel has just been opened, not on every
      // re-render: loadHive landing while a code is half-typed would
      // otherwise yank the caret back to the start of the field.
      if (state.hiveFocusInput) {
        state.hiveFocusInput = false;
        input.focus();
      }
    }

    const removeBtn = document.getElementById('po-hive-remove');
    if (removeBtn) removeBtn.addEventListener('click', () => unbindHiveMember(state));

    wireHivePan(state);
  }

  // Attaching. The direction is the side of your own hexagon you tapped;
  // where the other member's petek ends up — and whether their whole
  // formation can be carried over to meet yours at all — is the server's
  // call (see hive_bond_code in db/hive_lattice_v4.sql), which is why
  // every outcome here is a status this prints rather than a guess made
  // before asking.
  async function bindHiveMember(state, rawCode) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const open = state.hiveOpen;
    if (!open || open.dir == null) return;
    const code = String(rawCode || '').trim().toUpperCase();
    const msgEl = document.getElementById('po-hive-msg');
    const btn = document.getElementById('po-hive-submit');
    if (code.length !== HIVE_CODE_LENGTH) {
      open.error = t('profile.hive.err.short');
      if (msgEl) msgEl.textContent = open.error;
      return;
    }

    btn.disabled = true;
    open.error = '';
    if (msgEl) msgEl.textContent = '';
    const { data, error } = await state.sb.rpc('hive_bond_code', { p_code: code, p_dir: open.dir });
    const row = Array.isArray(data) ? data[0] : data;
    const status = error ? 'failed' : ((row && row.status) || 'failed');

    if (status !== 'ok') {
      btn.disabled = false;
      open.value = code;
      open.error = t(`profile.hive.err.${status}`);
      if (msgEl) msgEl.textContent = open.error;
      return;
    }

    // Attached: the whole map is re-fetched rather than the one cell
    // patched in, because this one attachment may have carried an entire
    // petek over to meet yours — everybody's coordinates can have
    // changed, including your own.
    await reloadHiveMap(state);
    state.hiveOpen = null;
    state.hivePan = { x: 0, y: 0 };
    renderHive(state);
  }

  // Çıkar is mutual, like the attaching was, and it is refused for the
  // whole week the bond was made in — the server says so with a status
  // rather than the button being hidden, because a lock the reader can
  // see is a rule and a missing button is a bug.
  async function unbindHiveMember(state) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const open = state.hiveOpen;
    if (!open || !open.member) return;
    const btn = document.getElementById('po-hive-remove');
    if (btn) btn.disabled = true;
    const { data, error } = await state.sb.rpc('hive_unbond', { p_member_id: open.member });
    const row = Array.isArray(data) ? data[0] : data;
    const status = error ? 'failed' : ((row && row.status) || 'failed');

    if (status !== 'ok') {
      if (btn) btn.disabled = false;
      open.error = t(`profile.hive.err.${status}`);
      const msgEl = document.getElementById('po-hive-msg');
      if (msgEl) msgEl.textContent = open.error;
      if (status === 'locked') await reloadHiveMap(state);
      return;
    }

    // Gone: the dock falls back to your own code, which is the natural
    // next move after taking someone out — the side they were standing
    // on is free again and takes a code.
    await reloadHiveMap(state);
    state.hiveOpen = null;
    renderHive(state);
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
          ${coverHTML({ profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName, metaText: yasadigiDisplay, editable: true, customizing, sozcuCount })}
          <div class="ist-pc-avatar-msg" id="po-avatar-msg" role="status" aria-live="polite"></div>

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
    // this was opened from (see PROFILE_SECTIONS). The petek is no
    // longer one of them — it is a page of its own now (Hane), with its
    // own render path (see mountHivePage).
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
    setBarLayout,
    unmount,
    mountLibraryCard,
    openProfileOverlay,
    closeProfileOverlay,
    mountHivePage,
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
