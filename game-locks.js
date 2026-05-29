// Shared game-lock logic.
// Add `<script src="game-locks.js"></script>` to any page with a
// `.game-link[data-game="…"]` nav (sozcel, tumcel, bulmaca, baglantilar,
// kahvehane). Then call `applyGameLocks(sb)` once `sb` is initialised.
//
// To gate a new game in the future, extend GATES below — every page that
// includes this script picks up the new rule automatically.
//
// Rules:
//   - Tümcel is locked until the user has ≥ 15 Sözcel wins.
//   - Bulmaca is locked until the user has won Tümcel at least once.

(function () {
  const GATES = [
    {
      game: 'tumcel',
      requires: (s) => s.sozcelWins >= 15,
      message: (s) => `Tümcel'i oynayabilmek için Sözcel'de en az 15 sözcük bulmuş olman gerekiyor. (Şu an: ${s.sozcelWins}/15)`,
    },
    {
      game: 'bulmaca',
      requires: (s) => s.tumcelWon,
      message: () => "Bulmaca'yı oynayabilmek için önce Tümcel'i kazanman gerekiyor.",
    },
  ];

  let _stylesInjected = false;
  function injectStyles() {
    if (_stylesInjected) return;
    _stylesInjected = true;
    const style = document.createElement('style');
    style.id = 'game-locks-styles';
    style.textContent = `
      .game-link.locked { cursor: not-allowed; opacity: 0.45; color: var(--muted); border-color: var(--rule); }
      .game-link.locked::before { border-color: var(--rule); }
      .game-link.locked .game-link-subtitle { color: var(--muted); }
      .game-link.locked:hover { background: var(--paper-warm); transform: none; }

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
        font-family: 'Inter', sans-serif;
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

  async function applyGameLocks(sb) {
    injectStyles();
    wireClicks();
    if (!sb || !sb.auth) return;

    let userId = null;
    try {
      const { data } = await sb.auth.getSession();
      userId = data && data.session && data.session.user ? data.session.user.id : null;
    } catch (_) {}
    if (!userId) return;

    const stats = { sozcelWins: 0, tumcelWon: false };
    try {
      const { data, error } = await sb
        .from('game_results')
        .select('game, won')
        .eq('user_id', userId)
        .in('game', ['sozcel', 'tumcel'])
        .eq('won', true);
      if (!error && data) {
        stats.sozcelWins = data.filter(r => r.game === 'sozcel').length;
        stats.tumcelWon  = data.some(r => r.game === 'tumcel');
      }
    } catch (_) {}

    GATES.forEach(g => {
      const link = document.querySelector(`.game-link[data-game="${g.game}"]`);
      if (!link) return;
      // Never lock the page the user is already on — they got there somehow
      // and locking the breadcrumb is just confusing.
      if (link.classList.contains('active')) return;
      if (g.requires(stats)) {
        link.classList.remove('locked');
        delete link.dataset.lockMsg;
      } else {
        link.classList.add('locked');
        link.dataset.lockMsg = g.message(stats);
      }
    });
  }

  window.applyGameLocks = applyGameLocks;
})();
