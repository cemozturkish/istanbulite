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

  // ── Somebody else's name, where your own name stands ──
  // Hane names no seat (see BAR_LAYOUT): the bar over the petek carries
  // you alone, in the middle. Pressing a member on the petek puts *them*
  // there instead — the one place on the screen that is already a name
  // with a district under it, and already a thing you press to read
  // about somebody. So the petek says who, the bar says their name, and
  // the bar's own gesture — press a person, open their profile — is what
  // opens them. Nothing new had to be invented for the second step: it
  // is the gesture the bar has always had, aimed at somebody else.
  //
  // Kept at module scope rather than on the row, because the row is
  // rebuilt (renderPage) and swapped between layouts (setBarLayout)
  // under it, and a name that survived neither would be lost to a
  // re-render nobody asked for. It IS cleared by anything that means the
  // reader has left them behind: another depth of the petek, another
  // page (router.js), a fresh mount of the page itself.
  let _barMember = null;   // { id, name, meta }

  function setBarMember(member) {
    _barMember = member ? {
      id: String(member.member_id),
      name: hiveMemberName(member),
      meta: hiveMemberDistrict(member) || '—',
    } : null;
    paintBarMe();
  }

  function clearBarMember() {
    if (!_barMember) return;
    setBarMember(null);
  }

  function barMemberId() {
    return _barMember ? _barMember.id : null;
  }

  // Paints whichever of the two the bar is currently carrying into the
  // one block. Your own name is kept on the element rather than read
  // back out of the module's state, so this stays true after a
  // renderPage that this module did not drive.
  function paintBarMe() {
    const me = document.getElementById('ist-pc-me');
    if (!me) return;
    const nameEl = me.querySelector('.ist-pc-name');
    const metaEl = me.querySelector('.ist-pc-meta');
    if (!nameEl || !metaEl) return;
    nameEl.textContent = _barMember ? _barMember.name : (me.dataset.selfName || '');
    metaEl.textContent = _barMember ? _barMember.meta : (me.dataset.selfMeta || '');
    me.classList.toggle('ist-pc-me-other', !!_barMember);
    const label = _barMember ? _barMember.name : (me.dataset.selfLabel || '');
    me.setAttribute('aria-label', label);
    me.setAttribute('title', label);
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
    // 'crown' is parked, not deleted: assets/avatar-hat-crown.png was
    // never actually drawn, so offering it let a member "unlock" a hat
    // that then rendered as nothing (avatar.js's hat ? <img> : '' quietly
    // skips a hat with no URL). Re-add the option once the art exists —
    // avatar.js's HAT_URLS/hatUrl() and the reward count below are
    // untouched, so that's the whole of turning it back on.
    // { value: 'crown', label: 'Sözcü Tacı', requiresSozcuCount: IstAvatar.SOZCU_REQUIRED_COUNT },
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
          <img src="${b.src}" alt="${esc(b.label)}" decoding="async">
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
    const themePrefForApply = normalizeTheme(profile?.theme_pref);
    // Apply the freshly-fetched DB value now, synchronously, so the
    // avatar (and everything else gated on Palette.current) renders in
    // the right colors immediately instead of racing the slower
    // Palette.syncFromSupabase call some pages also make on load.
    if (global.Palette) {
      global.Palette.setPalette(palettePref);
      global.Palette.setTheme(themePrefForApply);
    }

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
               data-self-name="${esc(displayName)}" data-self-meta="${esc(yasadigiDisplay)}"
               data-self-label="${esc(toggleLabel)}"
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
    // The row above was built with your own name in it; if the petek had
    // put somebody else's there, it goes back.
    paintBarMe();

    const meEl = document.getElementById('ist-pc-me');
    const openMine = () => {
      // Whoever the bar is naming is who it opens. Read live: the petek
      // can have swapped the name under this handler at any point since
      // the row was built (see setBarMember).
      const other = barMemberId();
      if (other) { openMemberSheet(other); return; }
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
  // hive_claim_slot in db/hive_slot_codes_v5.sql).
  async function mountHivePage(opts) {
    const sb = opts && opts.sb;
    const I18N = opts && opts.I18N;
    const mountId = (opts && opts.mountId) || 'hive-page';
    const host = document.getElementById(mountId);
    if (!sb || !host) return;
    host.innerHTML = `<div class="ist-hive-page ist-hive-level-${HIVE_LEVEL_DEFAULT}" id="po-hive-page">${hiveMountHTML()}</div>`;
    const st = await ensureProfileState(sb, I18N);
    // The page can be swapped out from under the fetch (a swipe away
    // while it is in flight), and then there is nothing to draw into.
    if (!st || !document.getElementById('po-hive-mount')) return;
    // The reader arrives at the middle depth every time, including after
    // a swipe away and back — the same rule the three carousel pages
    // follow (see "Always in the middle" in CLAUDE.md).
    _hive = Object.assign({}, st, {
      sb, I18N, hiveOpen: null, hiveLoaded: false, hiveSelected: null,
      hivePan: { x: 0, y: 0 }, hiveLevel: HIVE_LEVEL_DEFAULT,
      // ── The map this page was standing on last time ──
      // Every entry re-fetches it (somebody else's attachment may have
      // carried the whole petek somewhere), but the fetch takes a beat
      // and the grid is drawn before it lands. Drawn from nothing, that
      // first frame is the reader alone in six empty sides -- a shape
      // three times the size of the real one, since fitHive quite
      // correctly fills the window with what it was given -- and the
      // page visibly collapses into itself when the map arrives. So a
      // re-entry starts from what was on the screen when it left, and
      // the fetch only ever moves it.
      hive: _hiveMap,
    });
    // Arriving at the middle depth means arriving with nobody picked, so
    // the bar carries you again — a name left on it from the last time
    // this page was standing would be naming a hexagon that is no longer
    // even drawn.
    clearBarMember();
    _hive.hiveDisplayName = `${_hive.profile?.first_name || ''} ${_hive.profile?.last_name || ''}`.trim() || _hive.user.email;
    // Level 0's block and the rail are the page's furniture rather than
    // the drawing's: they are built once, here, so a re-render of the
    // grid never rebuilds them and the gestures wired to the page below
    // stay bound to nodes that are still there.
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const page = document.getElementById('po-hive-page');
    page.insertAdjacentHTML('beforeend', hiveSelfHTML(_hive) + hiveRailHTML(t));
    wireHiveSelf(_hive);
    // A first load has no last time to start from: rather than draw the
    // wrong shape and correct it, the drawing is held back until the map
    // lands (a beat, and blank paper is not a lie). Cleared by loadHive
    // whatever the answer -- including no answer at all, since a member
    // standing alone on their own petek is a real state and must draw.
    if (!(_hiveMap && _hiveMap.cells)) page.classList.add('ist-hive-waiting');
    renderHive(_hive);
    wireHiveGestures(_hive);
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
      return `<img class="ist-pc-cover-badge" data-id="${badge.id}" draggable="false" decoding="async" style="left:${p.x}%; top:${p.y}%;" src="${badge.src}" alt="${esc(badge.label)}" title="${esc(badge.label)}">`;
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

  // ── The petek's three depths ──
  // One drawing, three levels, and the reader swipes up and down through
  // them. The middle page zooms rather than paginating: what changes is
  // how far out the reader is standing in the same honeycomb, not which
  // page they are on — which is the whole difference between a level and
  // a tab.
  //
  //   0 — SEN         your own hexagon alone, drawn large, with what is
  //                   yours to change printed under it. Nobody else.
  //   1 — YANINDAKİLER you and the six places touching you. Whoever
  //                   stands in one is named; a place nobody stands in is
  //                   left empty and says nothing — there is no "+" at
  //                   this depth, because handing a seat out is a thing
  //                   you do to the petek and this level is about who is
  //                   already beside you.
  //   2 — PETEK       all of it: their neighbours too, the field around
  //                   the whole thing, and the six seats you can offer
  //                   with the code that fills them. No names here — at
  //                   the size the whole shape is drawn at, the names
  //                   would be the only thing on the page, and the shape
  //                   is what this level is for.
  //
  // A level is simply the ring (hex distance from the reader) a cell is
  // allowed to stand at, so changing level is one comparison per cell and
  // never a re-render: cells fade, the plane rescales, and both
  // transitions are the stylesheet's.
  const HIVE_LEVELS = 3;
  // The outermost level, where the whole map is drawn and the seats can
  // actually be handed out.
  const HIVE_LEVEL_ALL = HIVE_LEVELS - 1;
  // Where the reader arrives: the middle one, the way they arrive on the
  // middle page (see "Always in the middle" in CLAUDE.md).
  const HIVE_LEVEL_DEFAULT = 1;
  // How far each level lets the drawing grow. fitHive still shrinks below
  // these to fit the window for levels 0/1 — this is a ceiling, not a
  // size. Level 2 is fixed at it instead (see fitHive): the outermost
  // level draws every hexagon at the SAME size the middle depth does,
  // rather than shrinking the whole shape down to show all of it.
  // Level 0 shares its window with the avatar arrows beside the hexagon
  // and the three preferences under it, so it is drawn a step smaller
  // than a hexagon alone would allow.
  const HIVE_LEVEL_ZOOM = [2.2, 1.5, 1.5];
  // How far a finger has to travel *past the end of the drawing* before
  // the level changes under it, and how far it has to travel at all
  // before the gesture is one rather than a tap.
  const HIVE_LEVEL_SWIPE = 56;
  const HIVE_GESTURE_SLOP = 8;
  // The air between the drawing and the block under it on level 0.
  const HIVE_SELF_GAP = 14;
  // The paper left between the foot of the drawing and a card standing
  // open in the strip below it (see fitHive's offsetY).
  const HIVE_CARD_GAP = 10;

  // How far from the reader a cell is standing, in hexagons. This is the
  // level filter, and also what the level-2 wave-in stagger and the
  // ring-1 slide-out key off (see hiveGridHTML, .ist-hive-wave-in).
  function hiveRing(q, r) {
    return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  }

  // A sanity cap on the field's reach, in cells either side of the
  // reader. Nothing sane needs more than this many to outrun a screen,
  // and a miscomputed step must not be allowed to ask for thousands of
  // hexagons.
  const HIVE_FIELD_MAX = 24;

  // How far the field has to reach, in cells, for the honeycomb to run
  // off every edge of the screen rather than stopping in mid-air with
  // bare paper past it. Two things about the measurement:
  //
  // The steps are measured off a real .ist-hive-page box, and one is
  // built for the measurement when the page is not on screen yet — this
  // runs while the page's own markup is still being *built* (renderHive
  // calls hiveGridHTML before anything is in the document), so looking
  // the page up and giving up when it isn't there is how the field ended
  // up three rings wide on a first paint and stayed that way.
  //
  // And what has to be covered is the SCREEN, not the box the page
  // happens to occupy: the outermost depth lets the drawing run under
  // the events column and past the tab bar (see .ist-hive's overflow at
  // that level), so a field cut to the page's own row is cut exactly
  // where the reader can still see it. The scale is assumed to be the
  // smallest a cell is ever drawn at (HIVE_MIN_SCALE) rather than the
  // one fitHive will land on, on purpose: too far is a few extra hidden
  // outlines, too short is bare paper at an edge.
  function hiveFieldReach() {
    const page = document.getElementById('po-hive-page');
    const host = page || document.createElement('div');
    if (!page) {
      host.className = 'ist-hive-page';
      host.style.cssText = 'position:absolute; left:-9999px; top:0; visibility:hidden;';
      document.body.appendChild(host);
    }
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute; visibility:hidden; width:var(--ist-hive-step-x); height:var(--ist-hive-step-y);';
    host.appendChild(probe);
    const rect = probe.getBoundingClientRect();
    probe.remove();
    if (!page) host.remove();
    const stepX = rect.width * HIVE_MIN_SCALE;
    const stepY = rect.height * HIVE_MIN_SCALE;
    if (!(stepX > 0) || !(stepY > 0)) return { cols: 4, rows: 4 }; // before anything has ever laid out
    // On a phone the clip is lifted at the outermost depth, so what has
    // to be covered is the screen itself; on a desktop the drawing is
    // still clipped to the middle column, and reaching past it would be
    // a few hundred outlines nobody can ever see.
    const phone = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    const boxW = (page && page.clientWidth) || 0;
    const boxH = (page && page.clientHeight) || 0;
    const halfW = (phone || !boxW ? Math.max(window.innerWidth || 0, boxW, 360) : boxW) / 2;
    const halfH = (phone || !boxH ? Math.max(window.innerHeight || 0, boxH, 640) : boxH) / 2;
    const clamp = (n) => Math.min(HIVE_FIELD_MAX, Math.max(2, Math.ceil(n) + 1));
    return { cols: clamp(halfW / stepX), rows: clamp(halfH / stepY) };
  }

  // How much of the window's foot belongs to the page rather than to the
  // drawing, in px. Written in the stylesheet (--ist-hive-reserve, see
  // profile-card.css) because it is the phone's number, and MEASURED
  // rather than read: the value is a min() of a viewport unit and a cap,
  // which getPropertyValue hands back as its own unresolved text.
  function hiveBandReserve(varName) {
    const page = document.getElementById('po-hive-page');
    if (!page) return 0;
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute; visibility:hidden; width:0; height:var(${varName}, 0px);`;
    page.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    return h > 0 ? h : 0;
  }

  function hiveLevel(state) {
    const lvl = state && state.hiveLevel;
    return (typeof lvl === 'number') ? lvl : HIVE_LEVEL_DEFAULT;
  }

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
  // A member's hexagon, a free side of your own, you, or an empty place
  // in the field. Every one of them is absolutely placed on the plane and
  // none of them resizes for a press — what a press changes happens
  // *inside* the frame (the seat's code, your own code field), so no
  // neighbour ever moves.

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
  //
  // Under the name, where the member stands in their own day: how much
  // of the news is still stacked in their Kütüphane, and how far into
  // the day's games they have got. This is the app's own formula
  // (people → their ideas → our opinions on those ideas) written on the
  // drawing itself — a name says somebody is beside you, these two lines
  // say they are in the middle of the same day you are, which is the
  // thing actually worth walking up to them about. It is deliberately
  // two numbers and no titles: what they are reading is theirs, that
  // they have three left to read is the city's.
  function hiveNameHTML(member, side, status, t) {
    if (!side) return '';
    return `
      <span class="ist-hive-name ist-hive-name-${side}">
        <span class="ist-hive-name-label">${esc(hiveMemberName(member))}</span>
        ${hiveStatHTML(status, t)}
      </span>`;
  }

  // Above this the count stops being a number and becomes "a stack" —
  // the deck itself only ever draws three cards, so there is nothing
  // past the third for the count to be true of anyway.
  const HIVE_NEWS_MAX = 3;

  function hiveStatHTML(status, t) {
    if (!status) return '';
    const rows = [];
    const news = Math.max(0, status.news_stacked | 0);
    // Nothing left to read is not a score of zero, it is an empty deck —
    // and an empty deck says so on its own page ("Hepsi bu kadar"). On
    // somebody else's hexagon it is simply not a line.
    if (news > 0) {
      const n = news > HIVE_NEWS_MAX ? `${HIVE_NEWS_MAX}+` : String(news);
      rows.push(`<span class="ist-hive-stat">${n} ${esc(t('profile.hive.stat.news'))}</span>`);
    }
    // The fraction is printed whether or not they have started: 0/3 is
    // the whole point of it — a day with three games in front of it —
    // and it disappears only on a day the admin left with no games at
    // all, where there is no sequence for anybody to be inside.
    if ((status.games_total | 0) > 0) {
      rows.push(`<span class="ist-hive-stat">${status.games_played | 0}/${status.games_total | 0} ${esc(t('profile.hive.stat.games'))}</span>`);
    }
    if (!rows.length) return '';
    return `<span class="ist-hive-stats">${rows.join('')}</span>`;
  }

  // A member on the grid. Pressing one **names them on the bar** — their
  // name takes the place your own name holds at the top of the screen —
  // and pressing that name opens their profile (see setBarMember). The
  // petek itself stays the drawing: nothing rises over it, nothing on it
  // moves, and the whole of what a press changes here is the one hexagon
  // going red. Two steps rather than one because the petek at its
  // outermost depth prints no names at all — the shape is what that
  // level is for — so a press has to be able to say *who* before it can
  // offer to say anything more about them.
  //
  // Pressing them again puts your own name back: every hexagon on this
  // page is its own close button (see hiveEmptyCellHTML, hiveMeCellHTML).
  function hiveMemberCellHTML(member, meta, nameSide, status, t, picked) {
    const name = hiveMemberName(member);
    const cls = `ist-hive-filled${member.bonded ? ' ist-hive-bonded' : ''}${picked ? ' ist-hive-picked' : ''}`;
    return `
      <button type="button" class="ist-hive-cell ${cls}" ${meta}
              data-member-id="${esc(member.member_id)}" aria-pressed="${picked ? 'true' : 'false'}"
              title="${esc(name)}" aria-label="${esc(name)}">
        <div class="ist-pc-cover-avatar ist-hive-frame">
          ${coverBadgesHTML(member)}
          <div class="ist-pc-cover-art">${coverAvatarHTML(member.avatar_url, member.avatar_hair, member.avatar_hat, member.avatar_accessory, member.avatar_shirt)}</div>
        </div>
        ${hiveNameHTML(member, nameSide, status, t)}
      </button>
    `;
  }

  // A free side of your own hexagon: the one thing on the grid you can
  // hand out. Pressing it mints a code for that seat, and the code is
  // printed **in the seat itself** — the code IS that empty place (see
  // db/hive_slot_codes_v5.sql), so it belongs inside its own hexagon and
  // not in a panel somewhere else on the page. There is no copy button
  // and nothing to dismiss: it is six characters you read out to whoever
  // is standing in front of you, and it dies on its own.
  function hiveEmptyCellHTML(dir, meta, open, t) {
    const label = t('profile.hive.empty');
    const isOpen = !!open;
    let inner = `<span class="ist-hive-plus" aria-hidden="true">+</span>`;
    if (isOpen) {
      if (open.error) {
        inner = `<span class="ist-hive-cell-msg">${esc(open.error)}</span>`;
      } else if (open.offer) {
        inner = `
          <span class="ist-hive-cell-code">${esc(open.offer.code)}</span>
          <span class="ist-hive-cell-left" id="po-hive-left">${esc(hiveOfferLeft(open.offer))}</span>
        `;
      } else {
        inner = `<span class="ist-hive-cell-code ist-hive-cell-waiting">••••••</span>`;
      }
    }
    return `
      <button type="button" class="ist-hive-cell ist-hive-empty${isOpen ? ' ist-hive-cell-open' : ''}" ${meta}
              data-dir="${dir}" aria-expanded="${isOpen ? 'true' : 'false'}"
              title="${esc(label)}" aria-label="${esc(label)}">
        <div class="hexframe ist-hive-frame ist-hive-slot">${inner}</div>
      </button>
    `;
  }

  // The room the petek has left to grow into: every free cell touching
  // somebody, drawn as an empty outline and nothing more. It is not a
  // control — these places are not yours to give away, and only the six
  // sides of your own hexagon are (see hiveEmptyCellHTML). What it is for
  // is the drawing: a honeycomb is a shape that continues, and a member
  // standing in the middle of six openings with white paper past them
  // reads as the end of the world rather than as the middle of one.
  function hiveGhostCellHTML(meta) {
    return `
      <div class="ist-hive-cell ist-hive-ghost" ${meta} aria-hidden="true">
        <div class="hexframe ist-hive-frame ist-hive-slot"></div>
      </div>
    `;
  }

  // You, in the middle. Pressing yourself is how you TAKE a seat somebody
  // just offered you: the field opens inside your own hexagon, because
  // you are the one who moves. It is the mirror of the seat's own code
  // above — what you give is printed in the place you give, what you take
  // is typed into you — and it is why neither of them needs a bar at the
  // foot of the page any more.
  function hiveMeCellHTML(opts, meta, open, t) {
    const { profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName } = opts;
    const isOpen = !!(open && open.claim);
    const claim = isOpen ? `
      <div class="ist-hive-claim-in">
        <input class="ist-hive-claim-input" id="po-hive-code" type="text"
               inputmode="latin" autocomplete="off" autocapitalize="characters" spellcheck="false"
               enterkeyhint="go" maxlength="${HIVE_CODE_LENGTH}"
               placeholder="${'•'.repeat(HIVE_CODE_LENGTH)}"
               aria-label="${esc(t('profile.hive.claimprompt'))}"
               value="${esc(open.value || '')}">
        <span class="ist-hive-cell-msg" id="po-hive-msg">${esc(open.error || '')}</span>
      </div>` : '';
    return `
      <button type="button" class="ist-hive-cell ist-hive-me${isOpen ? ' ist-hive-cell-open' : ''}" ${meta}
              data-me="1" aria-expanded="${isOpen ? 'true' : 'false'}" title="${esc(displayName)}">
        <div class="ist-pc-cover-avatar ist-hive-frame">
          ${coverBadgesHTML(profile)}
          <!-- The art is its own layer inside the frame because the avatar
               carousels replace its whole innerHTML on every arrow press
               (see wireHairCarousel and friends, which this page reuses
               unchanged at level 0) — sharing a parent with the badges
               would wipe them. -->
          <div class="ist-pc-cover-art" id="po-avatar-preview">${coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt)}</div>
          ${claim}
        </div>
      </button>
    `;
  }

  // ── Changing your own avatar, at the depth that is about you ──
  // Two columns of four arrows flanking your own hexagon — hat, hair,
  // accessory, shirt, top to bottom, all the same size so no category
  // reads as more primary than another. It is the same markup, the same
  // ids and the same four `wire*Carousel` functions the profile sheet's
  // customizing mode uses: one implementation of picking an avatar, in
  // two places that show it.
  //
  // A separate node standing on the me cell's own coordinates rather than
  // markup inside it, because the me cell is a <button> and a button
  // inside a button is not a thing the parser will keep. It carries the
  // cell's height so `top: 50%` centres the columns on the frame, and it
  // is drawn only at level 0 (see profile-card.css) — a press changes
  // your avatar there and then, and saves itself, so there is nothing to
  // open and nothing to confirm.
  function hiveAvatarPickerHTML(meta) {
    const row = (id, dir, label) =>
      `<button type="button" class="ist-pc-cover-pick-arrow" id="po-${id}-${dir}" aria-label="${esc(label)}">`
      + `${dir === 'prev' ? ARROW_ICON_LEFT : ARROW_ICON_RIGHT}</button>`;
    const col = (dir) => `
      <div class="ist-pc-cover-pick-col ist-hive-pick-col ist-pc-cover-pick-${dir === 'prev' ? 'prev' : 'next'}">
        ${row('hat', dir, dir === 'prev' ? 'Önceki şapka' : 'Sonraki şapka')}
        ${row('hair', dir, dir === 'prev' ? 'Önceki saç' : 'Sonraki saç')}
        ${row('accessory', dir, dir === 'prev' ? 'Önceki aksesuar' : 'Sonraki aksesuar')}
        ${row('shirt', dir, dir === 'prev' ? 'Önceki tişört' : 'Sonraki tişört')}
      </div>`;
    return `<div class="ist-hive-picker" ${meta}>${col('prev')}${col('next')}</div>`;
  }

  // ── The grid ──
  // Everyone on the caller's map, the six free sides of the caller's own
  // hexagon (the only seats they can offer — somebody else's free sides
  // are theirs to give away, not yours), and a transparent field of
  // further empty cells around the whole thing, which is drawing rather
  // than interface.
  function hiveGridHTML(opts) {
    const t = opts.t;
    const cells = (opts.hive && opts.hive.cells) || [];
    const open = opts.open || null;
    const status_ = (opts.hive && opts.hive.status) || new Map();
    const taken = new Set(cells.map(c => `${c.q},${c.r}`));
    // The caller stands at (0,0) too — a name must not be printed over
    // their frame either.
    const occupied = new Set(taken); occupied.add('0,0');

    const items = [{ q: 0, r: 0, kind: 'me' }];
    cells.forEach(c => items.push({ q: c.q, r: c.r, kind: 'member', member: c }));
    // Your own free sides: the six seats you can offer.
    const mine = new Set();
    HIVE_DIRS.forEach((v, dir) => {
      if (!taken.has(`${v[0]},${v[1]}`)) {
        items.push({ q: v[0], r: v[1], kind: 'empty', dir });
        mine.add(`${v[0]},${v[1]}`);
      }
    });
    // The transparent field around it: a honeycomb is a shape that
    // continues, so it is drawn as one — every free cell touching
    // anybody on the map, and past them a field reaching far enough to
    // run off all four edges of the screen (see hiveFieldReach). It is
    // laid out as the rectangle the screen actually is rather than as
    // hexagonal rings around the reader: rings that reach the top of a
    // phone reach only half as far across it at that height, so the
    // corners came out bare, and rings wide enough to cover them draw
    // hundreds of hexagons nobody can see.
    //
    // Nothing here is skipped for a name. A member's name is printed in
    // the cell just outside them (see hiveNameHTML) and that cell is
    // always at ring 2, which the middle depth — the only one that
    // prints names at all — does not draw; leaving it out of the field
    // punched a hole in the honeycomb beside every neighbour at the
    // outermost depth, which is the one depth the shape itself is for.
    //
    // Every cell here stands past every level's own ceiling by
    // construction, so the existing away rule (applyHiveLevel) hides
    // them at levels 0/1 and shows them at 2 with no change there.
    const ghosts = new Set();
    const addGhost = (q, r) => {
      const key = `${q},${r}`;
      if (occupied.has(key) || mine.has(key) || ghosts.has(key)) return;
      ghosts.add(key);
      items.push({ q, r, kind: 'ghost' });
    };
    const reach = hiveFieldReach();
    for (let r = -reach.rows; r <= reach.rows; r++) {
      // x = q + r/2 (see hivePos), so each row's own q range is shifted
      // half a step against the one above it — which is what interlocks
      // the rows into a comb rather than a grid of columns.
      const off = r / 2;
      for (let q = Math.ceil(-reach.cols - off); q <= Math.floor(reach.cols - off); q++) addGhost(q, r);
    }
    // And a ring of paper around anybody standing outside that
    // rectangle: a petek that has grown further than the screen is wide
    // still has to read as continuing, not as ending at whoever is
    // furthest out.
    cells.forEach(c => HIVE_DIRS.forEach(v => addGhost(c.q + v[0], c.r + v[1])));

    // The plane is sized to what is actually on it, then centred on the
    // caller's own cell by renderHive — so the reader is in the middle
    // whatever shape has grown around them.
    const xs = items.map(i => i.q + i.r / 2);
    const ys = items.map(i => i.r);
    const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    const minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);

    const html = items.map(item => {
      const p = hivePos(item.q, item.r, minX, minY);
      // Where it stands on the plane, and how far out it stands from the
      // reader — the second is the whole of the level filter, so it is
      // written into the cell rather than recomputed from a coordinate
      // the DOM never carried. --ring mirrors data-ring as a CSS custom
      // property (calc() can't read a data-* attribute) for the level-2
      // wave-in stagger (see hiveWaveIn/.ist-hive-wave-in).
      const ring = hiveRing(item.q, item.r);
      // Which side of the reader a ring-1 cell stands on: used for the
      // name (member cells only, see nameSide below) and, since leaving
      // level 1 for level 0 slides a ring-1 hexagon instead of just
      // fading it (see .ist-hive-away[data-side] in profile-card.css),
      // for the cell's own transform direction too.
      const side = (item.q + item.r / 2) < 0 ? 'left' : 'right';
      const meta = `style="left: calc(var(--ist-hive-step-x) * ${p.x}); top: calc(var(--ist-hive-step-y) * ${p.y}); --ring: ${ring};" `
        + `data-ring="${ring}"` + (ring === 1 ? ` data-side="${side}"` : '');
      if (item.kind === 'me') return hiveMeCellHTML(opts, meta, open, t) + hiveAvatarPickerHTML(meta);
      if (item.kind === 'member') {
        // Named only if they are touching the reader — see nameCells above.
        const nameSide = ring === 1 ? side : null;
        // Where they stand in their own day, printed under the name. It
        // lands a moment after the map does (see loadHiveStatus) and the
        // grid is simply re-rendered — the label is out of flow, so
        // nothing on the plane moves when it arrives.
        const status = status_.get(String(item.member.member_id)) || null;
        const picked = opts.selected && opts.selected === String(item.member.member_id);
        return hiveMemberCellHTML(item.member, meta, nameSide, status, t, picked);
      }
      if (item.kind === 'ghost') return hiveGhostCellHTML(meta);
      return hiveEmptyCellHTML(item.dir, meta, (open && open.dir === item.dir) ? open : null, t);
    }).join('');

    const w = `calc(var(--ist-hive-step-x) * ${maxX - minX} + var(--ist-hive-cell-w))`;
    const h = `calc(var(--ist-hive-step-y) * ${maxY - minY} + var(--ist-hive-cell-h))`;
    return `
      <div class="ist-hive" id="po-hive-view">
        <div class="ist-hive-plane" id="po-hive-plane" style="width: ${w}; height: ${h};">${html}</div>
      </div>
    `;
  }

  // What is left of an offer, as m:ss, printed under the code inside the
  // seat itself. A seat that has run out says so rather than sitting
  // there looking live — the whole point of the code is that it dies.
  function hiveOfferLeft(offer) {
    const ms = new Date(offer.expires_at).getTime() - Date.now();
    if (!(ms > 0)) return '0:00';
    const total = Math.floor(ms / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  // ── The rail ──
  // Three marks down the outer edge saying how many depths there are and
  // which one the reader is standing at. A swipe is the gesture; this is
  // how anyone finds out there is one, and it takes a press too, because
  // a control that only announces is a decoration.
  function hiveRailHTML(t) {
    const labels = [
      t('profile.hive.level.self'),
      t('profile.hive.level.near'),
      t('profile.hive.level.all'),
    ];
    const dots = labels.map((label, i) => `
      <button type="button" class="ist-hive-rail-dot" data-level="${i}"
              title="${esc(label)}" aria-label="${esc(label)}"></button>`).join('');
    return `<div class="ist-hive-rail" id="po-hive-rail">${dots}</div>`;
  }

  // ── Level 0: you, and what is yours to change ──
  // The innermost depth is the one place on this page that is about the
  // reader rather than about the shape they are standing in, so it is the
  // one place that carries words about them — and it carries the controls
  // themselves, not a way to reach them. There is no Kişiselleştir button
  // and nothing rises over the page: the arrows are on your hexagon (see
  // hiveAvatarPickerHTML) and your three preferences are printed under
  // your name, each one committing itself the moment it is pressed, the
  // way the avatar arrows already did. Nothing here opens and nothing
  // closes, which is the whole rule this page is built on.
  //
  // What is *not* here is the account — email, kefil, referral code,
  // signing out. Those are not personalization; they stay on Kütüphane's
  // profile page, where the account block lives (see PROFILE_SECTIONS).
  //
  // Everything printed is already known by the time the page draws —
  // there is no second fetch behind this level.
  const HIVE_PREFS = [
    { key: 'lang', column: 'language_pref', label: 'profile.langpref',
      options: [{ value: 'default', label: 'Daha Türkçe' }, { value: 'more_english', label: 'Daha İngilizce' }] },
    { key: 'palette', column: 'palette_pref', label: 'profile.colortheme',
      options: [{ value: 'mono', label: 'Siyah-Beyaz' }, { value: 'earth', label: 'Kahverengi' }] },
    { key: 'theme', column: 'theme_pref', label: 'profile.appearance',
      options: [{ value: 'light', label: 'Açık' }, { value: 'dark', label: 'Koyu' }] },
  ];

  function hivePrefValue(state, pref) {
    const raw = state.profile ? state.profile[pref.column] : null;
    if (pref.key === 'lang') return normalizeLang(raw);
    if (pref.key === 'palette') return normalizePalette(raw);
    return normalizeTheme(raw);
  }

  function hiveSelfHTML(state) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const district = state.profile && state.profile.neighborhood
      ? (NB_NAMES[state.profile.neighborhood] || state.profile.neighborhood) : '';
    const since = (state.I18N && state.I18N.formatMemberSince && state.profile && state.profile.joined_at)
      ? state.I18N.formatMemberSince(state.profile.joined_at) : '';
    const prefs = HIVE_PREFS.map(pref => {
      const current = hivePrefValue(state, pref);
      const options = pref.options.map(o => `
        <button type="button" class="ist-hive-pref-opt${o.value === current ? ' ist-hive-pref-on' : ''}"
                data-pref="${pref.key}" data-value="${o.value}"
                aria-pressed="${o.value === current ? 'true' : 'false'}">${esc(o.label)}</button>`).join('');
      return `
        <div class="ist-hive-pref">
          <span class="ist-hive-pref-label">${esc(t(pref.label))}</span>
          <span class="ist-hive-pref-seg" role="group" aria-label="${esc(t(pref.label))}">${options}</span>
        </div>`;
    }).join('');
    return `
      <div class="ist-hive-self" id="po-hive-self">
        <div class="ist-hive-self-name">${esc(capitalizeName(state.hiveDisplayName || ''))}</div>
        <div class="ist-hive-self-meta">${esc(district)}</div>
        ${since ? `<div class="ist-hive-self-since">${esc(since)}</div>` : ''}
        <div class="ist-hive-prefs">${prefs}</div>
        <div class="ist-hive-self-msg" id="po-hive-self-msg" role="status" aria-live="polite"></div>
      </div>
    `;
  }

  // A preference commits itself. There is no Kaydet on this page for the
  // same reason there is no Kişiselleştir: what a press does, it does —
  // exactly like the avatar arrows beside the hexagon above it. Whatever
  // can be applied without a reload is applied here and now (the palette
  // repaints, the language re-labels the site); the appearance is stored
  // the same way the profile sheet stores it.
  async function pickHivePref(state, key, value) {
    const pref = HIVE_PREFS.find(p => p.key === key);
    if (!pref || hivePrefValue(state, pref) === value) return;
    const msg = document.getElementById('po-hive-self-msg');
    const { data, error } = await state.sb.from('profiles')
      .update({ [pref.column]: value }).eq('id', state.user.id).select('id');
    if (error || !data || data.length === 0) {
      if (msg) msg.textContent = (error && error.message) || 'Kaydedilemedi.';
      return;
    }
    if (msg) msg.textContent = '';
    state.profile = Object.assign({}, state.profile, { [pref.column]: value });
    if (key === 'palette' && global.Palette) global.Palette.setPalette(value);
    if (key === 'theme' && global.Palette) global.Palette.setTheme(value);
    if (key === 'lang' && state.I18N && state.I18N.setLang) state.I18N.setLang(value);
    // The block is rebuilt rather than patched: a language change rewrites
    // every label on it, and the marks have to agree with what was just
    // saved either way.
    renderHiveSelf(state);
  }

  function wireHiveSelf(state) {
    document.querySelectorAll('#po-hive-self .ist-hive-pref-opt').forEach(btn => {
      btn.addEventListener('click', () => pickHivePref(state, btn.dataset.pref, btn.dataset.value));
    });
  }

  // Level 0's block, re-rendered in place. It is the page's furniture
  // rather than the drawing's, so it never goes through renderHive — and
  // it is wired here rather than at mount, since a re-render replaces
  // every control on it.
  function renderHiveSelf(state) {
    const host = document.getElementById('po-hive-self');
    if (!host) return;
    host.outerHTML = hiveSelfHTML(state);
    wireHiveSelf(state);
    // Its height is what fitHive leaves the drawing at level 0, and a
    // language change can move it by a line.
    fitHive(state);
  }

  // Puts the page into the level it is at: which cells are drawn (a cell
  // may stand no further out than the level, and the outermost level lets
  // the whole map through), which of them answer a press, and which mark
  // on the rail is lit. It never rebuilds anything — the drawing is one
  // set of nodes at every depth, so a level change is a fade and a
  // rescale rather than a re-render.
  function applyHiveLevel(state) {
    const level = hiveLevel(state);
    const page = document.getElementById('po-hive-page');
    if (page) {
      for (let i = 0; i < HIVE_LEVELS; i++) page.classList.toggle(`ist-hive-level-${i}`, i === level);
    }
    // The kept-events column beside the petek (anahane.html's own
    // #events-panel, not this file's concern) only belongs to the middle
    // depth -- the reader's six neighbours are the ones a kept event's
    // verdict is even about. A class on <html> rather than a DOM
    // reference across the script boundary: the petek page never needs
    // to know the column exists, and anahane's CSS is what actually
    // reacts to it.
    // Two classes rather than one, and the rule that quiets the column
    // is written on the OFF state (see anahane.html): a class that never
    // lands -- profile-card.js still loading, a page entered by a route
    // that never mounted the petek, an exception in the middle of a
    // render -- must leave the column READABLE, not blank. `:not(mid)`
    // failed the other way round, and a column that has quietly gone
    // invisible looks exactly like one with nothing in it.
    const mid = level === HIVE_LEVEL_DEFAULT;
    document.documentElement.classList.toggle('ist-hive-mid', mid);
    document.documentElement.classList.toggle('ist-hive-offmid', !mid);
    // And the outermost depth, for the same reason the other way round:
    // that depth is the whole shape, so the drawing is let out of its
    // window there and runs off every edge of the screen -- under the
    // events column, past the tab bar -- instead of stopping in mid-air
    // with bare paper past it (see .ist-hive's overflow in
    // profile-card.css and anahane.html's own main). The window itself is
    // unchanged, so what the drawing is scaled to and where the reader
    // stands in it are exactly what they were: only the clip is lifted.
    document.documentElement.classList.toggle('ist-hive-all', level === HIVE_LEVEL_ALL);
    const mount = document.getElementById('po-hive-mount');
    if (mount) mount.querySelectorAll('.ist-hive-cell').forEach(cell => {
      const ring = parseInt(cell.dataset.ring, 10) || 0;
      const away = level < HIVE_LEVEL_ALL && ring > level;
      cell.classList.toggle('ist-hive-away', away);
      // The exchange — offering a seat, taking one — belongs to the
      // outermost level alone. Below it the seats are drawing rather than
      // interface, so they are disabled outright and not merely stripped
      // of their "+": a hexagon that answers a press by doing nothing is
      // worse than one that plainly does not answer.
      if (cell.tagName === 'BUTTON') cell.disabled = away || level < HIVE_LEVEL_ALL;
    });
    const rail = document.getElementById('po-hive-rail');
    if (rail) rail.querySelectorAll('.ist-hive-rail-dot').forEach(dot => {
      const on = parseInt(dot.dataset.level, 10) === level;
      dot.classList.toggle('ist-hive-rail-on', on);
      dot.setAttribute('aria-current', on ? 'true' : 'false');
    });
  }

  // Moving between depths. The pan is dropped on the way — it belongs to
  // the level it was dragged at, and arriving at a new depth already
  // shoved off to one side is not arriving in the middle.
  function setHiveLevel(state, next) {
    const level = Math.max(0, Math.min(HIVE_LEVELS - 1, next));
    if (level === hiveLevel(state)) return;
    state.hiveLevel = level;
    state.hivePan = { x: 0, y: 0 };
    // A code on offer belongs to the level the seats are on: stepping
    // away from that level folds the seat back rather than leaving a live
    // code burning on a hexagon nobody can see any more. A member picked
    // out of the petek is the same: their name is on the bar because the
    // reader is standing in front of their hexagon, and at another depth
    // they are not.
    const dropped = level !== HIVE_LEVEL_ALL && (state.hiveOpen || state.hiveSelected);
    if (dropped) {
      state.hiveOpen = null;
      state.hiveSelected = null;
      clearBarMember();
      renderHive(state);
      return;
    }
    applyHiveLevel(state);
    fitHive(state);
    // Entering the outermost depth specifically staggers the reveal (see
    // hiveWaveIn) — the middle depth is already half of what's on screen
    // arriving from level 0, and staggering an already-familiar shape
    // reads as lag, not a reveal.
    if (level === HIVE_LEVEL_ALL) hiveWaveIn(state);
  }

  // Entering the outermost depth reveals nearest-first, outward (see
  // .ist-hive-wave-in in profile-card.css, keyed off each cell's --ring)
  // instead of every hexagon arriving at once. The class only stays on
  // for the run of this one transition — anything the reader does after
  // it (levels 0↔1, or leaving 2 again) keeps the plain fade every level
  // change has always had.
  function hiveWaveIn(state) {
    const page = document.getElementById('po-hive-page');
    if (!page) return;
    page.classList.add('ist-hive-wave-in');
    clearTimeout(state.hiveWaveTimer);
    // The stagger is capped in the stylesheet (the field now reaches
    // past the screen, and a delay that grew with it would leave the
    // outer paper still arriving long after the shape had), so the class
    // comes off after that cap plus the transition itself.
    state.hiveWaveTimer = setTimeout(() => page.classList.remove('ist-hive-wave-in'), 1600);
  }

  // ── Pressing a member ──
  // One member is named on the bar at a time, and pressing the one that
  // is already named puts your own name back — the same toggle every
  // other hexagon on this page answers a press with. The name is read
  // off the map row rather than the DOM: the caption beside a hexagon is
  // only printed at the middle depth, and this is the outermost.
  function pickHiveMember(state, id) {
    const cells = (state.hive && state.hive.cells) || [];
    const member = cells.find(c => String(c.member_id) === id) || null;
    // Desktop has no top bar at all (see mount) — there is nowhere to put
    // their name, so the press does the second step's work straight away
    // rather than turning a hexagon red and leading nowhere. One press
    // instead of two, because the step in between has no home here.
    if (!document.getElementById('ist-pc-me')) {
      if (member) openMemberSheet(id);
      return;
    }
    const next = state.hiveSelected === id ? null : id;
    state.hiveSelected = next;
    setBarMember(next ? member : null);
    renderHive(state);
  }

  // The page is the drawing, and nothing else. There was a dock along the
  // foot carrying whatever was tapped; both halves of the exchange live
  // inside the hexagons they belong to now (the seat's code in the seat,
  // the field that takes a code in you), so the bar had nothing left to
  // hold and the petek gets the whole page back.
  function hiveHTML(opts) {
    return hiveGridHTML(opts);
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

    const level = hiveLevel(state);
    const vw = view.clientWidth;
    // Level 0 prints what is yours to change under your own hexagon, and
    // that block is laid *over* the window rather than taking room from
    // it (see .ist-hive-self in profile-card.css) — so what the drawing
    // may use is what is left above it, and the reader's own frame is
    // centred in that rather than behind the words.
    const selfEl = document.getElementById('po-hive-self');
    const selfReserve = (level === 0 && selfEl) ? selfEl.offsetHeight + HIVE_SELF_GAP : 0;
    // ── And the room the page keeps at the foot of the window ──
    // On a phone the foot of this band carries Hane's events strip, laid
    // over the drawing rather than standing in a row of its own (see
    // .col-left in anahane.html), and a card opened in it grows upward.
    // That room is reserved here, so the drawing is fitted AND centred
    // in what is left above it: an open card can then never come up over
    // the people, whatever size the honeycomb happens to be drawn at on
    // this screen. It replaces a flat lift, which was a guess at one
    // screen's fit and stopped clearing the card the moment the drawing
    // resolved a little larger than the screen it was guessed on.
    // Two numbers, and they do different jobs. The OPEN one is what the
    // drawing has to be small enough to clear -- a card grows upward out
    // of the strip and must never come up over the people. The RESTING
    // one is where the drawing actually stands the rest of the time,
    // which is nearly always: centred in the band the strip leaves when
    // it is shut. Fitting to the first and centring on the second is
    // what keeps the petek low on the page without ever letting an open
    // card reach it (see the clamp under `scale`).
    const openReserve = hiveBandReserve('--ist-hive-reserve');
    const restReserve = hiveBandReserve('--ist-hive-reserve-rest');
    const reserve = Math.max(selfReserve, openReserve);
    const vhFull = view.clientHeight;
    const vh = vhFull - reserve;
    // The grid is drawn before the page is unhidden, so the first
    // measurement is a screenful of zeroes. Wait for a frame that has
    // real numbers in it rather than leaving the plane hanging off the
    // middle of a window it was never measured against — bounded, so a
    // page swiped away before it ever laid out doesn't leave a frame loop
    // behind.
    if (!vw || !vh || !plane.offsetWidth || !plane.offsetHeight) {
      const tries = (state.hiveFitTries || 0) + 1;
      state.hiveFitTries = tries;
      if (tries < 30) requestAnimationFrame(() => fitHive(state));
      return;
    }
    state.hiveFitTries = 0;

    const cx = me.offsetLeft + me.offsetWidth / 2;
    const cy = me.offsetTop + me.offsetHeight / 2;

    // What has to fit is what is actually *drawn* at this level, not the
    // plane's own box: the plane is sized for the whole map at every
    // depth (the cells never move, they only fade), so measuring it would
    // hand level 0 the room a hundred-member petek needs and draw the one
    // hexagon on it the size of a stamp. So the visible cells are
    // measured, and the names with them where they are printed — a name
    // hangs outside the plane's box, and the outermost one is exactly
    // what a window fitted to the cells alone would clip.
    //
    // The outermost level measures the MIDDLE depth's own box instead of
    // its own: ringCeiling is HIVE_LEVEL_DEFAULT whenever level is the
    // outermost, not the level itself. Filtered by each cell's own
    // data-ring rather than .ist-hive-away, because .ist-hive-away is
    // never set on anything at the outermost level (see applyHiveLevel) —
    // it can't tell "the six touching the reader" apart from the whole
    // filled field the way a plain ring comparison can.
    const ringCeiling = level === HIVE_LEVEL_ALL ? HIVE_LEVEL_DEFAULT : level;
    let minL = cx, maxR = cx, minT = cy, maxB = cy;
    // Whatever hangs outside a cell's own box on this level and still has
    // to be on the paper: a member's name, and the avatar arrows at the
    // depth that shows them. A capital with letter-spacing after it
    // paints a little past its own box, so the track is not quite the
    // ink: fit the wider of the two, and leave a breath after it —
    // anything whose far edge lands exactly on the window's edge reads
    // as clipped rather than fitted.
    const outriders = (cell) => {
      const found = [...cell.querySelectorAll('.ist-hive-name')];
      if (level === 0) found.push(...cell.querySelectorAll('.ist-hive-pick-col'));
      return found;
    };
    // ringCeiling caps this at 7 cells even at the outermost level (the
    // ghost field's hundreds of cells all sit well past it), so this
    // never becomes the offsetLeft/offsetTop reflow storm a real
    // "measure the whole filled field" pass would be.
    plane.querySelectorAll('.ist-hive-cell, .ist-hive-picker').forEach(cell => {
      const ring = parseInt(cell.dataset.ring, 10) || 0;
      if (ring > ringCeiling) return;
      // A box with no size reports its offsets as zero — measured, it
      // would drag the required box out to the plane's own origin and
      // shrink the drawing to fit something nobody can see.
      if (!cell.offsetWidth) return;
      const l = cell.offsetLeft, t = cell.offsetTop;
      if (l < minL) minL = l;
      if (l + cell.offsetWidth > maxR) maxR = l + cell.offsetWidth;
      if (t < minT) minT = t;
      if (t + cell.offsetHeight > maxB) maxB = t + cell.offsetHeight;
      outriders(cell).forEach(el => {
        const left = l + el.offsetLeft;
        const w = Math.max(el.offsetWidth, el.scrollWidth) + HIVE_NAME_BREATH;
        if (left - HIVE_NAME_BREATH < minL) minL = left - HIVE_NAME_BREATH;
        if (left + w > maxR) maxR = left + w;
      });
    });

    // And what has to fit is not that box either, but the box it needs
    // *around the reader*: they stay in the middle of the window, so a
    // petek that has grown out to one side only is still asking for that
    // much room on both. Fitting the raw box instead leaves the far side
    // clipped by a window the arithmetic had just called roomy.
    const reqW = 2 * Math.max(cx - minL, maxR - cx);
    const reqH = 2 * Math.max(cy - minT, maxB - cy);
    // Each level has a ceiling of its own: the drawing grows as the
    // reader comes in toward themselves, which is what makes the three
    // depths read as one zoom rather than as three filters. The
    // outermost level shares the middle depth's ceiling AND its box
    // (ringCeiling above), so it always resolves to the exact number the
    // middle depth is actually drawn at on this window — not the ceiling
    // itself, which the middle depth often can't reach at all (six
    // names routinely leave a phone clamped well under 1.5x) and the
    // outermost level has to match rather than re-decide on its own.
    const scale = Math.max(HIVE_MIN_SCALE, Math.min(HIVE_LEVEL_ZOOM[ringCeiling] || 1, vw / reqW, vh / reqH));

    // Scaling about the caller's own cell and then hanging that point off
    // the middle of the window keeps them in the middle at any scale —
    // and the pan, when there is one, is a plain offset from there.
    const pan = state.hivePan || { x: 0, y: 0 };
    // Where the reader stands in the window: centred in what the strip
    // leaves when it is shut -- and no lower than the point at which the
    // foot of the drawing would meet a card standing open (the strip's
    // opened height, plus a little paper). The first is where the petek
    // wants to be; the second is the promise that nothing lands on it.
    const restY = -Math.max(selfReserve, restReserve) / 2;
    const belowMe = (maxB - cy) * scale;
    const clearY = (vhFull - reserve - HIVE_CARD_GAP) - vhFull / 2 - belowMe;
    const offsetY = Math.min(restY, clearY);
    state.hiveFit = { scale, cx, cy, vw, vh, reqW, reqH, offsetY };
    plane.style.transformOrigin = `${cx}px ${cy}px`;
    // ── A fresh plane is placed, not animated into place ──
    // The plane carries the zoom between depths (a 520ms transform
    // transition, see profile-card.css), and that is right when the
    // drawing that is already on screen is being re-fitted: a level
    // change, a drag settling, the window resizing.
    //
    // But renderHive rebuilds the mount's markup, so after every
    // re-render this is a **brand-new node** whose transform is still
    // `none` — and the measurements above have already resolved its
    // style, so the transition has a start value and animates the whole
    // petek from full size down to its fitted scale. Every press of a
    // hexagon re-renders, so every press made the entire drawing zoom:
    // one hexagon was pressed and all of them appeared to answer.
    //
    // A node this has never fitted has nothing to animate *from* — not
    // even on a level change, where the old scale belonged to a node
    // that no longer exists — so it is placed outright.
    const fresh = state.hiveFitNode !== plane;
    state.hiveFitNode = plane;
    // Cleared here rather than never set: the drag below turns the
    // transition off so the plane keeps up with the finger, and this is
    // the one place that knows the drag is over.
    plane.style.transition = fresh ? 'none' : '';
    plane.style.transform = `translate(${pan.x}px, ${pan.y + offsetY}px) scale(${scale})`;
    plane.style.marginLeft = `${-cx}px`;
    plane.style.marginTop = `${-cy}px`;
    // Panning is only offered when the fit had to give up: a grid that
    // fits has nowhere to go, and a page that slides under the finger
    // for no reason reads as broken. The outermost level never offers
    // it even though it always overflows by design (see the scale
    // comment above) — it is meant to be looked at, filled edge to edge
    // and cut off at them, not dragged around inside.
    const pannable = level !== HIVE_LEVEL_ALL && ((reqW * scale > vw + 1) || (reqH * scale > vh + 1));
    view.classList.toggle('ist-hive-pannable', pannable);
    if (!pannable && (pan.x || pan.y)) {
      state.hivePan = { x: 0, y: 0 };
      plane.style.transform = `translate(0px, ${offsetY}px) scale(${scale})`;
    }
    // Commit the placement above as this node's starting point before
    // handing the transition back to the stylesheet, so the next fit of
    // this same plane — a level change, a drag — does animate.
    if (fresh) {
      void plane.offsetWidth;
      plane.style.transition = '';
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
      hive: state.hive, open: state.hiveOpen, selected: state.hiveSelected || null, t,
    });
    applyHiveLevel(state);
    fitHive(state);
    wireHiveEvents(state);
  }

  // Both calls are best-effort: before db/hive_lattice_v4.sql has been
  // run the RPCs simply aren't there, and the petek should still draw
  // (your own hexagon with six free sides, no code) rather than the page
  // failing to open.
  // The last map any mount of this page fetched, kept across virtual
  // navigations (mountHivePage seeds the next mount from it).
  let _hiveMap = null;

  async function loadHive(state) {
    state.hiveLoaded = true;
    const { data } = await state.sb.rpc('hive_map');
    state.hive = Object.assign({}, state.hive, { cells: data || [] });
    // Kept for the next mount of this page, so a swipe back to Hane
    // draws the petek it left rather than the reader alone for a beat.
    _hiveMap = state.hive;
    renderHive(state);
    // Whatever came back -- rows, an empty map, or nothing at all
    // because the migration hasn't been run -- the drawing is what the
    // reader is here for, so it is shown now.
    const page = document.getElementById('po-hive-page');
    if (page) page.classList.remove('ist-hive-waiting');
    // The drawing does not wait for it: the grid is the page, and where
    // everybody stands in their day is a caption on it. It lands on its
    // own and re-renders (see loadHiveStatus).
    loadHiveStatus(state);
  }

  async function reloadHiveMap(state) {
    const { data } = await state.sb.rpc('hive_map');
    state.hive = Object.assign({}, state.hive, { cells: data || [] });
    loadHiveStatus(state);
  }

  // ── Where everybody on the petek stands in their own day ──
  // One call, for the whole map at once: how much of the news is still
  // stacked in each member's Kütüphane and how far into the day's games
  // they have got (db/hive_member_status.sql). The two Istanbul dates
  // are the client's, because the Istanbul day is (coding convention
  // 10) — the RPC keys game_day_toggles by the first and matches
  // game_results.date, which has always been unpadded, with the second.
  //
  // Best-effort like every other call on this page: before the migration
  // has been run the function isn't there, and the petek must still draw
  // — a member simply goes uncaptioned, which is exactly how the page
  // read before this existed.
  async function loadHiveStatus(state) {
    try {
      const iso = IstDate.iso();
      const [y, m, d] = iso.split('-').map(Number);
      const { data, error } = await state.sb.rpc('hive_member_status', {
        p_game_date: iso,
        p_game_key: `${y}-${m}-${d}`,
      });
      if (error || !data) return;
      const status = new Map(data.map(r => [String(r.member_id), r]));
      state.hive = Object.assign({}, state.hive, { status });
      // Only if the page is still the one this was fetched for: a swipe
      // away and back mounts a fresh state, and painting into the old
      // one would draw nothing anyway.
      if (state === _hive && document.getElementById('po-hive-mount')) renderHive(state);
    } catch (e) { /* no captions this time; the drawing is unchanged */ }
  }

  // ── Dragging the grid, and swiping between its depths ──
  // Both are the same gesture until it has an axis, so they are one
  // handler: the drawing follows the finger while there is drawing left
  // to reach, and once the finger runs *past* the end of it — or there
  // was never anywhere to go, which is every level but the outermost —
  // the same pull changes the level instead. Nothing has a mode: you
  // drag the petek, and when the petek has no more to show you, the pull
  // keeps meaning something.
  //
  // Bound to the page, which is built once per mount, rather than to the
  // window inside it, which is rebuilt on every render.
  //
  // Direction is the page's, not the drawing's: a pull up is a scroll
  // down, and down the levels is outward — you, then the people beside
  // you, then the whole petek.
  function wireHiveGestures(state) {
    const page = document.getElementById('po-hive-page');
    if (!page) return;
    let g = null;

    const plane = () => document.getElementById('po-hive-plane');
    const slack = () => {
      const fit = state.hiveFit || { scale: 1, reqW: 0, reqH: 0, vw: 0, vh: 0 };
      // The outermost level never has room to give (see fitHive's
      // pannable comment) -- a drag there is either a level-swipe or
      // nothing, never a pan.
      if (hiveLevel(state) === HIVE_LEVEL_ALL) {
        return { x: 0, y: 0, offsetY: fit.offsetY || 0, scale: fit.scale };
      }
      return {
        x: Math.max(0, (fit.reqW * fit.scale - fit.vw) / 2),
        y: Math.max(0, (fit.reqH * fit.scale - fit.vh) / 2),
        offsetY: fit.offsetY || 0,
        scale: fit.scale,
      };
    };

    page.addEventListener('pointerdown', (e) => {
      // The rail and the block under level 0 are controls of their own;
      // a press on either is not a pull on the drawing.
      if (e.target.closest('.ist-hive-rail') || e.target.closest('.ist-hive-self')) return;
      state.hiveSwiped = false;
      g = {
        id: e.pointerId, x: e.clientX, y: e.clientY,
        pan: Object.assign({ x: 0, y: 0 }, state.hivePan),
        axis: null, over: 0,
        // The hexagon under the finger gives way while it is held (see
        // .ist-hive-cell-pressing). Driven by pointer events rather than
        // :active because :active sticks after a tap on iOS, and a
        // hexagon left shrunken behind whatever the press opened is
        // exactly the kind of thing nobody can take back.
        //
        // Only what can be pressed presses: a cell the level has closed
        // is `disabled` and a ghost is not a control, and both are
        // pointer-events: none, so neither is ever the target here.
        pressed: e.target.closest('.ist-hive-cell'),
      };
      if (g.pressed) g.pressed.classList.add('ist-hive-cell-pressing');
    });

    page.addEventListener('pointermove', (e) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(dx) < HIVE_GESTURE_SLOP && Math.abs(dy) < HIVE_GESTURE_SLOP) return;
        // A horizontal pull belongs to the carousel underneath (see
        // router.js, which ignores anything vertical-dominant) — this
        // page only ever claims the pointer for its own axis.
        g.axis = Math.abs(dy) > Math.abs(dx) * 1.2 ? 'y' : 'x';
        state.hiveSwiped = true;
        // It turned out to be a pull, so it was never a press.
        if (g.pressed) { g.pressed.classList.remove('ist-hive-cell-pressing'); g.pressed = null; }
        if (g.axis === 'y') { try { page.setPointerCapture(e.pointerId); } catch (err) {} }
      }
      const sl = slack();
      if (g.axis === 'x' && !sl.x) return;
      const wantX = g.pan.x + dx, wantY = g.pan.y + dy;
      const x = Math.max(-sl.x, Math.min(sl.x, wantX));
      const y = Math.max(-sl.y, Math.min(sl.y, wantY));
      // How far the finger has gone past the end of the drawing. This is
      // the whole of the level gesture: at every level but the outermost
      // there is no slack at all, so the first pixel of a vertical pull
      // is already overshoot.
      if (g.axis === 'y') g.over = wantY - y;
      state.hivePan = { x, y };
      const el = plane();
      if (el) {
        el.style.transition = 'none';
        el.style.transform = `translate(${x}px, ${y + sl.offsetY}px) scale(${sl.scale})`;
      }
    });

    const settle = () => {
      if (!g) return;
      const gesture = g;
      g = null;
      // Released: the hexagon springs back to its own size, on the
      // frame's own transition.
      if (gesture.pressed) gesture.pressed.classList.remove('ist-hive-cell-pressing');
      if (gesture.axis === 'y' && Math.abs(gesture.over) > HIVE_LEVEL_SWIPE) {
        setHiveLevel(state, hiveLevel(state) + (gesture.over < 0 ? 1 : -1));
        return;
      }
      // Either it was a drag inside the drawing (fitHive puts the
      // transition back and leaves the pan where the finger left it) or
      // it was a pull that didn't reach the next level, which springs
      // back the same way.
      fitHive(state);
    };
    ['pointerup', 'pointercancel'].forEach(ev => page.addEventListener(ev, settle));

    // A pull that turned into a swipe must not also count as a press on
    // whatever hexagon it started on.
    page.addEventListener('click', (e) => {
      if (!state.hiveSwiped) return;
      state.hiveSwiped = false;
      e.stopPropagation();
      e.preventDefault();
    }, true);

    // The same move for a mouse. Rate-limited rather than accumulated: a
    // trackpad sends a long tail of small deltas after the hand has left
    // it, and a level per delta would fall straight through all three.
    page.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) < 8 || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const now = Date.now();
      if (now - (state.hiveWheelAt || 0) < 500) return;
      state.hiveWheelAt = now;
      setHiveLevel(state, hiveLevel(state) + (e.deltaY > 0 ? 1 : -1));
    }, { passive: true });

    // The rail: three marks, and each of them goes to its own depth.
    const rail = document.getElementById('po-hive-rail');
    if (rail) rail.querySelectorAll('.ist-hive-rail-dot').forEach(dot => {
      dot.addEventListener('click', () => setHiveLevel(state, parseInt(dot.dataset.level, 10)));
    });

  }

  // ── Where the petek stands on a kept event ──
  // Anahane's own #events-panel column owns the card and its grow
  // animation (event-interest-cards.js, IstSheet.grow -- same primitive
  // Kahvehane's own event page and Kütüphane's news cards already use);
  // this file only owns the honeycomb, so it exposes just the two calls
  // that touch it (IstProfileCard.paintHiveEventMarks/
  // clearHiveEventMarks) rather than reaching into anahane's DOM to wire
  // the card itself.
  //
  // Two different facts, and the drawing keeps them apart. The VERDICT
  // is what somebody said about the event on Kahvehane's deck -- ilgimi
  // çekti or çekmedi, a dot in the hexagon's corner. The RSVP is whether
  // they are actually going, which is the one thing the open page asks,
  // so it is the louder mark: the hexagon's own ring goes red and it
  // carries a tick. An interested member who has not said yes yet and a
  // member who has are the difference between "there is somebody to go
  // with" and "somebody is going" -- the page is worth nothing if it
  // prints those as the same thing.
  //
  // Painted straight onto the hexagons rather than listed as names,
  // since the hexagon already printing that person's name says whose
  // answer it is. The reader's own hexagon is painted from what the
  // calling page already knows (opts.mine) -- both RPCs deliberately
  // answer only for everybody else.
  //
  // Best-effort, same convention as loadHiveStatus: before the migration
  // has been run the RPC isn't there, and the card still opens with no
  // marks rather than failing to open.
  function hiveCellFor(memberId) {
    return document.querySelector(
      `#po-hive-mount .ist-hive-cell[data-member-id="${CSS.escape(String(memberId))}"]`);
  }

  async function paintHiveEventMarks(sb, eventId, opts) {
    clearHiveEventMarks();
    const mine = !!(opts && opts.mine);
    const meCell = document.querySelector('#po-hive-mount .ist-hive-cell[data-me]');
    if (meCell) meCell.classList.toggle('ist-hive-cell-rsvp', mine);
    // Both questions in flight at once: they paint different marks on
    // the same drawing, and asking them one after the other would show
    // the verdict dots land a beat before the ring turns.
    const ask = (fn) => sb.rpc(fn, { p_event_ids: [eventId] })
      .then(r => (r && !r.error && r.data) ? r.data : [])
      .catch(() => []);
    let verdicts = [], going = [];
    try {
      [verdicts, going] = await Promise.all([
        ask('hive_event_interest_status'),
        ask('hive_event_rsvp_status'),
      ]);
    } catch (e) { return; /* no marks this time; the drawing is unchanged */ }
    verdicts.forEach(row => {
      const cell = hiveCellFor(row.member_id);
      if (cell) cell.classList.add(row.verdict === 'yes' ? 'ist-hive-cell-verdict-yes' : 'ist-hive-cell-verdict-no');
    });
    going.forEach(row => {
      const cell = hiveCellFor(row.member_id);
      if (cell) cell.classList.add('ist-hive-cell-rsvp');
    });
  }

  function clearHiveEventMarks() {
    document.querySelectorAll(
      '#po-hive-mount .ist-hive-cell-verdict-yes, #po-hive-mount .ist-hive-cell-verdict-no, #po-hive-mount .ist-hive-cell-rsvp'
    ).forEach(cell => cell.classList.remove(
      'ist-hive-cell-verdict-yes', 'ist-hive-cell-verdict-no', 'ist-hive-cell-rsvp'));
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
        if (state.hiveOpen && state.hiveOpen.dir === dir) {
          state.hiveOpen = null;
          renderHive(state);
          return;
        }
        state.hiveOpen = { dir, offer: null, error: '' };
        renderHive(state);
        offerHiveSlot(state, dir);
      });
    });

    // ── Pressing somebody ──
    // Their name goes up onto the bar, in the place your own name holds,
    // and the hexagon goes red so the drawing says which of them the bar
    // is talking about. Pressing them again puts your own name back.
    // Nothing opens here: the profile is one more press, on the name
    // itself (see setBarMember).
    mount.querySelectorAll('.ist-hive-cell[data-member-id]').forEach(cell => {
      cell.addEventListener('click', () => pickHiveMember(state, cell.dataset.memberId));
    });

    // Pressing yourself opens the field that takes a code somebody gave
    // you, inside your own hexagon. Pressing yourself again folds it back
    // to your avatar — every hexagon on this page is its own close
    // button, which is why nothing here carries one.
    const meCell = mount.querySelector('.ist-hive-cell[data-me]');
    if (meCell) meCell.addEventListener('click', () => {
      if (state.hiveOpen && state.hiveOpen.claim) { state.hiveOpen = null; renderHive(state); return; }
      state.hiveOpen = { claim: true, value: '', error: '' };
      state.hiveFocusInput = true;
      renderHive(state);
    });

    const input = document.getElementById('po-hive-code');
    if (input) {
      // A press inside the field must not reach the hexagon behind it, or
      // opening the field would immediately fold it away again.
      ['click', 'pointerdown'].forEach(ev => input.addEventListener(ev, (e) => e.stopPropagation()));
      input.addEventListener('input', () => {
        // The codes are read off somebody else's screen, so type them in
        // whatever case and drop anything outside the alphabet (see
        // db/hive_slot_codes_v5.sql).
        const cleaned = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, HIVE_CODE_LENGTH);
        if (cleaned !== input.value) input.value = cleaned;
        if (state.hiveOpen) state.hiveOpen.value = cleaned;
        // Six characters is the whole code, so there is nothing left to
        // confirm: it goes the moment it is complete. That is what lets
        // the field be a field and not a field plus a button in a
        // hexagon this size.
        if (cleaned.length === HIVE_CODE_LENGTH) claimHiveSlot(state, cleaned);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') claimHiveSlot(state, input.value);
        if (e.key === 'Escape') { state.hiveOpen = null; renderHive(state); }
      });
      // Focus only when the field has just been opened, not on every
      // re-render: a fetch landing while a code is half-typed would
      // otherwise yank the caret back to the start of it.
      if (state.hiveFocusInput) {
        state.hiveFocusInput = false;
        input.focus();
      }
    }

    // The arrows flanking your own hexagon at level 0 (see
    // hiveAvatarPickerHTML). These are the profile sheet's own carousels,
    // reused unchanged — each press commits the pick on its own, so this
    // page needs no Kaydet of its own either.
    wireHairCarousel(state);
    wireHatCarousel(state);
    wireAccessoryCarousel(state);
    wireShirtCarousel(state);

    wireHiveOfferClock(state);
  }

  // The seat's own clock. It ticks in place — the seat is not re-rendered
  // for it, because a hexagon that rebuilds every second is one nobody
  // can read a code out of.
  function wireHiveOfferClock(state) {
    clearInterval(state.hiveOfferTimer);
    const offer = state.hiveOpen && state.hiveOpen.offer;
    if (!offer) return;
    state.hiveOfferTimer = setInterval(() => {
      const el = document.getElementById('po-hive-left');
      if (!el || !(state.hiveOpen && state.hiveOpen.offer === offer)) {
        clearInterval(state.hiveOfferTimer);
        return;
      }
      el.textContent = hiveOfferLeft(offer);
      // Run out: the seat is not on offer any more, so the panel folds
      // back to the way in rather than leaving a dead code on screen.
      if (new Date(offer.expires_at).getTime() <= Date.now()) {
        clearInterval(state.hiveOfferTimer);
        state.hiveOpen = null;
        renderHive(state);
      }
    }, 1000);
  }

  // Offering a seat. Pressing a free side of your own hexagon mints a
  // code for that exact place, good for a few minutes and for one
  // person (db/hive_slot_codes_v5.sql). Nobody carries a code around any
  // more: there is nothing to hand on afterwards and nothing to look up,
  // which is the hand-to-hand rule made literal.
  async function offerHiveSlot(state, dir) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const { data, error } = await state.sb.rpc('hive_offer_slot', { p_dir: dir });
    // The reader may have folded the panel or tapped another side while
    // the mint was out; the answer belongs to the side that asked for it.
    if (!state.hiveOpen || state.hiveOpen.dir !== dir) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row || !row.code) {
      state.hiveOpen.error = t('profile.hive.err.failed');
    } else {
      state.hiveOpen.offer = row;
      state.hiveOpen.error = '';
    }
    renderHive(state);
  }

  // Taking a seat somebody just offered you. The direction is the
  // offer's, not yours — whoever opened the seat decided where it is,
  // which is the whole point of the code being the seat rather than the
  // person. Every outcome is a status the server hands back (see
  // hive_claim_slot), so nothing here guesses before asking.
  async function claimHiveSlot(state, rawCode) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const code = String(rawCode || '').trim().toUpperCase();
    const msgEl = document.getElementById('po-hive-msg');
    const open = state.hiveOpen;
    if (!open || !open.claim || state.hiveClaiming) return;
    const fail = (key) => {
      state.hiveClaiming = false;
      open.value = code;
      open.error = t(key);
      if (msgEl) msgEl.textContent = open.error;
    };
    if (code.length !== HIVE_CODE_LENGTH) { fail('profile.hive.err.short'); return; }

    // The field fires itself at six characters, so a second keystroke
    // mid-flight would send the same code twice.
    state.hiveClaiming = true;
    if (msgEl) msgEl.textContent = '';
    const { data, error } = await state.sb.rpc('hive_claim_slot', { p_code: code });
    const row = Array.isArray(data) ? data[0] : data;
    const status = error ? 'failed' : ((row && row.status) || 'failed');
    if (status !== 'ok') { fail(`profile.hive.err.${status}`); return; }

    // In: the whole map is re-fetched rather than one cell patched in,
    // because taking this seat may have carried an entire petek over to
    // meet another — everybody's coordinates can have changed, including
    // the reader's own.
    state.hiveClaiming = false;
    await reloadHiveMap(state);
    state.hiveOpen = null;
    state.hivePan = { x: 0, y: 0 };
    renderHive(state);
  }

  // Çıkar — detaching from a member — is parked, not deleted: the panel
  // it lived in is gone (a member's hexagon opens nothing now), and where
  // a detach belongs on a page that is only the drawing is an open
  // question. hive_unbond() is untouched in the database and still
  // refuses a bond inside the week it was made in (see
  // db/hive_lattice_v4.sql); nothing calls it from here for the moment.

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
      ${show.account ? `<button type="button" class="ist-pc-delete-account" id="po-delete-account">${esc(t('profile.deleteaccount'))}</button>` : ''}
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
    const deleteBtn = document.getElementById('po-delete-account');
    if (deleteBtn) deleteBtn.addEventListener('click', async () => {
      if (!confirm(t('profile.deleteaccount.confirm'))) return;
      deleteBtn.disabled = true;
      const orig = deleteBtn.textContent;
      deleteBtn.textContent = t('profile.deleteaccount.deleting');
      // Deleting the auth.users row (and, by cascade, profiles and
      // everything FK'd to it) runs entirely inside Postgres via the
      // public.delete_own_account() SECURITY DEFINER function (see
      // db/delete_own_account.sql) -- it executes with the function
      // owner's privileges, so no service role key ever needs to reach
      // client code or a separately-deployed Edge Function.
      const { error } = await sb.rpc('delete_own_account');
      if (error) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = orig;
        const msgEl = document.getElementById('po-save-msg');
        if (msgEl) msgEl.textContent = t('profile.deleteaccount.error');
        return;
      }
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
      // Cache the new palette/theme locally so the reload starts in the
      // right colors instead of flashing the old ones.
      if (global.Palette) {
        global.Palette.setPalette(newPalette);
        global.Palette.setTheme(newTheme);
      }
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
    clearBarMember,
    unmount,
    mountLibraryCard,
    openProfileOverlay,
    closeProfileOverlay,
    mountHivePage,
    paintHiveEventMarks,
    clearHiveEventMarks,
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
