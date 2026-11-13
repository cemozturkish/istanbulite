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
  // The sheet is set in the house type (ui.css) at its real size and
  // scrolls inside itself like every other sheet when a page's blocks
  // run past the window -- it used to shrink every line until the whole
  // of it fitted, which is how it came to be set in 8px type.
  const PROFILE_SECTIONS = {
    anahane:   { hive: false, week: false, account: false, settings: false },
    kahvehane: { hive: false, week: true,  account: false, settings: false },
    kutuphane: { hive: false, week: false, account: true,  settings: true },
    // The innermost zoom level. Cover only, like Hane: the week's games
    // belong to İstanbul's own level and the account to Türkiye's.
    mahalle:   { hive: false, week: false, account: false, settings: false },
    // ── project is SEN ──
    // The app, and the one page a member actually reaches. Pressing your
    // own name on the top bar is where the petek's innermost depth went
    // when the depths were dropped (see the ONE DEPTH note), so this
    // sheet carries what that depth carried: the avatar arrows (the
    // cover's own, so it opens ready to change rather than behind a
    // Kişiselleştir press -- see `sen` in openProfileOverlay), the three
    // preferences, the kefil code, Çıkış Yap and Hesabımı Sil. It also
    // carries the account's read-only half, which Sen deliberately left
    // in the sheet -- there is no longer a second surface for it to be
    // left in.
    project:   { hive: false, week: false, account: true, settings: true, sen: true },
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
    // No seat: this level carries no map, and the district's own
    // Belediye Başkanı is already named one level out on Kahvehane.
    mahalle:   'ist-pc-seat-none',
    project:   'ist-pc-seat-none',
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

  // ── Your own meta line reads the flip book's DEPTH, not its lane ──
  // The name used to also walk sideways with project.html's lane drag
  // (setBarSlide/paintBarSlide, now removed) — the block travelled toward
  // whichever edge the reader was pulling the strip. It reads better held
  // dead centre, always, on every page: nothing about where you are
  // standing needs the words themselves to move.
  //
  // What DOES change with the flip book is which zoom level you are
  // standing at, and that is said by the second line instead — the same
  // slot your own district normally sits in. project.html calls
  // setBarLevelLabel(text) on every frame of the book's own depth as the
  // reader scrubs through it: "TÜRKİYE" at the outermost stop, "İSTANBUL"
  // at the middle one, and (once drawn) the reader's own ilçe at the
  // innermost. clearBarLevelLabel() hands the line back to the real
  // district the moment the page is left, so every other page keeps
  // printing what it always has.
  let _barLevelLabel = null;

  function setBarLevelLabel(text) {
    const next = text == null ? null : String(text);
    if (next === _barLevelLabel) return;
    _barLevelLabel = next;
    paintBarMe();
  }

  function clearBarLevelLabel() {
    if (_barLevelLabel === null) return;
    _barLevelLabel = null;
    paintBarMe();
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
    // Said out loud for whoever draws the city: project.html's home screen
    // lights the district a named member lives in, and puts it out again
    // when the name comes down (every clear goes through here).
    document.dispatchEvent(new CustomEvent('ist-hive-pick', {
      detail: member ? { id: String(member.member_id), neighborhood: member.neighborhood || null } : null,
    }));
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
    // Someone else's name always carries their own district; yours reads
    // the flip book's depth when project.html has set one (see
    // setBarLevelLabel above), and otherwise your real district.
    metaEl.textContent = _barMember ? _barMember.meta
      : (_barLevelLabel != null ? _barLevelLabel : (me.dataset.selfMeta || ''));
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

  // Two-option toggle. Legacy `system` values are remapped via normalize*
  // below to their nearest neighbour. palette_pref reuses the column
  // written by onboarding.js: 'mono' = siyah-beyaz, 'earth' = kahverengi.
  // Language is no longer set from this page — see "Hold the logo and the
  // app changes language" in project.html.
  const PALETTE_VALUES = ['mono', 'earth'];             // 0: Siyah-Beyaz,    1: Kahverengi
  const ADMIN_EMAIL = 'cemwozturk@gmail.com';

  function normalizePalette(v) { return v === 'earth' ? 'earth' : 'mono'; }

  // The three games the weekly grid can ever show a row for. Which of them
  // actually ran on a given NIGHT is not a fixed weekday pattern — it is
  // the admin's own per-night lineup (game_night_slots) minus whatever they
  // switched off (game_day_toggles), exactly as project.html's Oyunlar
  // column reads it. See getWeekGameStatus / GAME_DEFAULT_LINEUP below.
  const GAME_LABELS = {
    sozcel:  'Sözcel',
    tumcel:  'Tümcel',
    bulmaca: 'Çengel',
  };
  // Mirrors project.html's own GAME_DEFAULT_LINEUP and admin.html's copy —
  // what a night with no game_night_slots rows falls back to.
  const GAME_DEFAULT_LINEUP = ['sozcel', 'tumcel'];

  // Shirt overlays — the base clothing layer (see avatar.js), stacked
  // directly on the bald base before hair/hat/accessory. Both are fully
  // open to everyone — no lock, just like the hair options.
  //
  // THERE IS NO "YOK" HERE, and that is the point rather than an omission:
  // nobody is bare-chested on this site. Hair has a kel and a hat has an
  // absence because those are real ways to look; a missing shirt is not a
  // style, it is a member the app never dressed.
  //
  // Beyaz is `null` rather than `'white'` because null IS the default shirt
  // (avatar.js's DEFAULT_SHIRT) — so a member who has never touched this
  // picker already reads as white, switching back from black writes the
  // default rather than a second spelling of it, and this list needs no
  // migration to be usable. An explicit 'white' row still lands on this
  // option: shirtOptionIndex falls back to index 0 for any value not named
  // here, and index 0 renders white either way.
  //
  // A THIRD shirt would need a migration as well as a row here:
  // profiles.avatar_shirt carries a check constraint naming every allowed
  // value, so an option added here alone is offered in the picker and then
  // refused on save (db/avatar_shirt_v2_white.sql).
  const AVATAR_SHIRT_OPTIONS = [
    { value: null,    label: 'Beyaz Tişört', short: 'Beyaz', en: 'White' },
    { value: 'black', label: 'Siyah Tişört', short: 'Siyah', en: 'Black' },
  ];

  // Hair overlays for the layered avatar (bald base + optional transparent
  // hair PNG on top — see avatar.js). `null` is kel (bald, no overlay).
  const AVATAR_HAIR_OPTIONS = [
    { value: null,        label: 'Kel',               short: 'Kel',      en: 'Bald' },
    { value: 'buzz',      label: 'Çok kısa saç',      short: 'Çok kısa', en: 'Buzz' },
    { value: 'short',     label: 'Kısa saç',          short: 'Kısa',     en: 'Short' },
    { value: 'long',      label: 'Uzun saç',          short: 'Uzun',     en: 'Long' },
    { value: 'curly-long', label: 'Kıvırcık uzun saç', short: 'Kıvırcık', en: 'Curly' },
  ];

  // Hat overlays — a second, independent layer stacked on top of hair (see
  // avatar.js), so any hat can be worn over any hair. The locked Sözcü
  // reward is the 'crown' hat (used to be a single full-image override
  // before profiles.avatar_hat existed — see db/avatar_hat.sql).
  const AVATAR_HAT_OPTIONS = [
    { value: null,    label: 'Yok', short: 'Yok', en: 'None' },
    // 'crown' is parked, not deleted: assets/avatar/hat-crown.png was
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
    { value: null,       label: 'Yok',    short: 'Yok',    en: 'None' },
    { value: 'glasses',  label: 'Gözlük', short: 'Gözlük', en: 'Glasses', locked: true },
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
        <div class="ui-row">
          <div class="ui-row-k">${esc(t('profile.sponsoredcount'))}</div>
          <div class="ui-row-v">0 ${esc(t('profile.people'))}</div>
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
        <summary class="ui-row">
          <span class="ui-row-k">${esc(t('profile.sponsoredcount'))}</span>
          <span class="ui-row-v">${count} ${esc(t('profile.people'))}</span>
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
          <div class="ist-pc-score-game">Çengel</div>
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
  // rather than the usual win/played states. Also fetches which games
  // actually ran each of those nights (game_night_slots, defaulting to
  // GAME_DEFAULT_LINEUP for a night the admin never set) minus whichever
  // the admin switched off (game_day_toggles), so the grid shows the real
  // nights rather than an assumed weekday rotation.
  async function getWeekGameStatus(sb, userId) {
    const dateKeys = weekDatesIst();
    const isoDateKeys = weekDatesIstISO();
    const nightGames = {};
    dateKeys.forEach(k => { nightGames[k] = new Set(GAME_DEFAULT_LINEUP); });
    const empty = { dateKeys, played: new Set(), won: new Set(), sozcuDates: new Set(), nightGames };
    try {
      const [
        { data, error },
        { data: sozcuData, error: sozcuError },
        { data: slotsData, error: slotsError },
        { data: toggleData, error: toggleError },
      ] = await Promise.all([
        sb.from('game_results').select('game, date, won').eq('user_id', userId).in('date', dateKeys),
        sb.from('sozcel_sozcul_assignments').select('game_date').eq('user_id', userId).in('game_date', isoDateKeys),
        sb.from('game_night_slots').select('game_date, slot, game').in('game_date', isoDateKeys),
        sb.from('game_day_toggles').select('game, game_date').in('game_date', isoDateKeys),
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
      // A night that HAS rows in game_night_slots is fully described by
      // them (up to two games, one per slot) — the default lineup no
      // longer applies to it.
      if (!slotsError) {
        const nightsSet = new Set();
        (slotsData || []).forEach(r => {
          const idx = isoDateKeys.indexOf(r.game_date);
          if (idx === -1) return;
          nightsSet.add(idx);
        });
        nightsSet.forEach(idx => { nightGames[dateKeys[idx]] = new Set(); });
        (slotsData || []).forEach(r => {
          const idx = isoDateKeys.indexOf(r.game_date);
          if (idx === -1) return;
          nightGames[dateKeys[idx]].add(r.game);
        });
      }
      // A game switched off for the night was not actually offered, so it
      // drops out of that night's set regardless of where it came from.
      if (!toggleError) {
        (toggleData || []).forEach(r => {
          const idx = isoDateKeys.indexOf(r.game_date);
          if (idx === -1) return;
          nightGames[dateKeys[idx]].delete(r.game);
        });
      }
      return empty;
    } catch (e) {
      return empty;
    }
  }

  // Renders the 3-game × 7-day grid: white = day hasn't arrived yet, grey =
  // arrived but not played, yellow = played without winning, green = won.
  // A night that didn't actually carry a given game (status.nightGames,
  // built from the admin's own game_night_slots lineup and
  // game_day_toggles off-switch — see getWeekGameStatus) renders as a
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

    const rows = Object.keys(GAME_LABELS).map(gameId => {
      const label = GAME_LABELS[gameId];
      const cells = status.dateKeys.map((dateKey, i) => {
        let state, title;
        const onThatNight = status.nightGames && status.nightGames[dateKey] && status.nightGames[dateKey].has(gameId);
        if (!onThatNight) {
          state = 'inactive';
          title = `${label} — ${dayNames[i]}`;
        } else if (i > todayIdx) {
          state = 'future';
          title = `${label} — ${dayNames[i]}`;
        } else if (gameId === 'sozcel' && status.sozcuDates && status.sozcuDates.has(dateKey)) {
          state = 'sozcu';
          title = `${label} — ${dayNames[i]}: Sözcü`;
        } else {
          const k = gameId + '|' + dateKey;
          if (status.won.has(k)) { state = 'win'; title = `${label} — ${dayNames[i]}: kazandı`; }
          else if (status.played.has(k)) { state = 'played'; title = `${label} — ${dayNames[i]}: oynadı, kazanamadı`; }
          else { state = 'none'; title = `${label} — ${dayNames[i]}: oynamadı`; }
        }
        return `<span class="ist-pc-daycell ist-pc-daycell-${state}" title="${esc(title)}"></span>`;
      }).join('');
      return `
        <div class="ist-pc-weekgrid-row">
          <span class="ist-pc-weekgrid-label">${esc(label)}</span>
          <div class="ist-pc-weekgrid-cells">${cells}</div>
        </div>
      `;
    }).join('');

    return `<div class="ist-pc-weekgrid">${header}${rows}</div>`;
  }

  // Module-level state so a page can call setPage() to re-render the card
  // for a new page context (e.g. after a client-side navigation) without
  // re-fetching from Supabase. `_state` holds everything fetched once;
  // `_resizeListener` is tracked so unmount() can remove it instead of
  // leaking one more registration per mount() call.
  let _mounted = false;
  let _mounting = false;   // a doMount is fetching (see mount)
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
    // A mount already fetching: _page above is all the second call adds.
    // project.html can ask twice on one load (its registered mount() on a
    // virtual entry, its DOMContentLoaded on a real one), and two fetches
    // would race to build the same row.
    if (_mounting) return;

    // Only show on mobile — bail early on desktop to save Supabase calls.
    // Unless the page carries the bar at EVERY width: project.html is the
    // app, its desktop layout wears the same bar a phone does (it links
    // profile-bar.css with no media query), and a desktop with no bar
    // has no way to reach its own profile at all.
    if (!opts.everyWidth && window.innerWidth > 768) {
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
    // A desktop that started on a parts-bin page bailed above and is still
    // waiting for a phone-sized window; a page that carries the bar at
    // every width mounts it now, so that wait is over.
    if (_resizeListener) {
      window.removeEventListener('resize', _resizeListener);
      _resizeListener = null;
    }
    doMount();

    async function doMount() {
      _mounting = true;
      let session = null;
      try { ({ data: { session } } = await sb.auth.getSession()); }
      finally { if (!session) _mounting = false; }
      if (!session) return;
      const user = session.user;
      container.innerHTML =
        `<div class="ist-pc"><div class="ist-pc-loading"><span>Yükleniyor…</span></div></div>`;
      try { _state = await fetchProfileData(sb, I18N, user); }
      finally { _mounting = false; }
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

    const [{ data: profile }, { data: sponsoredRows }, { count: sozcuCount }, { count: eventKefilCount }] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).single(),
      sb.from('profiles').select('id, first_name, last_name, neighborhood, joined_at').eq('referred_by', user.id).order('joined_at', { ascending: true }),
      sb.from('sozcel_sozcul_assignments').select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('game_date', today),
      // How many events this member is ETKİNLİK KEFİLİ of (events.kefil_id,
      // db/events_kefil.sql) -- counted beside the people they vouched
      // for. A database without the column answers an error, read as 0.
      sb.from('events').select('id', { count: 'exact', head: true }).eq('kefil_id', user.id),
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
    if (global.Palette) {
      global.Palette.setPalette(palettePref);
    }

    return {
      sb, I18N, user, profile, kefaletCount, sponsoredList, sozcuCount, kefilOfUser,
      eventKefilCount: eventKefilCount || 0,
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

    // The chain of rings under the bar's edge, with the sun (or the moon)
    // standing on one of them. Started here rather than at mount(),
    // because the markup it paints has only just been rebuilt.

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
        eventKefilCount: state.eventKefilCount || 0,
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
    el.className = 'ist-sheet-overlay ist-sheet-under-bars profile-overlay';
    el.id = 'profile-overlay';
    el.hidden = true;
    el.innerHTML = `
      <div class="ist-sheet-backdrop" id="profile-overlay-backdrop"></div>
      <div class="ist-sheet ist-sheet-head profile-overlay-sheet" id="profile-overlay-sheet">
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
    // On a parts-bin page the sheet opens read-only every time and
    // Kişiselleştir turns the avatar's rows on (see settingsPageHTML /
    // avatarStepsHTML). There is nothing to save: each row and the
    // palette chips commit the moment they are pressed.
    //
    // Except where this sheet IS Sen (`sen` in PROFILE_SECTIONS): the
    // depth it replaced had the arrows standing on the hexagon with
    // nothing to press first, so it opens ready to change.
    _ov.customizing = !!sectionsFor(_ov.page).sen;
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
  let _hiveMountSeq = 0; // bumped by every mountHivePage; see there

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
    // A fresh mount replaces every node this page had, so the previous
    // mount's observer is watching elements that are about to be
    // detached, and the cached probes were taken inside a page that no
    // longer exists.
    if (_hive && _hive.hiveBoxObserver) { _hive.hiveBoxObserver.disconnect(); _hive.hiveBoxObserver = null; }
    bustHiveMeasureCache();
    // Every mount supersedes the one before it: a swipe away and back
    // starts a second one while the first is still inside its await, and
    // the loser must not carry on drawing into the winner's page.
    const seq = ++_hiveMountSeq;
    host.innerHTML = `<div class="ist-hive-page" id="po-hive-page">${hiveMountHTML()}</div>`;
    // The reader arrives at the middle depth, so the classes that say so
    // are set now rather than after the await below. They live on <html>
    // and outlive this page (anahane.html's events column is hidden by
    // ist-hive-offmid): left over from the depth the reader was standing
    // at when they swiped away, they hide that column for the whole of
    // the round trip -- and for good if this mount takes an early return.
    paintHiveDepthClasses(true);
    const st = await ensureProfileState(sb, I18N);
    // The page can be swapped out from under the fetch (a swipe away
    // while it is in flight), and then there is nothing to draw into --
    // or a newer mount has already drawn into it, which is the same
    // thing seen from the other side.
    if (!st || seq !== _hiveMountSeq || !document.getElementById('po-hive-mount')) return;
    // The reader arrives at the middle depth every time, including after
    // a swipe away and back — the same rule the three carousel pages
    // follow (see "Always in the middle" in CLAUDE.md).
    _hive = Object.assign({}, st, {
      sb, I18N, hiveOpen: null, hiveLoaded: false, hiveSelected: null,
      hivePan: { x: 0, y: 0 },
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
    // The page carries the drawing and nothing else now: the block that
    // used to stand under it is the profile sheet's (see the ONE DEPTH
    // note), and the rail that said which of three depths you were at
    // has nothing left to count.
    const page = document.getElementById('po-hive-page');
    // A first load has no last time to start from: rather than draw the
    // wrong shape and correct it, the drawing is held back until the map
    // lands (a beat, and blank paper is not a lie). Cleared by loadHive
    // whatever the answer -- including no answer at all, since a member
    // standing alone on their own petek is a real state and must draw.
    const waiting = !(_hiveMap && _hiveMap.cells);
    if (waiting) page.classList.add('ist-hive-waiting');
    renderHive(_hive);
    // The petek arrives the same way every time the reader walks onto
    // Hane, not only the first time in a session: you first, then the
    // people touching you, then their names (see hiveRevealFirst). A
    // mount with a cached map draws it here; a mount with nothing to
    // start from has nothing to reveal yet and is revealed by loadHive
    // when the map lands.
    if (!waiting) hiveRevealFirst(_hive, page);
    wireHiveGestures(_hive);
    loadHive(_hive);
  }

  // Called by anahane.html's own unmount() when the router swaps this
  // page out. Two things have to be unwound, and both of them because
  // they live OUTSIDE the swapped content and would otherwise be the
  // last word on a page that is no longer there:
  //
  //  - the depth classes on <html>, which quiet the events column at
  //    every depth but the middle one. Left behind at level 0 or 2 they
  //    hide that column on the way back in, before the next mount has
  //    reached its own applyHiveLevel -- and for good if that mount
  //    takes an early return.
  //  - _hive itself, which is what every in-flight fetch checks itself
  //    against before drawing.
  // Thrown by the page (project.html's logo).
  //
  // ── NOTHING ALREADY ON SCREEN MOVES ──
  // Opening does not zoom: the scale and the reader's own place on the
  // SCREEN are pinned (_hiveAnchor) for as long as the whole shape is up,
  // so the window growing round the drawing moves none of it, and what
  // changes is only that the cells further out come into being -- ring by
  // ring outward, a chain reaction off the petek that was already there
  // (the delays are the stylesheet's, keyed on --ring). Closing plays the
  // same chain inward and returns how long it takes, so the page can
  // shrink the window back only once the field has gone (releaseHiveAnchor).
  let _hiveAnchor = null;
  let _hiveOutTimer = 0;
  const HIVE_WHOLE_OUT_MS = 620;   // the inward wave: see .ist-hive-whole-out

  function hiveAnchorNow(state) {
    const me = document.querySelector('#po-hive-plane .ist-hive-me');
    if (!me || !state || !state.hiveFit) return null;
    const r = me.getBoundingClientRect();
    if (!r.width) return null;
    // The cell's own box, not its pressed transform: the press scales
    // about its centre, so the centre is the same either way.
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, scale: state.hiveFit.scale };
  }

  function setHiveWhole(on) {
    on = !!on;
    if (on === _hiveWhole) return 0;
    const page = document.getElementById('po-hive-page');
    clearTimeout(_hiveOutTimer);
    if (page) page.classList.remove('ist-hive-whole-out');
    if (on) {
      // Pinned while the window is still its resting size -- the one
      // moment the reader's place on the screen is the place to keep.
      if (!_hiveAnchor && _hive) _hiveAnchor = hiveAnchorNow(_hive);
      if (_hive) _hive.hivePan = { x: 0, y: 0 };
    } else if (page) {
      page.classList.add('ist-hive-whole-out');
      _hiveOutTimer = setTimeout(() => page.classList.remove('ist-hive-whole-out'), HIVE_WHOLE_OUT_MS + 60);
    }
    _hiveWhole = on;
    if (on) startHiveChain(); else stopHiveChain();
    if (!_hive) { if (!on) _hiveAnchor = null; return on ? 0 : HIVE_WHOLE_OUT_MS; }
    applyHiveLevel(_hive);
    if (document.getElementById('po-hive-view')) fitHive(_hive);
    return on ? 0 : HIVE_WHOLE_OUT_MS;
  }

  // Re-fit against whatever size the window is NOW -- the page calls this
  // in the same frame it changes the window, so the anchored drawing never
  // paints a frame in the old place.
  function refitHive() {
    if (_hive && document.getElementById('po-hive-view')) fitHive(_hive);
  }

  // The page has put the window back: unpin, and fit the ordinary way.
  // The drawing is where an ordinary fit puts it already (it never moved),
  // so this is a no-op on screen.
  function releaseHiveAnchor() {
    if (_hiveWhole) return;
    _hiveAnchor = null;
    // Placed, not animated, for the same reason an anchored fit is: the
    // window has just changed under it in this same frame, and animating
    // the transform from the anchored value would swing the drawing away
    // and back.
    if (_hive) _hive.hiveFitPlace = true;
    refitHive();
  }

  function unmountHivePage() {
    if (_hive && _hive.hiveBoxObserver) { _hive.hiveBoxObserver.disconnect(); _hive.hiveBoxObserver = null; }
    _hive = null;
    paintHiveDepthClasses(false);
  }

  // The window onto the grid is the page now, so it changes size with the
  // window — a phone rotating, a desktop window dragged narrower. The
  // drawing is re-fitted into it rather than left at the scale it was
  // measured for (see fitHive).
  window.addEventListener('resize', () => {
    // The two cached probes are functions of the viewport, so this is the
    // one thing that can invalidate them (see bustHiveMeasureCache).
    bustHiveMeasureCache();
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
    el.className = 'ist-sheet-overlay ist-sheet-under-bars';
    el.id = 'member-sheet';
    // Created up front and left in the DOM for the rest of the session:
    // a virtual navigation (see router.js) disables the page's own
    // stylesheet, so an element relying on a page class alone would end
    // up unstyled. The `hidden` attribute's display:none comes from the
    // browser's own stylesheet, so it stays correct regardless.
    el.hidden = true;
    el.innerHTML = `
      <div class="ist-sheet-backdrop" id="member-sheet-backdrop"></div>
      <div class="ist-sheet ist-sheet-head" id="member-sheet-sheet" role="dialog" aria-modal="true">
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
    // Where they live and how long they have been here are one line under
    // the name -- the two facts a profile leads with (see "Trust and the
    // earned avatar"), in the same place on this sheet and on your own.
    const lang = (I18N.isEnglish && I18N.isEnglish()) ? 'en' : 'tr';
    body.innerHTML = `
      <div class="po" lang="${lang}">
        ${coverHTML({ profile: data, avatarUrl: data.avatar_url, avatarHair: data.avatar_hair, avatarHat: data.avatar_hat, avatarAccessory: data.avatar_accessory, avatarShirt: data.avatar_shirt, displayName: fullName, metaPlace: nb, metaText: I18N.formatMemberSince(data.joined_at) })}
        <section class="po-sec">
          <div class="ui-label">${esc(I18N.t('profile.thisweek'))}</div>
          <div class="ui-box po-week">${weekGridHTML(weekStatus, I18N)}</div>
        </section>
        ${kefilName ? `
        <section class="po-sec">
          <div class="ui-box ui-rows">
            <div class="ui-row">
              <div class="ui-row-k">${esc(I18N.t('profile.kefil'))}</div>
              <div class="ui-row-v"><button type="button" class="kefil-link" data-user-id="${kefilId}">${esc(kefilName)}</button></div>
            </div>
          </div>
        </section>` : ''}
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
  // When editable AND customizing, the art layer is the live preview the
  // four pickers render into (#po-avatar-preview). The pickers themselves
  // are not on the cover any more: they used to be two columns of
  // unlabelled arrows hanging either side of the frame, four pairs with
  // nothing to say which pair was the hair and which the shirt. They are
  // labelled rows under the name now (see avatarStepsHTML), and the cover
  // is the same block whether or not it is being changed.
  function coverBadgesHTML(profile) {
    return normalizedCoverBadges(profile).map(p => {
      const badge = BADGES.find(b => b.id === p.id);
      if (!badge) return '';
      return `<img class="ist-pc-cover-badge" data-id="${badge.id}" draggable="false" decoding="async" style="left:${p.x}%; top:${p.y}%;" src="${badge.src}" alt="${esc(badge.label)}" title="${esc(badge.label)}">`;
    }).join('');
  }

  function coverHTML(opts) {
    const { profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName, metaText, metaPlace, editable, customizing, sozcuCount } = opts;
    // The line under the name: where they live, then (where the caller
    // has it) how long they have been a member. A district is a Turkish
    // name whatever language the sheet is in, so it carries its own lang
    // -- uppercased as English, Şişli prints "ŞIŞLI".
    const metaHTML = [
      metaPlace ? `<span lang="tr">${esc(metaPlace)}</span>` : '',
      metaText ? esc(metaText) : '',
    ].filter(Boolean).join(' · ');
    const badgesHTML = coverBadgesHTML(profile);
    // The avatar art layer. It is always its own element inside the frame
    // (never the frame box itself) because the carousels replace its whole
    // innerHTML on every arrow press — sharing a parent with the stickers
    // would wipe them (see .ist-pc-cover-art in profile-card.css).
    let artHTML;
    if (editable && customizing) {
      const hairOpt = AVATAR_HAIR_OPTIONS[hairOptionIndex(avatarHair)];
      const hatOpt = AVATAR_HAT_OPTIONS[hatOptionIndex(avatarHat)];
      const accessoryOpt = AVATAR_ACCESSORY_OPTIONS[accessoryOptionIndex(avatarAccessory)];
      const shirtOpt = AVATAR_SHIRT_OPTIONS[shirtOptionIndex(avatarShirt)];
      const title = `${hairOpt.label} · ${hatOpt.label} · ${accessoryOpt.label} · ${shirtOpt.label}`;
      artHTML = `<div class="ist-pc-cover-art" id="po-avatar-preview" title="${esc(title)}">${avatarPreviewHTML(avatarHair, avatarHat, avatarAccessory, avatarShirt, false)}</div>`;
    } else {
      artHTML = `<div class="ist-pc-cover-art">${coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt)}</div>`;
    }
    const customizingClass = (editable && customizing) ? ' ist-pc-cover-customizing' : '';
    // The frame box carries the badges (id po-cover — it's the drag surface
    // now that stickers live inside the frame rather than around it).
    return `
      <div class="ist-pc-cover${editable ? ' ist-pc-cover-editable' : ''}${customizingClass}">
        <div class="ist-pc-cover-picker">
          <div class="ist-pc-cover-avatar"${editable ? ' id="po-cover"' : ''}>
            ${badgesHTML}
            ${artHTML}
          </div>
        </div>
        <h2 class="ist-pc-cover-name ui-h">${esc(displayName)}</h2>
        <div class="ist-pc-cover-meta ui-label ui-quiet">${metaHTML}</div>
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
  // ── ONE DEPTH ──
  // The petek used to have three, pulled through with a finger: you
  // alone (Sen), you and the six touching you, and the whole shape. The
  // depths are gone, and the two that left went in different directions.
  //
  //   * **Sen is the profile sheet now**, opened by pressing your own
  //     name on the top bar -- which is where the avatar carousel, the
  //     three preferences, the kefil code and the way out already live
  //     (see PROFILE_SECTIONS). A depth of the drawing that was really a
  //     settings page is a settings page.
  //   * **The whole shape is parked** until it is worth drawing again.
  //
  // What stands in Hane is the middle one and nothing else: you, the six
  // places touching you, and their names.
  //
  // THE SEATS CAME BACK WITH IT. Offering a free side and claiming a
  // code belonged to the outermost depth alone, and that depth is
  // parked -- so they live on the one depth there is, or the app would
  // have no way left to attach one member to another, which is the whole
  // growth model (see db/hive_slot_codes_v5.sql).
  //
  // So the ring a cell may stand at is a CONSTANT rather than a level:
  // you (0) and the six touching you (1). The page carries no level
  // class at all any more -- there is one depth, so nothing is keyed to
  // which one it is.
  const HIVE_RING_CEILING = 1;
  // ── THE WHOLE SHAPE, behind the logo ──
  // The depth the petek used to reach by pulling down, brought back as a
  // switch the page throws (project.html's İstanbulite logo): every
  // member on the reader's map, their neighbours' neighbours, and the
  // field of empty places around all of it. Off, the drawing is the one
  // depth above and nothing else changes. While it is on, the ceiling is
  // lifted entirely (hiveCeiling), the names are not drawn -- at the size
  // the whole shape is drawn at they would be the only thing on the page,
  // and pressing a hexagon still names that member on the top bar -- and
  // the reader stands in the MIDDLE of the window rather than on its
  // floor, since the shape grows out in every direction.
  let _hiveWhole = false;
  function hiveCeiling() { return _hiveWhole ? Infinity : HIVE_RING_CEILING; }

  // ── The whole shape comes in as a CHAIN, ring by ring outward ──
  // Each ring outside the petek that was already standing is let in one
  // step after the ring inside it, so the honeycomb visibly grows out of
  // the reader's own hexagon rather than appearing as one sheet. Timed
  // HERE, off the first frame after the press, and not as CSS
  // transition-delays: the press frame is the heavy one (the window
  // grows, the plane is re-fitted), and on WebKit a delay counted from
  // the style change is already half spent by the time that frame is
  // painted, so a short chain arrived as one. Each ring keeps its own
  // plain fade (.ist-hive-field's transition); all this decides is when
  // its .ist-hive-away comes off. A ring is due (ring - 2) steps in;
  // the far edge, HIVE_FIELD_RING_LAST, is the last step, and the few
  // members standing further out go with it. Closing is untouched -- the
  // inward chain is the stylesheet's (.ist-hive-whole-out).
  //
  // ── And it starts WITH the shores, not after them ──
  // The chain is counted from the first frame after the press, the same
  // frame the map starts parting, so the field grows in while the two
  // shores and the buttons are still on their way out rather than once
  // they have gone. (It used to wait for two frames in a row to arrive on
  // time, up to 600ms, which on an iPhone meant waiting for the whole
  // 0.34s exit to finish first.) A ring not yet let in is primed at
  // opacity 0.01 on a layer of its own (.ist-hive-whole, profile-card.css),
  // so its fade only moves an opacity the compositor already holds.
  const HIVE_CHAIN_STEP = 95;
  let _hiveChain = null;   // { t0 } while the chain runs
  let _hiveChainRaf = 0;
  function hiveChainEnd() { return (HIVE_FIELD_RING_LAST - HIVE_RING_CEILING - 1) * HIVE_CHAIN_STEP; }
  function hiveRingDue(ring) {
    if (!_hiveChain || ring <= HIVE_RING_CEILING) return true;
    const step = Math.min(ring, HIVE_FIELD_RING_LAST) - HIVE_RING_CEILING - 1;
    return performance.now() - _hiveChain.t0 >= step * HIVE_CHAIN_STEP;
  }
  function stopHiveChain() {
    cancelAnimationFrame(_hiveChainRaf);
    _hiveChainRaf = 0;
    _hiveChain = null;
  }
  function startHiveChain() {
    stopHiveChain();
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    _hiveChain = { t0: performance.now() };
    const tick = () => {
      _hiveChainRaf = 0;
      if (!_hiveChain || !_hiveWhole) { _hiveChain = null; return; }
      const done = performance.now() - _hiveChain.t0 >= hiveChainEnd();
      if (done) _hiveChain = null;
      if (_hive) applyHiveLevel(_hive);
      if (!done) _hiveChainRaf = requestAnimationFrame(tick);
    };
    _hiveChainRaf = requestAnimationFrame(tick);
  }
  // How far the drawing may grow. fitHive still shrinks below this to
  // fit the window; it is a ceiling, not a size.
  const HIVE_ZOOM = 1.5;
  // How far a finger has to travel before the gesture is a drag rather
  // than a tap.
  const HIVE_GESTURE_SLOP = 8;
  const HIVE_CARD_GAP = 38;

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
  // The outermost ring the field gives a wrapper of its own (see
  // hiveGridHTML); everything further out shares it.
  const HIVE_FIELD_RING_LAST = 7;

  // The drawn hexagon, as geometry rather than as a picture.
  // Traced from assets/frame.png -- a 1024x1536 canvas carrying a
  // ring silhouette roughly 775x1162, which is why the <svg> using it
  // carries a 1024x1536 viewBox. Two contours, outer then inner, filled
  // evenodd: the ring itself as a shape, not a line down the middle of it.
  //
  // It is a fill and not a stroke because the drawn ring is not a
  // constant width. A single stroked centreline would only approximate
  // it; two contours (found by tracing the alpha channel's 0.5 level set
  // and simplifying with Douglas-Peucker) land the outline at ~98% of the
  // artwork's own pixels, the rest being antialiasing. A fill is also the
  // cheaper of the two to rasterise.
  //
  // Re-trace this if frame.png is ever redrawn. Like --ist-hive-step-x/y
  // in profile-card.css, it is the drawing's number and not the box's.
  const HIVE_HEX_PATH = 'M 513 1348 L 507 1348 L 307 1230 L 144 1138 L 127 1128 L 124 1122 L 124 876 L 126 796 L 124 492 L 124 410 L 132 404 L 328 294 L 510 186 L 514 188 L 738 320 L 889 404 L 894 408 L 898 414 L 898 659 L 896 747 L 898 1043 L 898 1125 L 878 1138 L 795 1184 L 622 1284 Z M 516 1311 L 527 1306 L 542 1296 L 710 1176 L 737 1156 L 802 1110 L 828 1087 L 838 1069 L 842 1054 L 844 985 L 842 967 L 844 862 L 844 674 L 842 569 L 844 551 L 842 476 L 834 456 L 815 436 L 541 238 L 519 226 L 505 224 L 495 228 L 483 236 L 376 312 L 281 382 L 220 424 L 194 447 L 184 466 L 180 481 L 178 569 L 178 697 L 178 862 L 180 967 L 178 985 L 180 1060 L 190 1081 L 204 1098 L 249 1132 L 278 1150 L 312 1176 L 480 1296 L 495 1306 L 504 1310 Z';
  // Its outer contour alone, for a hexagon drawn solid (hiveHiddenCellHTML).
  const HIVE_HEX_SOLID = HIVE_HEX_PATH.slice(0, HIVE_HEX_PATH.indexOf(' M ', 1));

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
  // ── Two probes that were being taken on every render ──
  // hiveFieldReach and hiveBandReserve each insert an element, read
  // getBoundingClientRect off it -- a forced synchronous layout -- and
  // remove it again. Neither answer can change between two presses: both
  // are functions of the viewport and of CSS values that only move when
  // the window does. So they are taken once and kept until something
  // that could actually change them happens.
  //
  // Cleared on resize and on every mount of the page (see mountHivePage);
  // a stale value here would size the ghost field or the reserved band
  // for a screen the reader is no longer holding.
  let _hiveMeasure = {};
  function bustHiveMeasureCache() { _hiveMeasure = {}; }

  // ── The field is built for the scale the petek STANDS at ──
  // It used to be built for the smallest scale a cell is ever drawn at
  // (HIVE_MIN_SCALE), which on a phone whose petek stands at ~1.0 is
  // three times as many hexagons as the screen can show -- ~330 against
  // ~100 -- and every one of them is a node the whole shape fades in.
  // On WebKit that was enough work on the press to swallow the wash's own
  // fade whole (it painted already finished). The whole shape is pinned
  // at the scale it opened at (setHiveWhole), so the scale of the last
  // fit is the one the field has to cover, less some slack for a pan.
  // Before any fit the old floor is used, and a scale that moves by more
  // than a tenth asks again.
  function hiveFieldScale() {
    const s = _hive && _hive.hiveFit && _hive.hiveFit.scale;
    return s > 0 ? Math.max(HIVE_MIN_SCALE, s * 0.85) : HIVE_MIN_SCALE;
  }
  function hiveFieldReach() {
    const scale = hiveFieldScale();
    const c = _hiveMeasure.reach;
    if (c && Math.abs(c.scale - scale) <= c.scale * 0.1) return c;
    const r = measureHiveFieldReach(scale);
    // Only cache a real answer: before anything has laid out this returns
    // the 4x4 floor, and caching that would freeze the field at the size
    // it had before the page existed.
    if (r.measured) _hiveMeasure.reach = r;
    return r;
  }

  function measureHiveFieldReach(scale) {
    scale = scale || HIVE_MIN_SCALE;
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
    const stepX = rect.width * scale;
    const stepY = rect.height * scale;
    if (!(stepX > 0) || !(stepY > 0)) return { cols: 4, rows: 4, measured: false }; // before anything has ever laid out
    // On a phone the clip is lifted at the outermost depth, so what has
    // to be covered is the screen itself; on a desktop the drawing is
    // still clipped to the middle column, and reaching past it would be
    // a few hundred outlines nobody can ever see.
    const phone = !!(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    const boxW = (page && page.clientWidth) || 0;
    const boxH = (page && page.clientHeight) || 0;
    // ── The screen, not the page's own box ──
    // On a phone the clip is lifted at the outermost depth, so
    // #po-hive-page's box is free to grow with the plane inside it -- and
    // the plane's size is decided by how many cells this function asks
    // for. Feeding that box back in here closed the loop: a re-render at
    // that depth measured a page the previous field had already enlarged
    // and asked for a bigger field again. Measured on a 390x844 phone,
    // one press at the outermost depth took the field from 306 cells to
    // 1692 and the next to 2182, all of the growth off-screen where
    // nobody could see any of it.
    //
    // What the field has to cover is the SCREEN, which is a fixed thing,
    // so that is what is measured. The desktop branch still measures the
    // page: the drawing is clipped to the middle column there, and
    // reaching past it would be a few hundred outlines nobody can see.
    //
    // And the screen is read off documentElement, never window.innerWidth
    // -- innerWidth is the other half of the same loop. With the clip
    // lifted the field overflows horizontally, and a mobile viewport set
    // to width=device-width answers that by shrinking to fit, so
    // innerWidth ITSELF doubles (390x844 -> 782x1693 on the phone this
    // was measured on) while documentElement.clientWidth and
    // visualViewport both stay put. Feeding innerWidth back in asked for
    // a field twice as wide as the screen, which overflowed further.
    const vpW = document.documentElement.clientWidth || window.innerWidth || 0;
    const vpH = document.documentElement.clientHeight || window.innerHeight || 0;
    const halfW = (phone || !boxW ? Math.max(vpW, 360) : boxW) / 2;
    const halfH = (phone || !boxH ? Math.max(vpH, 640) : boxH) / 2;
    const clamp = (n) => Math.min(HIVE_FIELD_MAX, Math.max(2, Math.ceil(n) + 1));
    // The reader is not always the middle of the screen (the home screen
    // stands them on the floor of a window), so a little more up and down.
    return { cols: clamp(halfW / stepX), rows: clamp(halfH * 1.1 / stepY), measured: true, scale };
  }

  // How much of the window's foot belongs to the page rather than to the
  // drawing, in px. Written in the stylesheet (--ist-hive-reserve, see
  // profile-card.css) because it is the phone's number, and MEASURED
  // rather than read: the value is a min() of a viewport unit and a cap,
  // which getPropertyValue hands back as its own unresolved text.
  // The paper the drawing's foot stands above. HIVE_CARD_GAP is Hane's:
  // the gap a card opening upward out of the events strip needs. A page
  // with nothing rising from under the petek says so with
  // --ist-hive-foot-gap on the window (project.html's home screen, where
  // the games stand still below it), and gets that room back.
  function hiveFootGap(view) {
    const v = parseFloat(getComputedStyle(view).getPropertyValue('--ist-hive-foot-gap'));
    return Number.isFinite(v) && v >= 0 ? v : HIVE_CARD_GAP;
  }

  function hiveBandReserve(varName) {
    if (_hiveMeasure[varName] != null) return _hiveMeasure[varName];
    const h = measureHiveBandReserve(varName);
    // 0 is both "this page reserves nothing" and "there is no page yet",
    // and only the first is worth keeping.
    if (h > 0) _hiveMeasure[varName] = h;
    return h;
  }

  function measureHiveBandReserve(varName) {
    const page = document.getElementById('po-hive-page');
    if (!page) return 0;
    const probe = document.createElement('div');
    probe.style.cssText = `position:absolute; visibility:hidden; width:0; height:var(${varName}, 0px);`;
    page.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    return h > 0 ? h : 0;
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

  // ── The three account actions, one implementation ──
  // They were printed in two places while the petek had a Sen depth of
  // its own; that depth is the profile sheet now (see the ONE DEPTH
  // note), so the sheet's account block is the one surface that carries
  // them — and it is the surface a member actually reaches, since
  // `project` is the app and pressing your own name on the bar is what
  // opens it.
  //
  // They stay three functions of their own rather than being typed out
  // inside the block that prints the buttons. Deleting the petek's copy
  // of Sen took these with it, and the sheet — the surviving caller —
  // threw on every open with nothing but a dead press to show for it.
  // Each takes the elements it acts on rather than looking them up, which
  // is what let the two surfaces carry different ids while they existed
  // and is what will let a second one exist again without a rename.
  function wireCopyCode(btn, state) {
    if (!btn) return;
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(state.profile?.referral_code || '');
      const orig = btn.textContent;
      btn.textContent = t('profile.copied');
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  }

  async function doSignOut(sb) {
    await sb.auth.signOut();
    window.location.href = 'index.html';
  }

  // Deleting the auth.users row — and, by cascade, profiles and
  // everything FK'd to it — runs entirely inside Postgres via the
  // public.delete_own_account() SECURITY DEFINER function (see
  // db/delete_own_account.sql): it executes with the function owner's
  // privileges, so no service role key ever needs to reach client code or
  // a separately-deployed Edge Function.
  async function doDeleteAccount(state, btn, msgEl) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    if (!confirm(t('profile.deleteaccount.confirm'))) return;
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = t('profile.deleteaccount.deleting');
    const { error } = await state.sb.rpc('delete_own_account');
    if (error) {
      btn.disabled = false;
      btn.textContent = orig;
      if (msgEl) msgEl.textContent = t('profile.deleteaccount.error');
      return;
    }
    await state.sb.auth.signOut();
    window.location.href = 'index.html';
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
  //
  // Under the name, where the member stands in their own day — drawn as
  // the app's own two screens rather than said in words. This is the
  // app's own formula (people → their ideas → our opinions on those
  // ideas) written on the drawing itself: a name says somebody is beside
  // you, this says they are in the middle of the same day you are, which
  // is the thing actually worth walking up to them about.
  // ── THE DAY GLYPH IS PARKED ──
  // For the launch a neighbour's caption is where they live, not where
  // they stand in their day: the home screen draws the petek as the guest
  // list of whatever evening is open, and a second set of marks under
  // every name (the glyph below, with its news half) would be two
  // languages on one drawing. Off, the caption is the district, nothing
  // asks hive_member_status, and the glyph is still written for when it
  // comes back.
  const HIVE_DAY_GLYPH = false;

  // ── A word that does not fit is set SMALLER, never cut and never given room ──
  // Each word of a name stands in its own box (.ist-hive-w), so it can be
  // measured and, if it is wider than the name's track, set in a smaller
  // size of its own (fitHiveWords). The track and the petek stay exactly
  // the size they were: a long surname is the one word that gets quieter.
  // It used to be `overflow-wrap: anywhere`, which printed KURTULUŞ as
  // KURTULU / Ş.
  function hiveWordsHTML(text) {
    return String(text || '').split(/\s+/).filter(Boolean)
      .map(w => `<span class="ist-hive-w">${esc(w)}</span>`).join(' ');
  }

  // Shrinks every word wider than its name's track to exactly fit it. In
  // em, against the name's own size, so the answer holds at any scale the
  // plane is drawn at (the plane is one transform; layout px are untouched
  // by it). Three passes -- reset, read, write -- so the whole petek costs
  // one layout, not one per word.
  function fitHiveWords(root) {
    const words = [...root.querySelectorAll('.ist-hive-name .ist-hive-w')];
    if (!words.length) return;
    words.forEach(w => { w.style.fontSize = ''; w.style.letterSpacing = ''; });
    const fits = words.map(w => {
      const track = w.closest('.ist-hive-name').clientWidth;
      const width = w.offsetWidth;
      if (!(track > 0) || width <= track) return null;
      // A hair under the exact ratio: a word landing exactly on the edge
      // reads as clipped.
      const k = (track / width) * 0.97;
      // letter-spacing is stated in px, so it does not shrink with the font
      // on its own -- left alone, a 17-letter surname came out ~5px over.
      // Scaled by the same factor, the whole word is exactly k as wide.
      const ls = parseFloat(getComputedStyle(w).letterSpacing) || 0;
      return { k, ls: ls * k };
    });
    words.forEach((w, i) => {
      const f = fits[i];
      if (!f) return;
      w.style.fontSize = f.k.toFixed(3) + 'em';
      w.style.letterSpacing = f.ls.toFixed(3) + 'px';
    });
  }

  function hiveNameHTML(member, side, status, t) {
    if (!side) return '';
    const sub = HIVE_DAY_GLYPH
      ? hiveStatHTML(status, t)
      : `<span class="ist-hive-name-sub">${hiveWordsHTML(hiveMemberDistrict(member))}</span>`;
    // .ist-hive-name-ev stays empty until an evening is open; then it
    // carries where this member stands on it (see applyHiveEventStates)
    // and the district steps aside for it.
    return `
      <span class="ist-hive-name ist-hive-name-${side}">
        <span class="ist-hive-name-label">${hiveWordsHTML(hiveMemberName(member))}</span>
        ${sub}<span class="ist-hive-name-ev"></span>
      </span>`;
  }

  // Above this the count stops being a number and becomes "a stack" —
  // the deck itself only ever draws three cards, so there is nothing
  // past the third for the count to be true of anyway. It is also, by
  // construction, the number of slots a column on either screen has.
  const HIVE_NEWS_MAX = 3;
  // How many slots each column of a screen actually has: three in the
  // wide one, TWO in the narrow one -- Oyunlar is Sözcel and Tümcel and
  // Anket is two positions (see stackActors' own `count` in
  // project.html). The caption is a picture of the real screen, so it
  // is counted the same way; a third box in the narrow column would be
  // a picture of a screen nobody has.
  const HIVE_DAY_SLOTS = { wide: 3, narrow: 2 };

  // ── Their day, drawn ──
  // It used to be two lines of type ("3+ HABER", "0/1 OYUN"), which said
  // the numbers and nothing about where in the app they stood. Every
  // screen in this app is the same object — a wider column and a
  // narrower one, three rectangles each, mirrored between the two lanes
  // (see "What each screen carries") — so the caption is that shape at
  // caption size, twice: Kütüphane on the left with its wide Haberler
  // column ranged outward, Kahvehane on the right with its own wide
  // column (Etkinlikler) out at ITS edge and the games in the narrow one
  // beside the channel. A reader who has used the app for a day knows
  // those two rectangles on sight, and an inked box under somebody's
  // name is a box they have actually stood in front of.
  //
  // THREE RECTANGLES AND TWO SQUARES, because that is what the screens
  // are. Both columns stand the same height, so the narrow one's two
  // boxes are each as tall as one and a half of the wide one's -- which
  // at two units across comes out square. The shapes are measured off
  // the real thing rather than chosen, and they are the whole of what
  // makes the miniature readable at this size.
  //
  // THREE STATES, not two: a slot is blank when there is nothing there
  // (or nothing this petek can know about), DARK GRAY while it is still
  // standing — there but not yet interacted with — and RED once it has
  // been. It used to draw only the gray half, on the reasoning that
  // "ink is what is still standing, never what they have got through" —
  // but a neighbour's hexagon is exactly where "have they actually
  // engaged with this" is worth reading at a glance, and a done slot
  // and an empty one used to be the same blank outline.
  //
  // Filled from the bottom of the column, done first, so it reads the
  // same way the day meter's own rising sea does (see "Gece is the
  // lights coming ON" / the day meter in CLAUDE.md): what is DONE is
  // the foundation, and what is still standing stacks above it. Past
  // both counts, whatever room is left in the column stays blank.
  //
  // The two columns with no ink in them are not a gap in the drawing,
  // they are the other half of each screen: Anket and Etkinlikler. An
  // evening is deliberately not completable (an evening is somewhere to
  // be, not content to get through) and a member's votes are their own
  // (neighborhood_poll_votes is readable by its own voter alone), so
  // neither is a number hive_member_status could hand back today. They
  // are drawn because the shape IS the app's screen and half of one is
  // not recognisable as it.
  function hiveDayColHTML(width, done, standing) {
    const n = HIVE_DAY_SLOTS[width];
    const doneN = Math.max(0, Math.min(n, done | 0));
    const standingN = Math.max(0, Math.min(n - doneN, standing | 0));
    let slots = '';
    for (let i = 0; i < n; i++) {
      // Slots are numbered from the dock up, exactly as the app's own
      // are (.fb-slot-N in project.html), so both counts fill from the
      // bottom of the column.
      const fromBottom = n - i;
      let cls = '';
      if (fromBottom <= doneN) cls = ' ist-hive-day-done';
      else if (fromBottom <= doneN + standingN) cls = ' ist-hive-day-standing';
      slots += `<span class="ist-hive-day-slot${cls}"></span>`;
    }
    return `<span class="ist-hive-day-col ist-hive-day-${width}">${slots}</span>`;
  }

  // Are the games on at all right now? NIGHT_GAMES_ENABLED in
  // project.html is false, so the games column is playable around the
  // clock -- only the night's word/puzzle rotates at sunset, the column
  // itself never swaps for the offer boxes. So the petek inks this
  // column at any hour; the flag flipping back on is what would make
  // this ask IstDate.edition() again.
  function hiveGamesTonight() {
    return true;
  }

  function hiveStatHTML(status, t) {
    if (!status) return '';
    const newsLeft = Math.max(0, status.news_stacked | 0);
    const newsDone = Math.max(0, status.news_done | 0);
    const total = hiveGamesTonight() ? Math.max(0, status.games_total | 0) : 0;
    const played = Math.min(total, Math.max(0, status.games_played | 0));
    const left = total - played;
    // Nothing standing and nothing done is not a score of zero, it is
    // an empty day — and an empty deck says so on its own page ("Hepsi
    // bu kadar"). On somebody else's hexagon it is simply not a
    // caption: twelve blank rectangles under a name say less than
    // nothing.
    if (!newsLeft && !newsDone && !left && !played) return '';
    // The words the drawing replaced are what a screen reader is given,
    // and what a pointer gets on hover: the picture is the caption, not
    // the whole of the fact. The fraction is printed whether or not they
    // have started (0/3 is the point of it) and disappears only on a day
    // the admin left with no games at all (`0/2` on an ordinary night).
    const words = [];
    if (newsLeft > 0 || newsDone > 0) {
      const n = newsLeft > HIVE_NEWS_MAX ? `${HIVE_NEWS_MAX}+` : String(newsLeft);
      words.push(`${n} ${t('profile.hive.stat.news')}`);
    }
    if (total > 0) words.push(`${played}/${total} ${t('profile.hive.stat.games')}`);
    const label = esc(words.join(' · '));
    return `
      <span class="ist-hive-stats ist-hive-day" role="img" aria-label="${label}" title="${label}">
        <span class="ist-hive-day-screen">
          ${hiveDayColHTML('wide', newsDone, newsLeft)}${hiveDayColHTML('narrow', 0, 0)}
        </span>
        <span class="ist-hive-day-screen">
          ${hiveDayColHTML('narrow', played, left)}${hiveDayColHTML('wide', 0, 0)}
        </span>
      </span>`;
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
        <div class="ist-hive-glow">
          <div class="ist-pc-cover-avatar ist-hive-frame">
            ${coverBadgesHTML(member)}
            <i class="ist-hive-edge" aria-hidden="true"></i>
            <div class="ist-pc-cover-art">${coverAvatarHTML(member.avatar_url, member.avatar_hair, member.avatar_hat, member.avatar_accessory, member.avatar_shirt)}</div>
          </div>
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
        <div class="hexframe ist-hive-frame ist-hive-slot">${inner}<i class="ist-hive-edge" aria-hidden="true"></i></div>
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
  // ── The empty field is drawn, not masked ──
  // Every other cell on the plane is a .hexframe: two PNG-masked layers
  // (avatar-background.png through -webkit-mask, then frame.png again on
  // ::after, see frames.css). That is the right primitive for a cell that
  // holds avatar art -- the mask is what the art is cut out by.
  //
  // A ghost holds nothing. It is one hexagon outline, and it was paying
  // for two image masks anyway. On a phone the field runs off all four
  // edges of the screen at the outermost depth (hiveFieldReach), which is
  // ~190 of these, so the drawing nobody interacts with was costing
  // ~380 masked compositing surfaces -- inside a plane that is being
  // scaled by fitHive and dragged by the reader's own finger. Image
  // masks are the most expensive thing a mobile compositor is asked to
  // do here, and this was the one place asking for hundreds of them to
  // draw nothing at all.
  //
  // So a ghost's frame is an <svg> filling HIVE_HEX_PATH instead: no
  // mask, no ::after. The path is traced from frame.png itself (see
  // HIVE_HEX_PATH), so the empty places are the same drawn hexagon as the
  // occupied ones rather than a geometric stand-in -- the frame is
  // hand-drawn, and a machine-perfect polygon beside it reads as a
  // different object on a page whose whole subject is one drawing.
  //
  // The wrapping <div> stays, and deliberately. Making the cell itself
  // the <svg> looks like it should save an element, but it does not --
  // the <use> is an element too, so the count is identical -- and an
  // <svg> root carrying a viewBox has an intrinsic ratio with no
  // intrinsic size, so .ist-hive-cell's own `width` does not resolve on
  // it the way it does on the <div>/<button> every other cell is. Keeping
  // the div means the box, data-ring, --ring and every rule that reads
  // them behave exactly as they did before this change; only what is
  // drawn inside the box is different.
  // A place somebody stands in whom the reader is not shown (a block):
  // the drawn ring over its own outer shape filled dark, so it reads as
  // taken rather than as a free seat. Not a control -- no press, no name.
  function hiveHiddenCellHTML(meta) {
    return `<div class="ist-hive-cell ist-hive-ghost ist-hive-hidden" ${meta} aria-hidden="true">`
      + `<svg class="ist-hive-frame ist-hive-ghost-ink" viewBox="0 0 1024 1536">`
      + `<use class="ist-hive-hidden-fill" href="#ist-hive-hex-solid"/><use href="#ist-hive-hex"/></svg></div>`;
  }

  function hiveGhostCellHTML(meta) {
    return `<div class="ist-hive-cell ist-hive-ghost" ${meta} aria-hidden="true">`
      + `<svg class="ist-hive-frame ist-hive-ghost-ink" viewBox="0 0 1024 1536"><use href="#ist-hive-hex"/></svg></div>`;
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
        <div class="ist-hive-glow">
          <div class="ist-pc-cover-avatar ist-hive-frame">
            ${coverBadgesHTML(profile)}
            <i class="ist-hive-edge" aria-hidden="true"></i>
            <!-- The art is its own layer inside the frame because the avatar
                 carousels replace its whole innerHTML on every arrow press
                 (see wireHairCarousel and friends, which this page reuses
                 unchanged at level 0) — sharing a parent with the badges
                 would wipe them. -->
            <div class="ist-pc-cover-art" id="po-avatar-preview">${coverAvatarHTML(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt)}</div>
            ${claim}
          </div>
        </div>
      </button>
    `;
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
    // Somebody stands here and the reader is not shown who (a block, see
    // fetchHiveMap). Taken like any member's cell -- never a free seat --
    // and drawn as a dark hexagon that takes no press.
    const hidden = (opts.hive && opts.hive.hidden) || [];
    const open = opts.open || null;
    const status_ = (opts.hive && opts.hive.status) || new Map();
    const taken = new Set(cells.map(c => `${c.q},${c.r}`));
    hidden.forEach(c => taken.add(`${c.q},${c.r}`));
    // The caller stands at (0,0) too — a name must not be printed over
    // their frame either.
    const occupied = new Set(taken); occupied.add('0,0');

    const items = [{ q: 0, r: 0, kind: 'me' }];
    cells.forEach(c => items.push({ q: c.q, r: c.r, kind: 'member', member: c }));
    hidden.forEach(c => items.push({ q: c.q, r: c.r, kind: 'hidden' }));
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

    // ── The field is drawn in RINGS, one wrapper per ring ──
    // so the whole shape's chain fades a handful of layers rather than
    // every hexagon on its own (see .ist-hive-field). The wrappers are
    // static boxes: each ghost is still placed on the plane, and the plane
    // is still its offsetParent. Rings past HIVE_FIELD_RING_LAST share the
    // last wrapper -- they are the far edge, and go together.
    const field = {};
    // The backing layer: one enlarged solid hexagon behind every place that
    // is a person or a seat, drawn BEFORE every cell so it is under all of
    // them. Overlapping, the copies merge into one straight-edged slab the
    // shape of the whole petek. It is its own layer rather than a pseudo on
    // each cell because a neighbour's backing would otherwise paint over
    // the previous cell's hexagon.
    let back = '';
    // The same shapes again, darker and stroked, all drawn before every fill:
    // what shows past the fills' outer edge is the slab's stroke, with no
    // lines inside it where two hexagons meet.
    let edge = '';
    const html = items.map(item => {
      const p = hivePos(item.q, item.r, minX, minY);
      // Where it stands on the plane, and how far out it stands from the
      // reader — the second is the whole of what decides whether a cell
      // is drawn (see HIVE_RING_CEILING), so it is written into the cell
      // rather than recomputed from a coordinate the DOM never carried.
      // --ring mirrors data-ring as a CSS custom property, since calc()
      // cannot read a data-* attribute.
      const ring = hiveRing(item.q, item.r);
      // Which side of the reader a ring-1 cell stands on: used for the
      // name (member cells only, see nameSide below) and for the
      // direction a cell standing past the ceiling slides away in (see
      // .ist-hive-away[data-side] in profile-card.css).
      const side = (item.q + item.r / 2) < 0 ? 'left' : 'right';
      const meta = `style="left: calc(var(--ist-hive-step-x) * ${p.x}); top: calc(var(--ist-hive-step-y) * ${p.y}); --ring: ${ring};" `
        + `data-ring="${ring}"` + (ring === 1 ? ` data-side="${side}"` : '');
      if (item.kind !== 'ghost') {
        edge += `<svg class="ist-hive-back ist-hive-back-edge" ${meta} viewBox="0 0 1024 1536" aria-hidden="true">`
          + `<use href="#ist-hive-hex-solid"/></svg>`;
        back += `<svg class="ist-hive-back" ${meta} viewBox="0 0 1024 1536" aria-hidden="true">`
          + `<use href="#ist-hive-hex-solid"/></svg>`;
      }
      if (item.kind === 'me') return hiveMeCellHTML(opts, meta, open, t);
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
      if (item.kind === 'hidden') return hiveHiddenCellHTML(meta);
      if (item.kind === 'ghost') {
        const band = Math.min(ring, HIVE_FIELD_RING_LAST);
        field[band] = (field[band] || '') + hiveGhostCellHTML(meta);
        return '';
      }
      return hiveEmptyCellHTML(item.dir, meta, (open && open.dir === item.dir) ? open : null, t);
    }).join('') + Object.keys(field).map(band =>
      `<div class="ist-hive-field" data-ring="${band}" style="--ring: ${band};">${field[band]}</div>`).join('');

    const w = `calc(var(--ist-hive-step-x) * ${maxX - minX} + var(--ist-hive-cell-w))`;
    const h = `calc(var(--ist-hive-step-y) * ${maxY - minY} + var(--ist-hive-cell-h))`;
    // One copy of the drawn hexagon for the whole plane; every ghost is a
    // <use> of it (see hiveGhostCellHTML). Inside the plane rather than
    // the document so it leaves with the mount -- Hane is re-mounted on
    // every entry, and a <defs> left behind in the body would be a second
    // element claiming the same id.
    const defs = `<svg class="ist-hive-defs" width="0" height="0" aria-hidden="true" focusable="false">`
      + `<defs><path id="ist-hive-hex" d="${HIVE_HEX_PATH}" fill-rule="evenodd"/>`
      + `<path id="ist-hive-hex-solid" d="${HIVE_HEX_SOLID}"/></defs></svg>`;
    return `
      <div class="ist-hive" id="po-hive-view">
        <div class="ist-hive-plane" id="po-hive-plane" style="width: ${w}; height: ${h};">${defs}<div class="ist-hive-backing">${edge}${back}</div>${html}</div>
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

  // ── What the current depth says on <html> ──
  // Three classes, written on the root rather than on the page, because
  // what reacts to them is not this file's: the kept-events column
  // beside the petek (anahane.html's own #events-panel) only belongs to
  // the middle depth -- the reader's six neighbours are the ones a kept
  // event's verdict is even about. A class rather than a DOM reference
  // across the script boundary: the petek page never needs to know the
  // column exists.
  //
  // Two classes for that one fact rather than one, and the rule that
  // quiets the column is written on the OFF state (see anahane.html): a
  // class that never lands -- profile-card.js still loading, a page
  // entered by a route that never mounted the petek, an exception in the
  // middle of a render -- must leave the column READABLE, not blank.
  // `:not(mid)` failed the other way round, and a column that has
  // quietly gone invisible looks exactly like one with nothing in it.
  // Passing a null level here is that state said out loud: neither class
  // on, column readable (see unmountHivePage).
  //
  // And the outermost depth, for the same reason the other way round:
  // that depth is the whole shape, so the drawing is let out of its
  // window there and runs off every edge of the screen -- under the
  // events column, past the tab bar -- instead of stopping in mid-air
  // with bare paper past it (see .ist-hive's overflow in
  // profile-card.css and anahane.html's own main). The window itself is
  // unchanged, so what the drawing is scaled to and where the reader
  // stands in it are exactly what they were: only the clip is lifted.
  //
  // They outlive the page they were set on -- <html> is not swapped by a
  // virtual navigation -- so the mount sets them up front and the
  // unmount clears them, neither of which has a state to read a level
  // off. That is why this is a function of a level and not of a state.
  function paintHiveDepthClasses(standing) {
    const root = document.documentElement;
    // With one depth these say only whether a petek is standing at all:
    // mid while it is, neither while it is not. `ist-hive-offmid` is
    // kept and never set -- anahane.html quiets its events column on
    // that class precisely so a class that never lands leaves the
    // column READABLE (see the note that follows), and a rule written
    // the other way round would blank it for good now that nothing
    // ever sets it. `ist-hive-all` was the whole shape's and is parked
    // with it.
    root.classList.toggle('ist-hive-mid', !!standing);
    root.classList.remove('ist-hive-offmid');
    root.classList.remove('ist-hive-all');
  }

  // Puts the page into the one depth there is: which cells are drawn
  // (a cell may stand no further out than HIVE_RING_CEILING) and which
  // of them answer a press. It never rebuilds anything -- the drawing
  // is one set of nodes, and this is a fade rather than a re-render.
  //
  // THE SEATS ARE LIVE HERE. They used to be the outermost depth's
  // alone, and below it every cell was `disabled` -- a hexagon that
  // answers a press by doing nothing being worse than one that plainly
  // does not answer. That depth is parked, so the rule is simply gone:
  // the only cells that do not answer are the ones standing further out
  // than the drawing reaches.
  function applyHiveLevel(state) {
    const mount = document.getElementById('po-hive-mount');
    const page = document.getElementById('po-hive-page');
    if (page) page.classList.toggle('ist-hive-whole', _hiveWhole);
    const ceiling = hiveCeiling();
    // A ring is drawn when it is inside the ceiling AND, while the whole
    // shape's chain is still running, its turn has come (hiveRingDue).
    const away = (ring) => ring > ceiling || !hiveRingDue(ring);
    if (mount) mount.querySelectorAll('.ist-hive-field').forEach(band => {
      band.classList.toggle('ist-hive-away', away(parseInt(band.dataset.ring, 10) || 0));
    });
    if (mount) mount.querySelectorAll('.ist-hive-back').forEach(b => {
      b.classList.toggle('ist-hive-away', away(parseInt(b.dataset.ring, 10) || 0));
    });
    if (mount) mount.querySelectorAll('.ist-hive-cell:not(.ist-hive-ghost)').forEach(cell => {
      const ring = parseInt(cell.dataset.ring, 10) || 0;
      const isAway = away(ring);
      cell.classList.toggle('ist-hive-away', isAway);
      if (cell.tagName === 'BUTTON') cell.disabled = isAway;
    });
  }

  // ── The petek arrives in three beats ──
  // Rather than the whole grid fading in as one rectangle: the reader's
  // own hexagon first, then the ring touching them, then their names.
  // The stages are three classes stepped in JS rather than one class
  // with per-cell transition-delays, because the delays have to survive
  // being armed while the layer carrying the petek is itself still
  // fading in (Proje's slide-12 lane walk does exactly that) -- and a
  // delay that runs out under a layer nobody can see yet is a beat the
  // reader never sees.
  //
  // Arming and playing are separate for the same reason: the walk onto
  // Hane asks for the reveal when it *starts* (so the cells are held
  // back for the whole of it and nothing has to be flashed out) and
  // plays it when it lands. Everything else does both at once.
  // The two gaps are not the same length: the reader's own hexagon is one
  // shape and the ring is six, so waiting as long for the ring as for the
  // names reads as a pause rather than as a beat.
  const HIVE_REVEAL_BEAT = 80;    // you -> the ring touching you
  const HIVE_REVEAL_BEAT_2 = 160; // the ring -> their names
  const HIVE_REVEAL_HOLD = 1600;  // an armed reveal nobody played is played anyway
  const HIVE_WALK_HOLD = 6000;    // the same, for a hold a lane walk owns (holdHivePage)

  function armHiveReveal(state, page, holdMs) {
    if (!page || page.classList.contains('ist-hive-reveal')) return;
    // ── The hold is SNAPPED, never transitioned into ──
    // The cells are standing at full strength when a reveal is armed, so
    // holding them back through the same 260ms transition the beats use
    // fades the whole petek OUT -- and on Proje that fade-out runs while
    // the layer carrying it is fading IN, which is the entire shape
    // showing itself faintly before the reader's own hexagon has even
    // arrived. So the held state lands with no transition at all and the
    // transition is put back on the next frame, in time for the beats.
    page.classList.add('ist-hive-reveal', 'ist-hive-reveal-arm');
    // Committed now, so the first beat has something to interpolate
    // from: adding the held state and the first stage in one style pass
    // leaves nothing for the transition -- the same reason IstSheet.open
    // reads a style back before its own .open class lands.
    void page.offsetWidth;
    requestAnimationFrame(() => page.classList.remove('ist-hive-reveal-arm'));
    state.hiveRevealPlayed = false;
    clearTimeout(state.hiveRevealHoldTimer);
    // A reveal that was armed and never played would hold the petek
    // hidden for good -- an interrupted walk must not cost the reader
    // the drawing. A caller that holds it for the length of a walk
    // (holdHivePage) owns the release and passes a much longer fallback:
    // the usual one running out under a slow drag would play the reveal
    // half way through the fade-in, and the landing's own reveal would
    // then play it a second time.
    state.hiveRevealHoldTimer = setTimeout(() => playHiveReveal(), holdMs || HIVE_REVEAL_HOLD);
  }

  function clearHiveReveal(state, page) {
    clearTimeout(state.hiveRevealHoldTimer);
    clearTimeout(state.hiveRevealTimer);
    (state.hiveRevealTimers || []).forEach(clearTimeout);
    state.hiveRevealTimers = [];
    page.classList.remove('ist-hive-reveal', 'ist-hive-reveal-arm',
                          'ist-hive-reveal-0', 'ist-hive-reveal-1',
                          'ist-hive-reveal-2');
  }

  // ── Held for the length of a walk onto the petek ──
  // Proje's middle lane fades the petek in as the reader walks onto it
  // and remounts it on landing, and the remount plays the reveal. Without
  // a hold the cells stood at full strength for the whole fade-in (they
  // were left that way by the last reveal) and were then snapped out and
  // revealed again: the grid showed itself, vanished to the reader's own
  // hexagon, and came back -- the entrance played twice. So the walk
  // holds the drawing back the moment the lane starts to appear, and the
  // landing's reveal is the only one. Whatever was left of a previous
  // reveal is cleared first, since a walk back inside its tail would
  // otherwise find the class on and hold nothing.
  function holdHivePage() {
    const page = document.getElementById('po-hive-page');
    if (!page || !_hive) return;
    if (page.classList.contains('ist-hive-waiting')) return;
    clearHiveReveal(_hive, page);
    armHiveReveal(_hive, page, HIVE_WALK_HOLD);
  }

  // The walk was abandoned before it landed: put the drawing back. Only
  // ever called with the lane out of sight, so nothing is seen to snap.
  function releaseHivePage() {
    const page = document.getElementById('po-hive-page');
    if (!page || !_hive) return;
    if (_hive.hiveRevealPlayed) return;
    clearHiveReveal(_hive, page);
  }

  function playHiveReveal() {
    const page = document.getElementById('po-hive-page');
    const state = _hive;
    if (!page || !state) return;
    if (!page.classList.contains('ist-hive-reveal')) return;
    if (state.hiveRevealPlayed) return;
    state.hiveRevealPlayed = true;
    clearTimeout(state.hiveRevealHoldTimer);
    const beat = (n, ms) => setTimeout(() => {
      if (document.getElementById('po-hive-page') === page) page.classList.add('ist-hive-reveal-' + n);
    }, ms);
    // Two frames, not one: an arm in this same tick (hiveRevealFirst does
    // exactly that) still has its no-transition class on for the frame
    // after it, and a first beat landing inside that frame would snap on
    // instead of fading.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (document.getElementById('po-hive-page') !== page) return;
      page.classList.add('ist-hive-reveal-0');           // you
      state.hiveRevealTimers = [
        beat(1, HIVE_REVEAL_BEAT),                        // the people touching you
        beat(2, HIVE_REVEAL_BEAT + HIVE_REVEAL_BEAT_2),   // who they are
      ];
    }));
    clearTimeout(state.hiveRevealTimer);
    state.hiveRevealTimer = setTimeout(() => {
      page.classList.remove('ist-hive-reveal', 'ist-hive-reveal-arm',
                            'ist-hive-reveal-0', 'ist-hive-reveal-1',
                            'ist-hive-reveal-2');
    }, HIVE_REVEAL_BEAT + HIVE_REVEAL_BEAT_2 + 500);
  }

  // Both at once: the drawing is already on the screen and there is
  // nothing to wait for (see loadHive's first draw).
  function hiveRevealFirst(state, page) {
    armHiveReveal(state, page);
    playHiveReveal();
  }

  // ── Arriving on the petek without remounting it ──
  // The petek is mounted once and then kept: Proje's own mountPetek
  // refuses to REmount a standing one, because that would pull the
  // drawing out from under a reader who is already in it. But arriving on
  // it is arriving whether or not anything was rebuilt, and the reveal
  // belongs to the arrival rather than to the mount -- so a page that owns
  // a walk onto it asks for it here. A reveal already running is left
  // alone, and a page that isn't there is not an error: the caller has no
  // way to know the petek's state and shouldn't have to.
  //
  // On project.html nothing calls this any more: the petek is behind the
  // logo there and every OPENING remounts, so the mount's own
  // hiveRevealFirst is the arrival. anahane.html (a parts-bin page) still
  // walks onto it as a lane, which is what this is for.
  function revealHivePage() {
    const page = document.getElementById('po-hive-page');
    if (!page || !_hive) return;
    // Nothing has landed yet: this mount is still holding the drawing
    // back (see ist-hive-waiting), and loadHive reveals it when it does.
    if (page.classList.contains('ist-hive-waiting')) return;
    armHiveReveal(_hive, page);
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
    // A window with no top bar (a parts-bin page on a desktop, see mount;
    // project.html carries the bar at every width) has nowhere to put
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
    paintHivePicked(state);
  }

  // ── Pressing anywhere else puts your own name back ──
  // Picking a member used to be undone only by pressing that same hexagon
  // again, which nobody finds. A press on anything that is not another
  // member's hexagon, nor the bar carrying their name (that press opens
  // their profile), steps back out. One listener for the module, guarded
  // by the live state, so it is inert on every page that has no petek
  // standing and needs no unbinding when a page is swapped.
  document.addEventListener('click', (e) => {
    const st = _hive;
    if (!st || !st.hiveSelected) return;
    if (!document.getElementById('po-hive-mount')) return;
    const t = e.target;
    if (!t || !t.closest) return;
    // Another member is pickHiveMember's to toggle; the bar is the second
    // step of the gesture; the profile sheet opened from it is a surface.
    if (t.closest('.ist-hive-cell[data-member-id]')) return;
    if (t.closest('#ist-pc-me, #ist-pc-mount, .ist-sheet-overlay, #member-sheet')) return;
    st.hiveSelected = null;
    setBarMember(null);
    paintHivePicked(st);
  }, true);

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

    const vw = view.clientWidth;
    // ── And the room the page keeps at the foot of the window ──
    // On a phone the foot of this band carries Hane's events strip, laid
    // over the drawing rather than standing in a row of its own (see
    // .col-left in anahane.html), and a card opened in it grows upward.
    // That room is reserved here, so the drawing is fitted to what is
    // left above it AND stands on top of it: an open card can never come
    // up over the people, whatever size the honeycomb happens to be
    // drawn at on this screen. It replaces a flat lift, which was a
    // guess at one screen's fit and stopped clearing the card the moment
    // the drawing resolved a little larger than the screen it was
    // guessed on. It is the OPEN height that is reserved, since that is
    // the one the drawing has to clear; the resting height
    // (--ist-hive-reserve-rest) was what the old centred pose was taken
    // against and is not read any more -- the petek stands on the floor
    // of the band now rather than being centred in what the shut strip
    // leaves (see offsetY).
    const openReserve = hiveBandReserve('--ist-hive-reserve');
    const reserve = openReserve;
    const vhFull = view.clientHeight;
    const vh = vhFull - reserve;
    // The grid is drawn before the page is unhidden, so the first
    // measurement is a screenful of zeroes. Wait for a frame that has
    // real numbers in it rather than leaving the plane hanging off the
    // middle of a window it was never measured against — bounded, so a
    // page swiped away before it ever laid out doesn't leave a frame loop
    // behind.
    if (!vw || !vh || !plane.offsetWidth || !plane.offsetHeight) {
      // Nothing has laid out yet. This used to re-ask on the next frame,
      // up to 30 times -- half a second of blank paper on the app's
      // landing page, and on a slow first load it could run out of tries
      // and simply give up. The observer below is told when the boxes
      // become real, so there is nothing to poll for: return, and be
      // called back.
      watchHiveBox(state);
      return;
    }

    const cx = me.offsetLeft + me.offsetWidth / 2;
    const cy = me.offsetTop + me.offsetHeight / 2;
    // Before the names are measured below, so they are measured at the
    // size they will actually be drawn at.
    fitHiveWords(plane);

    // What has to fit is what is actually *drawn* at this level, not the
    // plane's own box: the plane is sized for the whole map at every
    // depth (the cells never move, they only fade), so measuring it would
    // hand level 0 the room a hundred-member petek needs and draw the one
    // hexagon on it the size of a stamp. So the visible cells are
    // measured, and the names with them where they are printed — a name
    // hangs outside the plane's box, and the outermost one is exactly
    // what a window fitted to the cells alone would clip.
    //
    // Filtered by each cell's own data-ring rather than by
    // .ist-hive-away: a plain ring comparison is what tells "the six
    // touching the reader" apart from the whole transparent field drawn
    // around them, and the field is most of the nodes on the plane.
    let minL = cx, maxR = cx, minT = cy, maxB = cy;
    // Whatever hangs outside a cell's own box on this level and still has
    // to be on the paper: a member's name, and the avatar arrows at the
    // depth that shows them. A capital with letter-spacing after it
    // paints a little past its own box, so the track is not quite the
    // ink: fit the wider of the two, and leave a breath after it —
    // anything whose far edge lands exactly on the window's edge reads
    // as clipped rather than fitted.
    // No names are drawn on the whole shape, so none are fitted.
    const outriders = (cell) => (_hiveWhole ? [] : [...cell.querySelectorAll('.ist-hive-name')]);
    // The ceiling caps this at 7 cells (the
    // ghost field's hundreds of cells all sit well past it), so this
    // never becomes the offsetLeft/offsetTop reflow storm a real
    // "measure the whole filled field" pass would be.
    plane.querySelectorAll('.ist-hive-cell, .ist-hive-picker').forEach(cell => {
      const ring = parseInt(cell.dataset.ring, 10) || 0;
      // On the whole shape everybody is measured and none of the field:
      // the scale is pinned (setHiveWhole), so what is measured decides
      // only whether the drawing can be panned -- and the field runs off
      // every edge by design. Measured, it made every whole shape
      // pannable, and that class flips `cursor`, an INHERITED property:
      // the toggle re-styled every hexagon on the plane (~1000 nodes) on
      // the very frame the shape opened and again when it closed.
      if (_hiveWhole) {
        if (cell.classList.contains('ist-hive-ghost')) return;
      } else if (ring > HIVE_RING_CEILING) return;
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
    // The height it is fitted to is the window LESS the gap the drawing's
    // foot stands above (HIVE_CARD_GAP, see offsetY below): fitted to the
    // whole window and then lifted by that gap, a drawing bound by height
    // ran off the top by exactly that much -- invisible on a phone, where
    // the width binds first, and the top row clipped in half on a short
    // window like the desktop's band.
    const gap = hiveFootGap(view);
    let scale = Math.max(HIVE_MIN_SCALE, Math.min(HIVE_ZOOM, vw / reqW, (vh - gap) / reqH));
    // Pinned while the whole shape is up or going (see setHiveWhole).
    const anchor = _hiveAnchor;
    if (anchor) scale = anchor.scale;

    // Scaling about the caller's own cell and then hanging that point off
    // the middle of the window keeps them in the middle at any scale —
    // and the pan, when there is one, is a plain offset from there.
    const pan = state.hivePan || { x: 0, y: 0 };
    // Where the reader stands in the window: centred in what the strip
    // leaves when it is shut -- and no lower than the point at which the
    // foot of the drawing would meet a card standing open (the strip's
    // opened height, plus a little paper). The first is where the petek
    // wants to be; the second is the promise that nothing lands on it.
    const belowMe = (maxB - cy) * scale;
    // ── The petek stands at the FOOT of its window ──
    // It used to be centred in the band the strip leaves when it is
    // shut, clamped to whatever kept an open card off it. A drawing
    // that is mostly empty paper above the reader, centred, put the
    // people in the middle of the screen with a screenful of nothing
    // over them; standing the whole shape on the floor of the band puts
    // it where a thumb is, under the reading. So the clamp IS the
    // resting place now: the foot of the drawing comes to rest exactly
    // on top of whatever the page has reserved at the bottom of the
    // window (Hane's events strip), with a card's
    // gap of paper between. The reader is still the fixed point
    // horizontally and still the point everything is scaled about; only
    // the line they stand on has moved.
    // The whole shape grows out in every direction, so there the reader
    // stands in the middle of the window instead (see _hiveWhole).
    let offsetX = 0;
    let offsetY = _hiveWhole ? 0 : (vhFull - reserve - gap) - vhFull / 2 - belowMe;
    if (anchor) {
      // Wherever the window now is, put the reader back on the exact
      // screen point they were on when the whole shape was opened.
      const vr = view.getBoundingClientRect();
      offsetX = anchor.x - (vr.left + vw / 2);
      offsetY = anchor.y - (vr.top + vhFull / 2);
    }
    state.hiveFit = { scale, cx, cy, vw, vh, reqW, reqH, offsetX, offsetY, vwFull: view.clientWidth, vhFull: view.clientHeight };
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
    // An anchored fit is placed, never animated: it lands in the same
    // frame as the window change it answers, and the two cancel out.
    const fresh = state.hiveFitNode !== plane || !!anchor || !!state.hiveFitPlace;
    state.hiveFitPlace = false;
    state.hiveFitNode = plane;
    // Cleared here rather than never set: the drag below turns the
    // transition off so the plane keeps up with the finger, and this is
    // the one place that knows the drag is over.
    plane.style.transition = fresh ? 'none' : '';
    plane.style.transform = `translate(${pan.x + offsetX}px, ${pan.y + offsetY}px) scale(${scale})`;
    plane.style.marginLeft = `${-cx}px`;
    plane.style.marginTop = `${-cy}px`;
    // Panning is only offered when the fit had to give up: a grid that
    // fits has nowhere to go, and a page that slides under the finger
    // for no reason reads as broken. The outermost level never offers
    // it even though it always overflows by design (see the scale
    // comment above) — it is meant to be looked at, filled edge to edge
    // and cut off at them, not dragged around inside.
    const pannable = (reqW * scale > vw + 1) || (reqH * scale > vh + 1);
    view.classList.toggle('ist-hive-pannable', pannable);
    if (!pannable && (pan.x || pan.y)) {
      state.hivePan = { x: 0, y: 0 };
      plane.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }
    // Commit the placement above as this node's starting point before
    // handing the transition back to the stylesheet, so the next fit of
    // this same plane — a level change, a drag — does animate.
    if (fresh) {
      void plane.offsetWidth;
      plane.style.transition = '';
    }
    watchHiveBox(state);
    // Said out loud, for a page that shapes the WINDOW around the drawing
    // (project.html's home screen starts it under the coast, and needs the
    // drawing's own outline to know how high that can be). Only ever says
    // a fit happened; the page decides whether that moves anything.
    document.dispatchEvent(new CustomEvent('ist-hive-fit'));
  }

  // ── Being told the window has a size, instead of asking every frame ──
  // One observer for the life of a mount, watching both boxes fitHive
  // measures. It covers three things that used to need three mechanisms:
  // the first layout arriving (the retry loop above), the window changing
  // size, and the page's own box changing for reasons the window knows
  // nothing about -- Hane's events strip opening, the level clip lifting.
  //
  // Guarded against re-fitting for a size it has already fitted, because
  // fitHive writes to the plane and an observer that reacted to its own
  // output would spin.
  function watchHiveBox(state) {
    if (typeof ResizeObserver !== 'function') {
      // No observer to lean on: fall back to the old frame poll, bounded
      // exactly as it was.
      const tries = (state.hiveFitTries || 0) + 1;
      state.hiveFitTries = tries;
      if (tries < 30) requestAnimationFrame(() => fitHive(state));
      return;
    }
    const view = document.getElementById('po-hive-view');
    const plane = document.getElementById('po-hive-plane');
    if (!view || !plane) return;
    // renderHive replaces the mount's markup, so these are NEW nodes every
    // time it runs and whatever was being watched before is detached --
    // and a detached node never resizes again. A plain "am I already
    // observing?" guard therefore leaves the observer watching a node
    // nobody can see, which is silent: nothing throws, the petek simply
    // never fits. So the nodes are compared, not the observer's existence.
    if (state.hiveBoxObserver && state.hiveBoxNode === view) return;
    if (state.hiveBoxObserver) state.hiveBoxObserver.disconnect();
    const ro = new ResizeObserver(() => {
      if (state !== _hive) { ro.disconnect(); return; }
      const v = document.getElementById('po-hive-view');
      if (!v) { ro.disconnect(); state.hiveBoxObserver = null; return; }
      const fit = state.hiveFit;
      if (fit && fit.vwFull === v.clientWidth && fit.vhFull === v.clientHeight) return;
      fitHive(state);
    });
    ro.observe(view);
    ro.observe(plane);
    state.hiveBoxObserver = ro;
    state.hiveBoxNode = view;
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
    // A render rebuilds every cell, so an evening's guest list painted on
    // the old ones has to be put back on the new ones.
    applyHiveEventStates();
  }

  // ── The map has landed ──
  // The page under the petek may want to know where everybody on it
  // lives (project.html lights its friends' districts on the map), and it
  // must not reach into this module's state for it. So every time a map
  // arrives it is announced, and hiveMapCells() answers for one that
  // arrived before the page was listening.
  function announceHiveMap(state) {
    const cells = (state && state.hive && state.hive.cells) || [];
    const me = state && state.user ? state.user.id : null;
    // hive_map() leaves the caller out (it is everybody else, relative to
    // them), so where the reader lives comes from their own profile.
    const meNb = state && state.profile ? state.profile.neighborhood || null : null;
    try {
      document.dispatchEvent(new CustomEvent('ist-hive-map', { detail: { cells, me, meNb, loaded: true } }));
    } catch (e) {}
  }
  function hiveMapCells() {
    const st = _hive || null;
    return {
      cells: (_hiveMap && _hiveMap.cells) || [],
      me: st && st.user ? st.user.id : null,
      meNb: st && st.profile ? st.profile.neighborhood || null : null,
      // Whether a map has landed at all: no cells can mean "not fetched
      // yet" or "attached to nobody", and a reader of this cannot tell
      // which from the cells alone.
      loaded: !!_hiveMap,
    };
  }

  // Both calls are best-effort: before db/hive_lattice_v4.sql has been
  // run the RPCs simply aren't there, and the petek should still draw
  // (your own hexagon with six free sides, no code) rather than the page
  // failing to open.
  // The last map any mount of this page fetched, kept across virtual
  // navigations (mountHivePage seeds the next mount from it).
  let _hiveMap = null;

  // The map, and the places on it the reader is not shown who stands in
  // (members either side has blocked, db/plan_reports_blocks_v2_petek.sql).
  // The second is best-effort: a database without the migration has no
  // such function and simply has nothing hidden.
  async function fetchHiveMap(sb) {
    const [map, hid] = await Promise.all([
      sb.rpc('hive_map'),
      sb.rpc('hive_hidden_cells').then(r => r, () => ({ data: null })),
    ]);
    return { data: map.data, hidden: (hid && !hid.error && hid.data) || [] };
  }

  async function loadHive(state) {
    state.hiveLoaded = true;
    const { data, hidden } = await fetchHiveMap(state.sb);
    // Not this page any more: a swipe away and back mounts a fresh state
    // while this call is still in flight, and the loser must not paint
    // its own (captionless, differently-levelled) petek into the winner's
    // page -- which is what left neighbours uncaptioned and, where the
    // reader had left this page at another depth, the events column
    // hidden with it. renderHive draws by id, so nothing about the swap
    // stops it.
    if (state !== _hive) return;
    state.hive = Object.assign({}, state.hive, { cells: data || [], hidden });
    // Kept for the next mount of this page, so a swipe back to Hane
    // draws the petek it left rather than the reader alone for a beat.
    _hiveMap = state.hive;
    // ist-hive-waiting is only ever on when this mount had nothing
    // cached to start from (see mountHivePage) -- that is the one draw
    // that is arriving from genuinely nothing, and the one that gets the
    // staggered reveal below rather than the plain instant redraw every
    // other render of this grid has always had.
    const page = document.getElementById('po-hive-page');
    const firstDraw = !!(page && page.classList.contains('ist-hive-waiting'));
    renderHive(state);
    // Whatever came back -- rows, an empty map, or nothing at all
    // because the migration hasn't been run -- the drawing is what the
    // reader is here for, so it is shown now.
    if (page) {
      page.classList.remove('ist-hive-waiting');
      if (firstDraw) hiveRevealFirst(state, page);
    }
    // The drawing does not wait for it: the grid is the page, and where
    // everybody stands in their day is a caption on it. It lands on its
    // own and re-renders (see loadHiveStatus).
    announceHiveMap(state);
    loadHiveStatus(state);
  }

  async function reloadHiveMap(state) {
    const { data, hidden } = await fetchHiveMap(state.sb);
    if (state !== _hive) return;
    state.hive = Object.assign({}, state.hive, { cells: data || [], hidden });
    _hiveMap = state.hive;
    announceHiveMap(state);
    // With the day glyph parked nothing comes back to re-render the new
    // cells (loadHiveStatus used to), so this does.
    if (!HIVE_DAY_GLYPH) {
      if (document.getElementById('po-hive-mount')) renderHive(state);
      return;
    }
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
  // The games the app is actually casting tonight, which is the list
  // the RPC counts against (db/hive_member_status_v2_games.sql). It is
  // the night's own lineup -- whichever games the admin stood in the
  // Oyunlar column's two slots (db/game_night_slots.sql) -- falling back
  // to the default the column itself falls back to (GAME_DEFAULT_LINEUP
  // in project.html). It is passed rather than hardcoded server-side
  // precisely because a hardcoded copy drifts.
  const HIVE_GAMES = ['sozcel', 'tumcel'];
  async function hiveGamesFor(sb, night) {
    try {
      const { data, error } = await sb.from('game_night_slots')
        .select('game').eq('game_date', night);
      if (error || !data || !data.length) return HIVE_GAMES;
      return data.map(r => r.game).filter(Boolean);
    } catch (e) { return HIVE_GAMES; }
  }

  async function loadHiveStatus(state) {
    // Nothing reads the status while the glyph is parked.
    if (!HIVE_DAY_GLYPH) return;
    try {
      // ── Keyed to the NIGHT, not to the calendar date ──
      // Everything about a night's games is (see CLAUDE.md's own rule):
      // game_day_toggles.game_date is the padded ISO night and
      // game_results.date the unpadded seed for the same night. Asked
      // with today's calendar date instead, every caption on the petek
      // went wrong at midnight -- the half of the night after it counted
      // against a night nobody was playing.
      const night = IstDate.gameNight ? IstDate.gameNight() : IstDate.iso();
      const seed = IstDate.gameNightSeed
        ? IstDate.gameNightSeed()
        : night.split('-').map(Number).join('-');
      let { data, error } = await state.sb.rpc('hive_member_status', {
        p_game_date: night, p_game_key: seed, p_games: await hiveGamesFor(state.sb, night),
      });
      // A database that has only ever run v1 has no three-argument
      // function to call, and PostgREST says so in a CODE rather than in
      // a message. Falling back keeps every caption on a petek whose SQL
      // has not been run by hand yet -- the games half is simply counted
      // against that version's own hardcoded list.
      if (error && error.code === 'PGRST202') {
        ({ data, error } = await state.sb.rpc('hive_member_status', {
          p_game_date: night, p_game_key: seed,
        }));
      }
      if (error || !data) return;
      if (state !== _hive) return;
      const status = new Map(data.map(r => [String(r.member_id), r]));
      state.hive = Object.assign({}, state.hive, { status });
      // Kept for the next mount of this page along with the cells, and
      // for the same reason: a re-entry starts from the petek it left,
      // and a petek whose captions have been dropped on the way is one
      // whose neighbours go blank under their names for the length of a
      // round trip -- or for good, if that round trip fails.
      _hiveMap = state.hive;
      // Only while there is something to draw into: painting a page a
      // swipe has already taken away draws nothing anyway.
      if (document.getElementById('po-hive-mount')) renderHive(state);
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
      return {
        x: Math.max(0, (fit.reqW * fit.scale - fit.vw) / 2),
        y: Math.max(0, (fit.reqH * fit.scale - fit.vh) / 2),
        offsetX: fit.offsetX || 0,
        offsetY: fit.offsetY || 0,
        scale: fit.scale,
      };
    };

    page.addEventListener('pointerdown', (e) => {
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
        // Only what can be pressed presses: a cell standing further out
        // than the drawing reaches is `disabled` and a ghost is not a
        // control, and both are
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
      // ── One write per frame, not one per event ──
      // iOS delivers pointermove faster than it paints, so several of
      // these landed inside a single frame: every one of them invalidated
      // the plane and all but the last was thrown away. The position is
      // recorded here and written inside a rAF, so the drawing keeps up
      // with the finger on exactly the frames that are drawn.
      g.want = { x, y, offsetX: sl.offsetX, offsetY: sl.offsetY, scale: sl.scale };
      if (!g.raf) g.raf = requestAnimationFrame(() => {
        if (!g) return;
        g.raf = 0;
        const el = plane();
        if (!el) return;
        el.style.transition = 'none';
        el.style.transform = `translate(${g.want.x + g.want.offsetX}px, ${g.want.y + g.want.offsetY}px) scale(${g.want.scale})`;
      });
    });

    const settle = () => {
      if (!g) return;
      const gesture = g;
      // A frame still queued would run after this and re-apply the drag's
      // last position, undoing whatever settles below.
      if (gesture.raf) cancelAnimationFrame(gesture.raf);
      g = null;
      // Released: the hexagon springs back to its own size, on the
      // frame's own transition.
      if (gesture.pressed) gesture.pressed.classList.remove('ist-hive-cell-pressing');
      // A drag inside the drawing: fitHive puts the transition back and
      // leaves the pan where the finger left it. A pull PAST the end of
      // the drawing used to change depth; with one depth there is
      // nowhere for it to go, so it springs back the same way.
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

  // ── An evening's guest list, on the hexagons ──
  // The home screen's own reading of an open evening (project.html), and
  // a different object from the marks above: those are two small badges
  // for anahane's kept-events column; this recolours each hexagon by
  // where that member stands on the ONE evening that is open --
  //   kefil  whoever put it up (events.kefil_id): red ring, a glow, a tag
  //   go     going (event_rsvps): red ring
  //   no     said no (event_interest 'no'): faded
  //   none   hasn't answered: a plain gray ring
  // and prints the same word under their name in place of the district.
  // The reader's own hexagon comes from what the page already knows
  // (opts.mine), because both RPCs answer only for everybody else.
  //
  // Kept in the module and re-applied after every renderHive, since a
  // press on a hexagon or a map that reloads rebuilds every cell. Same
  // best-effort convention as the marks above: without the RPCs the
  // kefil and the reader still paint, everyone else reads "no answer".
  let _hiveEv = null;

  async function paintHiveEventStates(sb, eventId, opts) {
    const o = opts || {};
    const token = {};
    _hiveEv = { eventId, kefilId: o.kefilId || null, mine: o.mine || null, states: new Map(), token };
    applyHiveEventStates();
    const ask = (fn) => sb.rpc(fn, { p_event_ids: [eventId] })
      .then(r => (r && !r.error && r.data) ? r.data : [])
      .catch(() => []);
    let verdicts = [], going = [];
    try {
      [verdicts, going] = await Promise.all([
        ask('hive_event_interest_status'),
        ask('hive_event_rsvp_status'),
      ]);
    } catch (e) { return; }
    if (!_hiveEv || _hiveEv.token !== token) return;   // closed or replaced meanwhile
    verdicts.forEach(row => { if (row.verdict === 'no') _hiveEv.states.set(String(row.member_id), 'no'); });
    // Going wins over a stale "no": the RSVP is the later, louder fact.
    going.forEach(row => _hiveEv.states.set(String(row.member_id), 'go'));
    applyHiveEventStates();
  }

  // ── Who has played tonight's game, on the hexagons ──
  // The same recolouring as an evening's guest list, asked a different
  // question (sozcel.html's scoreboard button): 'go' is a member who has
  // FINISHED the night's game (attempts >= 1, the reading every other
  // surface uses), 'none' one who has not. Played or not is all it says --
  // never a score, never the guesses. The words are the caller's (labels:
  // { go, none }), and the reader's own hexagon is read off the same rows
  // as everybody else's.
  async function paintHiveGameStates(sb, game, seed, labels) {
    const token = {};
    _hiveEv = { game, kefilId: null, mine: null, states: new Map(), labels: labels || {}, token };
    applyHiveEventStates();
    let rows = [];
    try {
      const { data, error } = await sb.from('game_results')
        .select('user_id').eq('game', game).eq('date', seed).gte('attempts', 1);
      if (!error && data) rows = data;
    } catch (e) { return; }
    if (!_hiveEv || _hiveEv.token !== token) return;   // closed or replaced meanwhile
    rows.forEach(r => _hiveEv.states.set(String(r.user_id), 'go'));
    applyHiveEventStates();
  }

  // The reader answered: their own hexagon follows at once.
  function setHiveEventMine(mine) {
    if (!_hiveEv) return;
    _hiveEv.mine = mine || null;
    applyHiveEventStates();
  }

  function clearHiveEventStates() {
    _hiveEv = null;
    applyHiveEventStates();
  }

  const HIVE_EV_LABELS = {
    kefil: ['hive.ev.kefil', 'Kefil'],
    go:    ['hive.ev.go', 'Gidiyor ✓'],
    no:    ['hive.ev.no', 'Gitmiyor'],
    none:  ['hive.ev.none', 'Cevap yok'],
  };
  function hiveEvLabel(st) {
    const [key, fallback] = HIVE_EV_LABELS[st] || ['', ''];
    const I18N = (_hive && _hive.I18N) || global.I18N;
    const v = I18N && I18N.t ? I18N.t(key) : '';
    return v && v !== key ? v : fallback;
  }

  function applyHiveEventStates() {
    const mount = document.getElementById('po-hive-mount');
    if (!mount) return;
    const page = document.getElementById('po-hive-page');
    if (page) page.classList.toggle('ist-hive-ev-on', !!_hiveEv);
    const meId = _hive && _hive.user ? String(_hive.user.id) : null;
    mount.querySelectorAll('.ist-hive-cell[data-member-id], .ist-hive-cell[data-me]').forEach(cell => {
      let st = null;
      if (_hiveEv) {
        const id = cell.dataset.me ? meId : String(cell.dataset.memberId || '');
        if (id && _hiveEv.kefilId && id === String(_hiveEv.kefilId)) st = 'kefil';
        else if (cell.dataset.me && !_hiveEv.labels) st = _hiveEv.mine || 'none';
        else st = _hiveEv.states.get(id) || 'none';
      }
      if (st) cell.dataset.ev = st; else delete cell.dataset.ev;
      const ev = cell.querySelector('.ist-hive-name-ev');
      if (ev) ev.textContent = !st ? '' : (_hiveEv.labels ? (_hiveEv.labels[st] || '') : hiveEvLabel(st));
      // No KEFİL tag: the red ring says whose evening it is.
      const pill = cell.querySelector('.ist-hive-kefil-pill');
      if (pill) pill.remove();
    });
  }

  function clearHiveEventMarks() {
    document.querySelectorAll(
      '#po-hive-mount .ist-hive-cell-verdict-yes, #po-hive-mount .ist-hive-cell-verdict-no, #po-hive-mount .ist-hive-cell-rsvp'
    ).forEach(cell => cell.classList.remove(
      'ist-hive-cell-verdict-yes', 'ist-hive-cell-verdict-no', 'ist-hive-cell-rsvp'));
  }

  // ── One cell, repainted where it stands ──
  // Opening a seat or the claim field changes what is drawn INSIDE one
  // hexagon and nothing else: CLAUDE.md's rule for this page is that a
  // cell's box never changes for a press, precisely so no neighbour ever
  // moves. So the press does not have to go through renderHive, which
  // rebuilds every cell on the plane -- ~300 of them at the outermost
  // depth -- re-runs applyHiveLevel over all of them and re-fits the
  // whole drawing, to change two.
  //
  // The meta is read back off the live node rather than recomputed: it is
  // exactly what hiveGridHTML wrote there (the calc()-ed left/top and
  // --ring in the style attribute, data-ring, and data-side on ring 1),
  // and reading it means the packing arithmetic stays stated in one place.
  function hiveCellMeta(el) {
    let meta = `style="${esc(el.getAttribute('style') || '')}" data-ring="${esc(el.dataset.ring || '0')}"`;
    if (el.dataset.side) meta += ` data-side="${esc(el.dataset.side)}"`;
    return meta;
  }

  // Rebuilds one cell in place and rewires just that one. Returns the new
  // node, or null if this is not a cell that a press can change.
  function repaintHiveCell(state, el) {
    if (!el || !el.isConnected) return null;
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const meta = hiveCellMeta(el);
    const open = state.hiveOpen;
    let html = null;
    if (el.dataset.me) {
      html = hiveMeCellHTML({
        profile: state.profile,
        avatarUrl: state.avatarUrl, avatarHair: state.avatarHair, avatarHat: state.avatarHat,
        avatarAccessory: state.avatarAccessory, avatarShirt: state.avatarShirt,
        displayName: state.hiveDisplayName || '',
      }, meta, open, t);
    } else if (el.dataset.dir != null) {
      const dir = parseInt(el.dataset.dir, 10);
      html = hiveEmptyCellHTML(dir, meta, (open && open.dir === dir) ? open : null, t);
    }
    if (!html) return null;
    const wrap = document.createElement('div');
    wrap.innerHTML = html.trim();
    const next = wrap.firstElementChild;
    if (!next) return null;
    // applyHiveLevel's own marks are the level's, not the press's -- a
    // freshly built cell has never been through it, so they are carried
    // over rather than left for the next level change to restore.
    if (el.classList.contains('ist-hive-away')) next.classList.add('ist-hive-away');
    if (el.disabled) next.disabled = true;
    el.replaceWith(next);
    wireHiveCell(state, next);
    return next;
  }

  // Opening one hexagon closes whichever was open, and those are the only
  // two cells on the plane that can have changed.
  function setHiveOpen(state, next, target) {
    const mount = document.getElementById('po-hive-mount');
    const prev = mount ? mount.querySelector('.ist-hive-cell-open') : null;
    state.hiveOpen = next;
    if (prev && prev !== target) repaintHiveCell(state, prev);
    const painted = target ? repaintHiveCell(state, target) : null;
    // The seat's clock belongs to whatever is open now (or to nothing).
    wireHiveOfferClock(state);
    return painted;
  }

  // Which member is named on the bar is a class and an aria state, and
  // nothing else in the markup (see hiveMemberCellHTML) -- so it is
  // painted onto the cells that are already there rather than rebuilt.
  function paintHivePicked(state) {
    const mount = document.getElementById('po-hive-mount');
    if (!mount) return;
    const id = state.hiveSelected || null;
    mount.querySelectorAll('.ist-hive-cell[data-member-id]').forEach(cell => {
      const on = id != null && cell.dataset.memberId === id;
      cell.classList.toggle('ist-hive-picked', on);
      cell.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  // The listeners one cell needs, so a repainted cell can be rewired on
  // its own without touching the other ~300.
  function wireHiveCell(state, cell) {
    if (cell.dataset.dir != null) {
      cell.addEventListener('click', () => {
        const dir = parseInt(cell.dataset.dir, 10);
        // Pressing the open hexagon again folds it back up, so the frame
        // is its own close button and nothing else has to carry one.
        if (state.hiveOpen && state.hiveOpen.dir === dir) { setHiveOpen(state, null, cell); return; }
        setHiveOpen(state, { dir, offer: null, error: '' }, cell);
        offerHiveSlot(state, dir);
      });
      return;
    }
    if (cell.dataset.memberId != null) {
      // ── Pressing somebody ──
      // Their name goes up onto the bar, in the place your own name
      // holds, and the hexagon goes red so the drawing says which of them
      // the bar is talking about. Pressing them again puts your own name
      // back. Nothing opens here: the profile is one more press, on the
      // name itself (see setBarMember).
      cell.addEventListener('click', () => pickHiveMember(state, cell.dataset.memberId));
      return;
    }
    if (cell.dataset.me) {
      // Pressing yourself opens the field that takes a code somebody gave
      // you, inside your own hexagon. Pressing yourself again folds it
      // back to your avatar — every hexagon on this page is its own close
      // button, which is why nothing here carries one.
      cell.addEventListener('click', () => {
        if (state.hiveOpen && state.hiveOpen.claim) { setHiveOpen(state, null, cell); return; }
        state.hiveFocusInput = true;
        setHiveOpen(state, { claim: true, value: '', error: '' }, cell);
      });
      wireHiveClaimInput(state);
    }
  }

  function wireHiveEvents(state) {
    const mount = document.getElementById('po-hive-mount');
    if (!mount) return;

    // Bound to each cell, never to `document`: all three carousel pages
    // share one document (see router.js), so a document-level handler
    // would keep firing after navigating away from Anahane.
    // Only the cells that answer a press. The ghost field is the bulk of
    // what is on the plane at the outermost depth and none of it is a
    // control, so it is never walked here.
    mount.querySelectorAll('.ist-hive-cell[data-dir], .ist-hive-cell[data-member-id], .ist-hive-cell[data-me]')
      .forEach(cell => wireHiveCell(state, cell));

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

  function wireHiveClaimInput(state) {
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
        if (e.key === 'Escape') {
          const me = document.querySelector('#po-hive-mount .ist-hive-cell[data-me]');
          setHiveOpen(state, null, me);
        }
      });
      // Focus only when the field has just been opened, not on every
      // re-render: a fetch landing while a code is half-typed would
      // otherwise yank the caret back to the start of it.
      if (state.hiveFocusInput) {
        state.hiveFocusInput = false;
        input.focus();
      }
    }
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
        const mount = document.getElementById('po-hive-mount');
        setHiveOpen(state, null, mount && mount.querySelector('.ist-hive-cell-open'));
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
    // The reader may have folded the panel, tapped another side, or
    // swiped off the page entirely while the mint was out; the answer
    // belongs to the side that asked for it, on the page that asked.
    if (state !== _hive || !state.hiveOpen || state.hiveOpen.dir !== dir) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row || !row.code) {
      state.hiveOpen.error = t('profile.hive.err.failed');
    } else {
      state.hiveOpen.offer = row;
      state.hiveOpen.error = '';
    }
    // Still the one seat that asked: the guard above already established
    // that the answer belongs to the side still open.
    const mount = document.getElementById('po-hive-mount');
    const cell = mount && mount.querySelector(`.ist-hive-cell[data-dir="${dir}"]`);
    if (cell) { repaintHiveCell(state, cell); wireHiveOfferClock(state); }
    else renderHive(state);
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
    // The claim can outlive the page it was typed on (a swipe away while
    // it was in flight): the bond is made either way, and the next mount
    // fetches the map that now holds it — but this page is gone, and
    // drawing a state nothing else references any more into whatever
    // stands there now is how a petek ends up captionless.
    if (state !== _hive) return;
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
  // One labelled row per part of the avatar that has something to choose
  // between: what it is on the left, the choice between two arrows on
  // the right. A part with a single option (the hat, while its only
  // drawn value is "none") gets no row -- two arrows that lead nowhere
  // are a control that is broken. The ids are the ones the four
  // wire*Carousel functions and the onboarding tour already look for.
  const AVATAR_STEPS = [
    { key: 'hat',       label: 'profile.avatar.hat',       options: () => AVATAR_HAT_OPTIONS,       index: (st) => hatOptionIndex(st.avatarHat) },
    { key: 'hair',      label: 'profile.avatar.hair',      options: () => AVATAR_HAIR_OPTIONS,      index: (st) => hairOptionIndex(st.avatarHair) },
    { key: 'accessory', label: 'profile.avatar.accessory', options: () => AVATAR_ACCESSORY_OPTIONS, index: (st) => accessoryOptionIndex(st.avatarAccessory) },
    { key: 'shirt',     label: 'profile.avatar.shirt',     options: () => AVATAR_SHIRT_OPTIONS,     index: (st) => shirtOptionIndex(st.avatarShirt) },
  ];
  const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '
    + 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10"></rect>'
    + '<path d="M8 11V7a4 4 0 0 1 8 0v4"></path></svg>';

  // What stands between a stepper's arrows: the option's short name in
  // the reader's language, with a lock beside one that cannot be worn.
  function stepValueHTML(opt, locked, I18N) {
    const en = I18N && I18N.isEnglish && I18N.isEnglish();
    const name = (en ? opt.en : opt.short) || opt.label;
    return esc(name) + (locked ? `<span class="po-step-lock">${LOCK_ICON}</span>` : '');
  }
  function setStepValue(key, opt, locked, I18N) {
    const el = document.getElementById(`po-${key}-val`);
    if (el) el.innerHTML = stepValueHTML(opt, locked, I18N);
  }

  function avatarStepsHTML(state) {
    const t = (k) => (state.I18N && state.I18N.t) ? state.I18N.t(k) : k;
    const rows = AVATAR_STEPS.filter(s => s.options().length > 1).map(s => {
      const opt = s.options()[s.index(state)];
      const name = t(s.label);
      return `
        <div class="ui-row">
          <div class="ui-row-k" id="po-${s.key}-lab">${esc(name)}</div>
          <div class="ui-step po-step" role="group" aria-labelledby="po-${s.key}-lab">
            <button type="button" class="ui-step-btn" id="po-${s.key}-prev" aria-label="${esc(t('profile.avatar.prev'))}">${ARROW_ICON_LEFT}</button>
            <span class="ui-step-v" id="po-${s.key}-val" aria-live="polite">${stepValueHTML(opt, false, state.I18N)}</span>
            <button type="button" class="ui-step-btn" id="po-${s.key}-next" aria-label="${esc(t('profile.avatar.next'))}">${ARROW_ICON_RIGHT}</button>
          </div>
        </div>`;
    }).join('');
    if (!rows) return '';
    return `
      <section class="po-sec">
        <div class="ui-label">${esc(t('profile.avatar'))}</div>
        <div class="ui-box ui-rows po-steps" id="po-avatar-steps">${rows}</div>
        <div class="ist-pc-avatar-msg ui-note ui-err" id="po-avatar-msg" role="status" aria-live="polite"></div>
      </section>`;
  }

  // ── YOUR OWN PROFILE ──
  // Read top to bottom: who you are (the cover), what you look like
  // (the avatar's rows, and the colours of the app), the code you hand
  // to somebody you are vouching for, and then the account -- the facts
  // first, the two ways out last. Every block is the house's own
  // (ui.css): a red label over a box of rows. Which blocks a page shows
  // is PROFILE_SECTIONS'.
  function settingsPageHTML(state) {
    const { I18N, user, profile, sozcuCount, sponsoredList, kefilOfUser, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, customizing } = state;
    const show = sectionsFor(state.page);
    const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = capitalizeName(`${firstName} ${lastName}`.trim()) || user.email.split('@')[0];
    const yasadigiIlce = profile?.neighborhood || '';
    const dogumYeri = profile?.birth_place || '';
    const phone = profile?.phone || '';
    const referralCode = profile?.referral_code || '';
    const palettePref = normalizePalette(profile?.palette_pref);

    const yasadigiDisplay = yasadigiIlce ? (NB_NAMES[yasadigiIlce] || yasadigiIlce) : '—';
    const dogumDisplay = dogumYeri ? (NB_NAMES[dogumYeri] || dogumYeri) : '—';
    const since = I18N.formatMemberSince(profile?.joined_at || user.created_at);
    const kefilLabel = kefilOfUser
      ? esc(capitalizeName(`${kefilOfUser.first_name||''} ${kefilOfUser.last_name||''}`.trim()) || t('profile.unnamed'))
      : '';
    const row = (k, v) => `
            <div class="ui-row">
              <div class="ui-row-k">${esc(k)}</div>
              <div class="ui-row-v">${v}</div>
            </div>`;
    const chip = (value, key) => `<button type="button" class="ui-chip" role="radio" data-palette="${value}" aria-checked="${palettePref === value}">${esc(t(key))}</button>`;

    // CSS uppercases by the element's language and the document is
    // lang="tr" whatever the reader chose, so the sheet says which it is
    // in ("Sign out" would otherwise print "SİGN OUT").
    const lang = (I18N.isEnglish && I18N.isEnglish()) ? 'en' : 'tr';
    return `
      <div class="po" lang="${lang}">
        ${coverHTML({ profile, avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, displayName, metaPlace: yasadigiDisplay, metaText: since, editable: true, customizing, sozcuCount })}

        ${customizing ? avatarStepsHTML(state) : ''}

        ${show.settings ? `
        <section class="po-sec">
          <div class="ui-label" id="po-palette-lab">${esc(t('profile.colortheme'))}</div>
          <div class="ui-chips ui-fill" id="po-palette" role="radiogroup" aria-labelledby="po-palette-lab">
            ${chip('mono', 'profile.palette.mono')}
            ${chip('earth', 'profile.palette.earth')}
          </div>
          ${customizing ? '' : `<button type="button" class="ui-btn ui-ghost ui-block po-customize" id="po-customize">${esc(t('profile.customize'))}</button>`}
          <div class="ui-note ui-err po-msg" id="po-palette-msg" role="status"></div>
        </section>` : ''}

        ${show.week ? `
        <section class="po-sec">
          <div class="ui-label">${esc(t('profile.thisweek'))}</div>
          <div class="ui-box po-week" id="po-weekgrid-mount"></div>
        </section>` : ''}

        ${show.account && referralCode ? `
        <section class="po-sec">
          <div class="ui-label">${esc(t('profile.referralcode'))}</div>
          <div class="ui-box po-code">
            <span class="ui-code">${esc(referralCode)}</span>
            <button type="button" class="ui-btn ui-ghost ui-small" id="po-copy">${esc(t('profile.copy'))}</button>
          </div>
          <p class="ui-note">${esc(t('profile.referralcode.hint'))}</p>
        </section>` : ''}

        ${show.account ? `
        <section class="po-sec">
          <div class="ui-label">${esc(t('profile.account'))}</div>
          <div class="ui-box ui-rows">
            ${row(t('profile.email'), esc(user.email))}
            ${phone ? row(t('profile.phone'), esc(phone)) : ''}
            ${row(t('profile.birthplace'), esc(dogumDisplay))}
            ${kefilOfUser ? row(t('profile.kefil'), kefilLabel) : ''}
            ${sponsoredListHTML(sponsoredList, t)}
            ${row(t('profile.eventkefilcount'), `${state.eventKefilCount ?? 0} ${esc(t('profile.times'))}`)}
            ${row(t('profile.sozcucount'), `${sozcuCount ?? 0} ${esc(t('profile.times'))}`)}
          </div>
        </section>

        <section class="po-sec po-out">
          <button type="button" class="ui-btn ui-ghost ui-block" id="po-signout">${esc(t('profile.signout'))}</button>
          <button type="button" class="ui-link po-delete" id="po-delete-account">${esc(t('profile.deleteaccount'))}</button>
          <div class="ui-note ui-err po-msg" id="po-save-msg" role="status"></div>
        </section>` : ''}
      </div>
    `;
  }

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
    const customizeBtn = document.getElementById('po-customize');
    if (customizeBtn) customizeBtn.addEventListener('click', () => {
      state.customizing = true;
      renderOverlayBody();
    });
    wirePaletteChips(state);
    // The same three actions the petek's Sen depth carries — see
    // wireCopyCode/doSignOut/doDeleteAccount above for why the behaviour
    // is shared and the ids are not.
    wireCopyCode(document.getElementById('po-copy'), state);
    const signoutBtn = document.getElementById('po-signout');
    if (signoutBtn) signoutBtn.addEventListener('click', () => doSignOut(sb));
    const deleteBtn = document.getElementById('po-delete-account');
    if (deleteBtn) deleteBtn.addEventListener('click',
      () => doDeleteAccount(state, deleteBtn, document.getElementById('po-save-msg')));
  }

  // ── The palette is chosen by pressing it ──
  // Two chips, and the one pressed is the app's colours from that
  // instant: Palette.setPalette repaints the page, the maps and the
  // avatars in the same frame (it is the same call a sunset makes), and
  // the choice is written to the profile behind it. It used to be a
  // two-stop slider, a Kaydet button and a page reload -- three steps and
  // a blank screen for a choice between two things. A write that fails
  // puts the old colours back and says so.
  // Language is set by holding the logo (see "Hold the logo and the app
  // changes language" in project.html), not from this page.
  function wirePaletteChips(state) {
    const group = document.getElementById('po-palette');
    if (!group) return;
    const { sb, user } = state;
    const msgEl = document.getElementById('po-palette-msg');
    const paint = (v) => group.querySelectorAll('.ui-chip').forEach(c =>
      c.setAttribute('aria-checked', String(c.dataset.palette === v)));
    group.addEventListener('click', async (e) => {
      const chip = e.target.closest('.ui-chip');
      if (!chip) return;
      const next = normalizePalette(chip.dataset.palette);
      const prev = normalizePalette(state.profile?.palette_pref);
      if (next === prev) return;
      paint(next);
      if (global.Palette) global.Palette.setPalette(next);
      if (state.profile) state.profile.palette_pref = next;
      if (msgEl) msgEl.textContent = '';
      try {
        const { data, error } = await sb.from('profiles').update({ palette_pref: next }).eq('id', user.id).select('id');
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.');
      } catch (err) {
        // Only if the reader has not already pressed something else.
        if (normalizePalette(state.profile?.palette_pref) !== next) return;
        paint(prev);
        if (global.Palette) global.Palette.setPalette(prev);
        if (state.profile) state.profile.palette_pref = prev;
        if (msgEl) msgEl.textContent = (err && err.message) || 'Kaydedilemedi.';
      }
    });
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

  // Every copy of the reader's avatar that carries the preview id. The
  // petek (mounted early and kept shut) draws the reader's own hexagon
  // with this same id, so getElementById alone finds ITS copy first and
  // the sheet's cover never repainted until reopened. Paint them all.
  function paintAvatarPreviews(html, locked) {
    document.querySelectorAll('#po-avatar-preview').forEach(el => {
      el.innerHTML = html;
      el.classList.toggle('locked', !!locked);
    });
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
      paintAvatarPreviews(avatarPreviewHTML(hair, state.avatarHat, state.avatarAccessory, state.avatarShirt, false), false);
      setStepValue('hair', AVATAR_HAIR_OPTIONS[idx], false, state.I18N);
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
      paintAvatarPreviews(avatarPreviewHTML(state.avatarHair, opt.value, state.avatarAccessory, state.avatarShirt, locked), locked);
      setStepValue('hat', opt, locked, state.I18N);
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
      paintAvatarPreviews(avatarPreviewHTML(state.avatarHair, state.avatarHat, opt.value, state.avatarShirt, locked), locked);
      setStepValue('accessory', opt, locked, state.I18N);
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
  // white (stored as null) and 'black'. Two options, so either arrow is
  // the same toggle; the pair is kept rather than collapsed to one button
  // because every other category on this cover is a prev/next pair and a
  // third shirt would make it one again.
  function wireShirtCarousel(state) {
    const prevBtn = document.getElementById('po-shirt-prev');
    const nextBtn = document.getElementById('po-shirt-next');
    const previewEl = document.getElementById('po-avatar-preview');
    if (!prevBtn || !nextBtn || !previewEl) return;

    let idx = shirtOptionIndex(state.avatarShirt);

    function render() {
      const shirt = AVATAR_SHIRT_OPTIONS[idx].value;
      paintAvatarPreviews(avatarPreviewHTML(state.avatarHair, state.avatarHat, state.avatarAccessory, shirt, false), false);
      setStepValue('shirt', AVATAR_SHIRT_OPTIONS[idx], false, state.I18N);
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
          eventKefilCount: state.eventKefilCount || 0,
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

  // Re-reads the petek after something outside this file changed who is
  // on it -- a block from a plan card (db/plan_reports_blocks_v2_petek.sql).
  // Not mounted: the cached map is dropped, so the next mount does not
  // draw the old petek for a beat before the fetch lands.
  function refreshHive() {
    if (_hive && _hive.hiveLoaded) return reloadHiveMap(_hive);
    _hiveMap = null;
    return Promise.resolve();
  }

  global.IstProfileCard = {
    mount,
    refreshHive,
    setPage,
    setBarLayout,
    setBarLevelLabel,
    clearBarLevelLabel,
    clearBarMember,
    unmount,
    mountLibraryCard,
    openProfileOverlay,
    closeProfileOverlay,
    mountHivePage,
    unmountHivePage,
    setHiveWhole,
    refitHive,
    releaseHiveAnchor,
    revealHivePage,
    playHiveReveal,
    holdHivePage,
    releaseHivePage,
    paintHiveEventMarks,
    clearHiveEventMarks,
    paintHiveEventStates,
    setHiveEventMine,
    clearHiveEventStates,
    paintHiveGameStates,
    hiveMapCells,
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
