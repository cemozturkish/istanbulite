// Shared avatar rendering: a fixed bald base (assets/avatar/avatar-base.png)
// with optional transparent overlays stacked on top, in this order: hair
// (assets/avatar-hair-<value>.png), hat (assets/avatar-hat-<value>.png),
// accessory (assets/avatar-accessory-<value>.png) — profiles.avatar_hair /
// avatar_hat / avatar_accessory each pick their own overlay independently
// (null = none), so any combination of the three can be worn together. The
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
  const BASE_URL = 'assets/avatar/avatar-base.png';
  const HAIR_URLS = { short: 'assets/avatar/avatar-hair-short.png', long: 'assets/avatar/avatar-hair-long.png' };
  const HAT_URLS = { crown: 'assets/avatar/avatar-hat-crown.png' };
  const ACCESSORY_URLS = { glasses: 'assets/avatar/avatar-accessory-glasses.png' };
  const SOZCU_REQUIRED_COUNT = 10;

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
  // avatar_hat, avatar_accessory) quadruple. avatarUrl is only ever a
  // leftover legacy full-image override at this point (see comment above)
  // — a fresh pick never sets it anymore, so the common path is the base +
  // hair + hat + accessory stack. No earth/mono color variants for these
  // layers yet (only the legacy avatarUrl path goes through
  // Palette.avatarSrc) — those are plain line art for now.
  function html(avatarUrl, avatarHair, avatarHat, avatarAccessory) {
    if (avatarUrl) {
      const src = (global.Palette && global.Palette.avatarSrc) ? global.Palette.avatarSrc(avatarUrl) : avatarUrl;
      return `<img src="${esc(src)}" alt="">`;
    }
    const hair = hairUrl(avatarHair);
    const hat = hatUrl(avatarHat);
    const accessory = accessoryUrl(avatarAccessory);
    return `<span class="ist-avatar-stack">`
      + `<img src="${esc(BASE_URL)}" alt="">`
      + (hair ? `<img src="${esc(hair)}" alt="">` : '')
      + (hat ? `<img src="${esc(hat)}" alt="">` : '')
      + (accessory ? `<img src="${esc(accessory)}" alt="">` : '')
      + `</span>`;
  }

  global.IstAvatar = {
    BASE_URL, HAIR_URLS, HAT_URLS, ACCESSORY_URLS, SOZCU_REQUIRED_COUNT,
    hairUrl, hatUrl, accessoryUrl, html,
  };
})(window);
