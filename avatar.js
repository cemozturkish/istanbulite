// Shared avatar rendering: a fixed bald base (assets/avatar/avatar-base.png)
// with optional transparent overlays stacked on top, in this order: shirt
// (assets/avatar-shirt-<value>.png), hair (assets/avatar-hair-<value>.png),
// hat (assets/avatar-hat-<value>.png), accessory
// (assets/avatar-accessory-<value>.png) — profiles.avatar_shirt / avatar_hair
// / avatar_hat / avatar_accessory each pick their own overlay independently,
// so any combination can be worn together. Shirt is the odd one out: it
// defaults to 'black' for everyone (profiles.avatar_shirt has a DB default —
// see db/avatar_shirt.sql — and html()'s own default parameter falls back to
// it too, so a caller that doesn't pass a shirt at all still gets one; only
// an explicit `null` renders bare). Hair/hat/accessory default to null/none.
// The locked Sözcü reward is the 'crown' hat (previously a single full-image
// override via profiles.avatar_url — that column is no longer written, but
// html() still honors it if set, as a fallback for any row a migration
// hasn't backfilled yet).
//
// Deliberately tiny and dependency-free (no Supabase, no i18n) so pages that
// only need a read-only avatar — the game pages' commenter-profile popups —
// can load just this file instead of all of profile-card.js. profile-card.js
// itself also uses these constants/helpers for the self-edit picker.
(function (global) {
  const BASE_URL = 'assets/avatar/avatar-base.png';
  const SHIRT_URLS = { black: 'assets/avatar/avatar-shirt-black.png' };
  const HAIR_URLS = { short: 'assets/avatar/avatar-hair-short.png', long: 'assets/avatar/avatar-hair-long.png' };
  const HAT_URLS = { crown: 'assets/avatar/avatar-hat-crown.png' };
  const ACCESSORY_URLS = { glasses: 'assets/avatar/avatar-accessory-glasses.png' };
  const SOZCU_REQUIRED_COUNT = 10;

  function shirtUrl(shirt) {
    return SHIRT_URLS[shirt] || null;
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
  // avatar_hat, avatar_accessory, avatar_shirt) set. avatarUrl is only ever
  // a leftover legacy full-image override at this point (see comment above)
  // — a fresh pick never sets it anymore, so the common path is the base +
  // shirt + hair + hat + accessory stack. No earth/mono color variants for
  // these layers yet (only the legacy avatarUrl path goes through
  // Palette.avatarSrc) — those are plain line art for now.
  function html(avatarUrl, avatarHair, avatarHat, avatarAccessory, avatarShirt = 'black') {
    if (avatarUrl) {
      const src = (global.Palette && global.Palette.avatarSrc) ? global.Palette.avatarSrc(avatarUrl) : avatarUrl;
      return `<img src="${esc(src)}" alt="">`;
    }
    const shirt = shirtUrl(avatarShirt);
    const hair = hairUrl(avatarHair);
    const hat = hatUrl(avatarHat);
    const accessory = accessoryUrl(avatarAccessory);
    return `<span class="ist-avatar-stack">`
      + `<img src="${esc(BASE_URL)}" alt="">`
      + (shirt ? `<img src="${esc(shirt)}" alt="">` : '')
      + (hair ? `<img src="${esc(hair)}" alt="">` : '')
      + (hat ? `<img src="${esc(hat)}" alt="">` : '')
      + (accessory ? `<img src="${esc(accessory)}" alt="">` : '')
      + `</span>`;
  }

  global.IstAvatar = {
    BASE_URL, SHIRT_URLS, HAIR_URLS, HAT_URLS, ACCESSORY_URLS, SOZCU_REQUIRED_COUNT,
    shirtUrl, hairUrl, hatUrl, accessoryUrl, html,
  };
})(window);
