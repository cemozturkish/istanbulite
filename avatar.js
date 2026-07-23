// Shared avatar rendering: a fixed bald base (assets/avatar/avatar-base.png)
// with an optional transparent hair overlay (assets/avatar-hair-<value>.png)
// and an optional transparent hat overlay (assets/avatar-hat-<value>.png)
// stacked on top, in that order — profiles.avatar_hair picks the hair
// overlay ('short' | 'long' | null for kel/bald), profiles.avatar_hat picks
// the hat overlay ('crown' | null for no hat). The two are independent: any
// hat can be worn over any hair. The locked Sözcü reward is the 'crown' hat
// (previously a single full-image override via profiles.avatar_url — that
// column is no longer written, but html() still honors it if set, as a
// fallback for any row a migration hasn't backfilled yet).
//
// Deliberately tiny and dependency-free (no Supabase, no i18n) so pages that
// only need a read-only avatar — the game pages' commenter-profile popups —
// can load just this file instead of all of profile-card.js. profile-card.js
// itself also uses these constants/helpers for the self-edit picker.
(function (global) {
  const BASE_URL = 'assets/avatar/avatar-base.png';
  const HAIR_URLS = { short: 'assets/avatar/avatar-hair-short.png', long: 'assets/avatar/avatar-hair-long.png' };
  const HAT_URLS = { crown: 'assets/avatar/avatar-hat-crown.png' };
  const SOZCU_REQUIRED_COUNT = 10;

  function hairUrl(hair) {
    return HAIR_URLS[hair] || null;
  }

  function hatUrl(hat) {
    return HAT_URLS[hat] || null;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Renders the avatar markup for a profile's (avatar_url, avatar_hair,
  // avatar_hat) triple. avatarUrl is only ever a leftover legacy
  // full-image override at this point (see comment above) — a fresh
  // pick never sets it anymore, so the common path is the base + hair +
  // hat stack. No earth/mono color variants for the base/hair/hat layers
  // yet (only the legacy avatarUrl path goes through Palette.avatarSrc) —
  // those are plain black line art for now.
  function html(avatarUrl, avatarHair, avatarHat) {
    if (avatarUrl) {
      const src = (global.Palette && global.Palette.avatarSrc) ? global.Palette.avatarSrc(avatarUrl) : avatarUrl;
      return `<img src="${esc(src)}" alt="">`;
    }
    const hair = hairUrl(avatarHair);
    const hat = hatUrl(avatarHat);
    return `<span class="ist-avatar-stack">`
      + `<img src="${esc(BASE_URL)}" alt="">`
      + (hair ? `<img src="${esc(hair)}" alt="">` : '')
      + (hat ? `<img src="${esc(hat)}" alt="">` : '')
      + `</span>`;
  }

  global.IstAvatar = { BASE_URL, HAIR_URLS, HAT_URLS, SOZCU_REQUIRED_COUNT, hairUrl, hatUrl, html };
})(window);
