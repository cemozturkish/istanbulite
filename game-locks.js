// Shared game-lock logic.
// Add `<script src="game-locks.js"></script>` to any page with a
// `.game-link[data-game="…"]` nav (sozcel, tumcel, bulmaca, kahvehane).
// Then call `applyGameLocks(sb)` once `sb` is initialised.
//
// To gate a new game in the future, extend GATES below — every page that
// includes this script picks up the new rule automatically.
//
// Rules:
//   - Bulmaca is locked until the user has won Tümcel at least once.
//   - Any game the admin has switched off for the current Istanbul day
//     (via admin.html's Oyunlar tab / the game_day_toggles table) is
//     locked for everyone, regardless of the rule above.

(function () {
  const GAME_LABELS = { sozcel: 'Sözcel', tumcel: 'Tümcel', bulmaca: 'Bulmaca' };
  const ALL_GAMES = Object.keys(GAME_LABELS);

  const GATES = [
    {
      game: 'bulmaca',
      requires: (s) => s.tumcelWon,
      message: () => "Bulmaca'yı oynayabilmek için önce Tümcel'i kazanman gerekiyor.",
    },
  ];

  function offMessage(game) {
    return `Bugün ${GAME_LABELS[game] || game} yok!`;
  }

  function istanbulDateISO() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  let _stylesInjected = false;
  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const style = document.createElement('style');
    style.id = 'game-locks-styles';
    style.textContent = `
      .game-link.locked { cursor: not-allowed; opacity: 0.45; color: var(--muted); border-color: var(--rule); }
      .game-link.locked .game-link-subtitle { color: var(--muted); }
      .game-link.locked:hover, .game-link.locked:active { background: var(--paper-warm); transform: none; filter: none; }

      #game-lock-toast {
        position: fixed;
        bottom: 90px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent);
        color: var(--paper);
        padding: 12px 18px;
        border: 2px solid var(--ink);
        font-size: 0.82rem;
        line-height: 1.4;
        text-align: center;
        max-width: 280px;
        width: max-content;
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Inter', sans-serif;
      }
      #game-lock-toast.visible { opacity: 1; }
    `;
    document.head.appendChild(style);
  }

  function ensureToast() {
    let el = document.getElementById('game-lock-toast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'game-lock-toast';
    document.body.appendChild(el);
    return el;
  }

  let _toastTimer = null;
  function showToast(msg) {
    const el = ensureToast();
    el.textContent = msg;
    el.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('visible'), 3500);
  }

  let _clicksWired = false;
  function wireClicks() {
    if (_clicksWired) return;
    _clicksWired = true;
    // Delegated so links rendered after init are still gated.
    document.addEventListener('click', (e) => {
      const el = e.target.closest('.game-link[data-game]');
      if (!el || !el.classList.contains('locked')) return;
      e.preventDefault();
      showToast(el.dataset.lockMsg || 'Bu oyun şu an kilitli.');
    });
  }

  // Games the admin has switched off for today (Istanbul time). Independent
  // of who's logged in, so this is fetched before any session check.
  async function fetchOffGamesToday(sb) {
    const off = new Set();
    try {
      const { data, error } = await sb
        .from('game_day_toggles')
        .select('game')
        .eq('game_date', istanbulDateISO())
        .in('game', ALL_GAMES);
      if (!error && data) data.forEach(r => off.add(r.game));
    } catch (_) {}
    return off;
  }

  function lockLink(link, msg) {
    link.classList.add('locked');
    link.dataset.lockMsg = msg;
  }
  function unlockLink(link) {
    link.classList.remove('locked');
    delete link.dataset.lockMsg;
  }

  async function applyGameLocks(sb) {
    injectStyles();
    wireClicks();
    if (!sb || !sb.auth) return;

    const offGames = await fetchOffGamesToday(sb);

    // Bounce direct/bookmark loads of the game the user is currently on if
    // it's off today, or if it's a win-gated game they haven't unlocked.
    // The active link tells us which page we're on. Sending them back to
    // kahvehane both surfaces the lock state and prevents the game UI from
    // writing game_results.
    const activeLink = document.querySelector('.game-link.active[data-game]');
    if (activeLink) {
      const g = activeLink.dataset.game;
      if (offGames.has(g)) {
        try { sessionStorage.setItem('game_lock_bounce_msg', offMessage(g)); } catch (_) {}
        window.location.replace('kahvehane.html');
        return true;
      }
    }

    let userId = null;
    try {
      const { data } = await sb.auth.getSession();
      userId = data && data.session && data.session.user ? data.session.user.id : null;
    } catch (_) {}

    const stats = { tumcelWon: false };
    if (userId) {
      try {
        const { data, error } = await sb
          .from('game_results')
          .select('game, won')
          .eq('user_id', userId)
          .eq('game', 'tumcel')
          .eq('won', true);
        if (!error && data) {
          stats.tumcelWon = data.length > 0;
        }
      } catch (_) {}

      if (activeLink) {
        const g = activeLink.dataset.game;
        const gate = GATES.find(x => x.game === g);
        if (gate && !gate.requires(stats)) {
          try { sessionStorage.setItem('game_lock_bounce_msg', gate.message(stats)); } catch (_) {}
          window.location.replace('kahvehane.html');
          return true;
        }
      }
    }

    ALL_GAMES.forEach(g => {
      const link = document.querySelector(`.game-link[data-game="${g}"]`);
      if (!link) return;
      // Don't lock the breadcrumb to the page the user is already on.
      if (link.classList.contains('active')) return;

      if (offGames.has(g)) {
        lockLink(link, offMessage(g));
        return;
      }
      const gate = GATES.find(x => x.game === g);
      if (gate && !gate.requires(stats)) {
        lockLink(link, gate.message(stats));
      } else {
        unlockLink(link);
      }
    });
  }

  // On any page, surface a bounce message left behind by a redirect from a
  // gated game. Idempotent and harmless if no message is present.
  function consumeBounceMessage() {
    try {
      const msg = sessionStorage.getItem('game_lock_bounce_msg');
      if (!msg) return;
      sessionStorage.removeItem('game_lock_bounce_msg');
      // Give the page a moment to settle so the toast isn't immediately
      // overlapped by other init UI.
      setTimeout(() => showToast(msg), 200);
    } catch (_) {}
  }

  window.applyGameLocks = applyGameLocks;
  document.addEventListener('DOMContentLoaded', consumeBounceMessage);

  // Pre-lock every game-link as soon as the DOM is ready, regardless of user
  // state. applyGameLocks will unlock the ones that turn out to be playable
  // once the DB roundtrip completes. This closes the window where the page
  // was rendered, the script tag had loaded, but applyGameLocks hadn't yet
  // resolved — clicking a gated link in that window otherwise sneaks past
  // the gate entirely. All three games can end up locked now (admin
  // off-switch applies to any of them, not just the win-gated ones), so all
  // are pre-locked, not just the ones in GATES.
  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    wireClicks();
    ALL_GAMES.forEach(g => {
      const link = document.querySelector(`.game-link[data-game="${g}"]`);
      if (!link || link.classList.contains('active')) return;
      lockLink(link, 'Yükleniyor…');
    });
  });
})();
