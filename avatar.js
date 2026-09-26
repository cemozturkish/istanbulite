// Shared avatar rendering: a fixed bald base (assets/avatar/base.png)
// with optional transparent overlays stacked on top, in this order: shirt
// (assets/avatar/shirt-<value>.png), accessory
// (assets/avatar/accessory-<value>.png), hair (assets/avatar/hair-<value>.png),
// hat (assets/avatar/hat-<value>.png) — accessory sits *under* hair on
// purpose (glasses temples should disappear behind long hair, not poke
// through it) — profiles.avatar_shirt / avatar_hair / avatar_hat /
// avatar_accessory each pick their own overlay independently,
// so any combination can be worn together. Hair, hat and accessory default
// to null/none (the plain bald look); the SHIRT does not — see
// DEFAULT_SHIRT below. Both shirts are fully open to everyone — no lock,
// just like the hair options. The
// locked Sözcü reward is the 'crown' hat (previously a single full-image
// override via profiles.avatar_url — that column is no longer written, but
// html() still honors it if set, as a fallback for any row a migration
// hasn't backfilled yet).
//
// Deliberately tiny and dependency-free (no Supabase, no i18n) so pages that
// only need a read-only avatar — the game pages' commenter-profile popups —
// can load just this file instead of all of profile-card.js. profile-card.js
// itself also uses these constants/helpers for the self-edit picker.
(function (global) {
  // Every layer shares the hexframe family's uncropped 1024x1536 canvas
  // (see --hexframe-ratio in frames.css) and lives in assets/avatar/,
  // grouped by kind like assets/map/ and assets/mascot/ — the folder
  // already says "avatar", so the files inside it do not repeat it
  // (base.png, hair-long.png, ...). The one avatar-family drawing that is
  // NOT named here is background.png, the ground behind the figure: it is
  // painted as the hexframe's own CSS background (palette.css, frames.css)
  // rather than stacked as an <img>, for the reason map-ink.js's LADDERS
  // note spells out. See assets/avatar/README.md for the full set.
  const BASE_URL = 'assets/avatar/base.png';
  const SHIRT_URLS = {
    black: 'assets/avatar/shirt-black.png',
    white: 'assets/avatar/shirt-white.png',
  };
  // Three lengths and one texture. 'curly-long' rather than 'curly' so a
  // curly short can be drawn later without renaming this one -- see
  // db/avatar_hair_v3_curly_long.sql, which is also the migration a new
  // hair value needs (avatar_hair carries a check constraint, exactly
  // like the other three avatar columns).
  const HAIR_URLS = {
    buzz: 'assets/avatar/hair-buzz.png',
    short: 'assets/avatar/hair-short.png',
    long: 'assets/avatar/hair-long.png',
    'curly-long': 'assets/avatar/hair-curly-long.png',
  };
  // 'crown' (the locked Sözcü reward hat) is parked here too -- see
  // AVATAR_HAT_OPTIONS in profile-card.js for why. Leaving it out of this
  // map means hatUrl('crown') falls through to null (below) and the hat
  // layer is skipped entirely for any row that already has avatar_hat =
  // 'crown' set, rather than rendering a 404'd <img>.
  const HAT_URLS = {};
  const ACCESSORY_URLS = { glasses: 'assets/avatar/accessory-glasses.png' };
  // Not a pickable option -- admin-only, set per-politician (public.
  // politicians.in_jail) from admin.html's Kişiler tab, never something a
  // regular user can put on their own avatar. Always the topmost layer,
  // over hat included, regardless of what else is worn.
  const JAIL_URL = 'assets/avatar/jail.png';
  const SOZCU_REQUIRED_COUNT = 10;

  // NOBODY IS BARE-CHESTED BY DEFAULT, AND THAT IS WHY null MEANS WHITE.
  // The shirt is the one layer of the four with no "none": hair can be kel
  // and a hat can be absent, but a member with no shirt recorded is not
  // making a choice, they are a row that predates the choice existing.
  //
  // Reading null as the default shirt rather than as bare does the whole
  // job with no migration and no window: every member and every politician
  // already in the database is dressed the moment this ships, and a fresh
  // signup is dressed before `handle_new_user` has written anything to this
  // column. A backfill plus a column default would reach the same place,
  // but only once the SQL had actually been run by hand — and GitHub Pages
  // redeploys on push, so there is always a gap in which every reader would
  // be looking at a stripped city.
  //
  // It also means the picker never has to WRITE 'white': choosing it stores
  // null, so this does not wait on db/avatar_shirt_v2_white.sql either. An
  // explicit 'white' is still honoured, since rows may carry one.
  const DEFAULT_SHIRT = 'white';

  function shirtUrl(shirt) {
    return SHIRT_URLS[shirt] || SHIRT_URLS[DEFAULT_SHIRT] || null;
  }

  function hairUrl(hair) {
    return HAIR_URLS[hair] || null;
  }

  function hatUrl(hat) {
    return HAT_URLS[hat] || null;
  }

  function accessoryUrl(accessory) {
    return ACCESSORY_URLS[accessory] || null;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Renders the avatar markup for a profile's (avatar_url, avatar_hair,
  // avatar_hat, avatar_accessory, avatar_shirt) set, plus an optional
  // trailing `inJail` flag (politicians only — see JAIL_URL above).
  // avatarUrl is only ever a leftover legacy full-image override at this
  // point (see comment above) — a fresh pick never sets it anymore, so
  // the common path is the base + shirt + accessory + hair + hat stack.
  // No earth/mono color variants for these layers yet (only the legacy
  // avatarUrl path goes through Palette.avatarSrc) — those are plain line
  // art for now.
  function html(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt, inJail) {
    const jail = inJail ? `<img src="${esc(JAIL_URL)}" alt="">` : '';
    if (avatarUrl) {
      const src = (global.Palette && global.Palette.avatarSrc) ? global.Palette.avatarSrc(avatarUrl) : avatarUrl;
      if (!jail) return `<img src="${esc(src)}" alt="">`;
      return `<span class="ist-avatar-stack"><img src="${esc(src)}" alt="">${jail}</span>`;
    }
    const shirt = shirtUrl(avatarShirt);
    const hair = hairUrl(avatarHair);
    const hat = hatUrl(avatarHat);
    const accessory = accessoryUrl(avatarAccessory);
    return `<span class="ist-avatar-stack">`
      + `<img src="${esc(BASE_URL)}" alt="">`
      + (shirt ? `<img src="${esc(shirt)}" alt="">` : '')
      + (accessory ? `<img src="${esc(accessory)}" alt="">` : '')
      + (hair ? `<img src="${esc(hair)}" alt="">` : '')
      + (hat ? `<img src="${esc(hat)}" alt="">` : '')
      + jail
      + `</span>`;
  }

  global.IstAvatar = {
    BASE_URL, SHIRT_URLS, HAIR_URLS, HAT_URLS, ACCESSORY_URLS, JAIL_URL, SOZCU_REQUIRED_COUNT,
    DEFAULT_SHIRT,
    shirtUrl, hairUrl, hatUrl, accessoryUrl, html,
  };
})(window);
