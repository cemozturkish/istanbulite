// Shared game-lock logic.
// Add `<script src="game-locks.js"></script>` to any page with a
// `.game-link[data-game="…"]` nav (sozcel, tumcel, bulmaca/Çengel, kahvehane).
// Then call `applyGameLocks(sb)` once `sb` is initialised.
//
// Rules:
//   - Sözcel, Tümcel and Çengel are independent: any of the three can be
//     played in any order. There used to be a sequence here (a question in
//     each joint, and a win-gate on Çengel) — both are gone, and nothing
//     replaced them.
//   - Any game the admin has switched off for the current Istanbul day
//     (via admin.html's Oyunlar tab / the game_day_toggles table) is
//     locked for everyone.

(function () {
  const GAME_LABELS = { sozcel: 'Sözcel', tumcel: 'Tümcel', bulmaca: 'Çengel' };
  const ALL_GAMES = Object.keys(GAME_LABELS);
  // The admin owns the off-switch, so it isn't pointed at them: switching a
  // game off and then being unable to open it to check what everyone else
  // can't see makes the switch unusable.
  const ADMIN_EMAIL = 'cemwozturk@gmail.com';

  function offMessage(game) {
    return `Bugün ${GAME_LABELS[game] || game} yok!`;
  }

  // The NIGHT the off-switch is about, not the calendar date. The games
  // are night-only and a night spans midnight, so a key that rolled over
  // at 00:00 would switch a game the admin had turned off back on half
  // way through the night it was played. See ist-date.js.
  function gameNightKey() {
    return IstDate.gameNight();
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
        .eq('game_date', gameNightKey())
        .in('game', ALL_GAMES);
      if (!error && data) data.forEach(r => off.add(r.game));
    } catch (_) {}
    return off;
  }

  // The same answer, for anyone who needs it outside the nav: Kahvehane's
  // deck asks so it can leave an off game out of the day's sequence
  // altogether (see buildGameDeck there). Not cached -- the admin can flip
  // a switch while a member is standing on the page, and this is one small
  // query per call, exactly as applyGameLocks already does it.
  function offGamesToday(sb) {
    return fetchOffGamesToday(sb);
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

    // Resolved before the bounce below, because whether the off-switch
    // applies depends on who is asking.
    let isAdmin = false;
    try {
      const { data } = await sb.auth.getSession();
      const user = data && data.session && data.session.user ? data.session.user : null;
      isAdmin = !!(user && user.email === ADMIN_EMAIL);
    } catch (_) {}

    // Bounce a direct/bookmark load of the game the user is currently on
    // if it's off today. The active link tells us which page we're on.
    // Sending them back to kahvehane both surfaces the lock state and
    // prevents the game UI from writing game_results.
    const activeLink = document.querySelector('.game-link.active[data-game]');
    if (activeLink) {
      const g = activeLink.dataset.game;
      if (offGames.has(g)) {
        // The admin walks in anyway — they flipped the switch, and a day
        // they can't open is a day they can't fix. Told, not stopped.
        if (isAdmin) {
          showToast(`${offMessage(g)} Yönetici olarak açık.`);
        } else {
          try { sessionStorage.setItem('game_lock_bounce_msg', offMessage(g)); } catch (_) {}
          window.location.replace('kahvehane.html');
          return true;
        }
      }
    }

    // From here on the real answer is known, whatever the DOM does next:
    // see the pre-lock at the bottom of this file, which must not undo it.
    _locksResolved = true;
    ALL_GAMES.forEach(g => {
      const link = document.querySelector(`.game-link[data-game="${g}"]`);
      if (!link) return;
      // Don't lock the breadcrumb to the page the user is already on.
      if (link.classList.contains('active')) return;

      if (offGames.has(g)) {
        // Same rule in the nav: the admin keeps the link open, but it says
        // the game is off so they don't mistake it for a normal day.
        if (isAdmin) {
          unlockLink(link);
          link.title = `${offMessage(g)} Yönetici olarak açık.`;
          return;
        }
        lockLink(link, offMessage(g));
        return;
      }
      if (isAdmin) link.removeAttribute('title');
      unlockLink(link);
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

  // True once applyGameLocks has actually decided each link's state, so
  // the pre-lock below knows there is nothing left to guard.
  let _locksResolved = false;

  window.applyGameLocks = applyGameLocks;
  window.IstGameLocks = { offGamesToday };
  document.addEventListener('DOMContentLoaded', consumeBounceMessage);

  // Pre-lock every game-link as soon as the DOM is ready, regardless of user
  // state. applyGameLocks will unlock the ones that turn out to be playable
  // once the DB roundtrip completes (i.e. not switched off today). This
  // closes the window where the page was rendered, the script tag had
  // loaded, but applyGameLocks hadn't yet resolved — clicking a link the
  // admin had just switched off in that window otherwise sneaks past it.
  // ...unless the round trip already came back. A page whose session
  // restores from cache can finish applyGameLocks *before* this event
  // fires -- the answer is in, and pre-locking on top of it would leave
  // all three games locked on "Yükleniyor…" with nothing left to come and
  // unlock them. Guarding the window is only worth anything while the
  // window is still open.
  document.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    wireClicks();
    if (_locksResolved) return;
    ALL_GAMES.forEach(g => {
      const link = document.querySelector(`.game-link[data-game="${g}"]`);
      if (!link || link.classList.contains('active')) return;
      lockLink(link, 'Yükleniyor…');
    });
  });
})();
