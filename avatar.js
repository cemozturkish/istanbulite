// Shared avatar rendering: a fixed bald base (assets/avatar-base.png) with an
// optional transparent hair overlay (assets/avatar-hair-<value>.png) stacked
// on top — profiles.avatar_hair picks the overlay ('short' | 'long' | null
// for kel/bald). The locked Sözcü reward (profiles.avatar_url) is still a
// single full-image override that replaces the whole stack when set.
//
// Deliberately tiny and dependency-free (no Supabase, no i18n) so pages that
// only need a read-only avatar — the game pages' commenter-profile popups —
// can load just this file instead of all of profile-card.js. profile-card.js
// itself also uses these constants/helpers for the self-edit picker.
(function (global) {
  const BASE_URL = 'assets/avatar-base.png';
  const HAIR_URLS = { short: 'assets/avatar-hair-short.png', long: 'assets/avatar-hair-long.png' };
  const SOZCU_URL = 'assets/avatar-sozcu.png';
  const SOZCU_REQUIRED_COUNT = 10;

  function hairUrl(hair) {
    return HAIR_URLS[hair] || null;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Renders the avatar markup for a profile's (avatar_url, avatar_hair) pair.
  // No earth/mono color variants for the base or hair layers yet (only the
  // legacy avatar_url special goes through Palette.avatarSrc) — those are
  // plain black line art for now.
  function html(avatarUrl, avatarHair) {
    if (avatarUrl) {
      const src = (global.Palette && global.Palette.avatarSrc) ? global.Palette.avatarSrc(avatarUrl) : avatarUrl;
      return `<img src="${esc(src)}" alt="">`;
    }
    const hair = hairUrl(avatarHair);
    return `<span class="ist-avatar-stack">`
      + `<img src="${esc(BASE_URL)}" alt="">`
      + (hair ? `<img src="${esc(hair)}" alt="">` : '')
      + `</span>`;
  }

  global.IstAvatar = { BASE_URL, HAIR_URLS, SOZCU_URL, SOZCU_REQUIRED_COUNT, hairUrl, html };
})(window);
