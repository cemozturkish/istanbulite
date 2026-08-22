// Shared game-lock logic.
// Add `<script src="game-locks.js"></script>` to any page with a
// `.game-link[data-game="…"]` nav (sozcel, tumcel, bulmaca, kahvehane).
// Then call `applyGameLocks(sb)` once `sb` is initialised.
//
// To gate a new game in the future, extend GATES below — every page that
// includes this script picks up the new rule automatically.
//
// Rules:
//   - The three games are a sequence with a question in each joint (see
//     db/daily_questions.sql): Tümcel is locked until the question that
//     follows Sözcel has been answered, and Bulmaca until the one that
//     follows Tümcel has. The card that asks it appears in Kahvehane's
//     games column once the game before it has been played, so the
//     sequence is: play, answer, play, answer, play, answer.
//     A day with no question in a slot has no gate there — an empty
//     table has to behave exactly like the site did before it existed,
//     or a feature with no content takes the app down with it.
//   - Bulmaca is locked until the user has won Tümcel at least once.
//   - Any game the admin has switched off for the current Istanbul day
//     (via admin.html's Oyunlar tab / the game_day_toggles table) is
//     locked for everyone, regardless of the rules above.

(function () {
  const GAME_LABELS = { sozcel: 'Sözcel', tumcel: 'Tümcel', bulmaca: 'Bulmaca' };
  const ALL_GAMES = Object.keys(GAME_LABELS);
  // The admin owns the off-switch, so it isn't pointed at them: switching a
  // game off and then being unable to open it to check what everyone else
  // can't see makes the switch unusable. The win-gates below still apply to
  // everyone — those are the game's own progression, not an admin control.
  const ADMIN_EMAIL = 'cemwozturk@gmail.com';

  // Which game each one follows in the sequence. Also what the question
  // gate reads: the question in the joint before `game`.
  const PREV_GAME = { tumcel: 'sozcel', bulmaca: 'tumcel' };

  // A game can carry more than one gate (Bulmaca carries two), so these
  // are always filtered, never found.
  const GATES = [
    {
      game: 'tumcel',
      requires: (s) => questionCleared(s, 'tumcel'),
      message: () => "Tümcel'i açmak için önce Sözcel'i oynayıp günün sorusunu cevapla.",
    },
    {
      game: 'bulmaca',
      requires: (s) => questionCleared(s, 'bulmaca'),
      message: () => "Bulmaca'yı açmak için önce Tümcel'i oynayıp günün sorusunu cevapla.",
    },
    {
      game: 'bulmaca',
      requires: (s) => s.tumcelWon,
      message: () => "Bulmaca'yı oynayabilmek için önce Tümcel'i kazanman gerekiyor.",
    },
  ];

  // True when nothing is standing between the reader and `game`: either
  // there is no question in the joint before it today, or they have
  // already answered it.
  function questionCleared(s, game) {
    const prev = PREV_GAME[game];
    const qid = prev && s.questions ? s.questions[prev] : null;
    return !qid || (s.answered && s.answered.has(qid));
  }

  function offMessage(game) {
    return `Bugün ${GAME_LABELS[game] || game} yok!`;
  }

  function istanbulDateISO() {
    return IstDate.iso();
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
    let userId = null;
    let isAdmin = false;
    try {
      const { data } = await sb.auth.getSession();
      const user = data && data.session && data.session.user ? data.session.user : null;
      userId = user ? user.id : null;
      isAdmin = !!(user && user.email === ADMIN_EMAIL);
    } catch (_) {}

    // Bounce direct/bookmark loads of the game the user is currently on if
    // it's off today, or if it's a win-gated game they haven't unlocked.
    // The active link tells us which page we're on. Sending them back to
    // kahvehane both surfaces the lock state and prevents the game UI from
    // writing game_results.
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

    const stats = { tumcelWon: false, questions: {}, answered: new Set() };
    // Today's questions, and which of them this member has answered.
    // Best-effort on purpose: before db/daily_questions.sql has been run
    // the tables aren't there, and the games must still open.
    try {
      const { data, error } = await sb
        .from('daily_questions')
        .select('id, after_game')
        .eq('question_date', istanbulDateISO());
      if (!error && data) data.forEach(q => { stats.questions[q.after_game] = q.id; });
    } catch (_) {}
    const qIds = Object.values(stats.questions);
    if (userId && qIds.length) {
      try {
        const { data, error } = await sb
          .from('question_answers')
          .select('question_id')
          .eq('user_id', userId)
          .in('question_id', qIds);
        if (!error && data) data.forEach(r => stats.answered.add(r.question_id));
      } catch (_) {}
    }

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
        const gate = GATES.filter(x => x.game === g).find(x => !x.requires(stats));
        if (gate) {
          try { sessionStorage.setItem('game_lock_bounce_msg', gate.message(stats)); } catch (_) {}
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
      const gate = GATES.filter(x => x.game === g).find(x => !x.requires(stats));
      if (gate) {
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

  // True once applyGameLocks has actually decided each link's state, so
  // the pre-lock below knows there is nothing left to guard.
  let _locksResolved = false;

  window.applyGameLocks = applyGameLocks;
  window.IstGameLocks = { offGamesToday };
  document.addEventListener('DOMContentLoaded', consumeBounceMessage);

  // Pre-lock every game-link as soon as the DOM is ready, regardless of user
  // state. applyGameLocks will unlock the ones that turn out to be playable
  // once the DB roundtrip completes. This closes the window where the page
  // was rendered, the script tag had loaded, but applyGameLocks hadn't yet
  // resolved — clicking a gated link in that window otherwise sneaks past
  // the gate entirely. All three games can end up locked now (admin
  // off-switch applies to any of them, not just the win-gated ones), so all
  // are pre-locked, not just the ones in GATES.
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
