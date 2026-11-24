// A game document belongs to the member who opened it. Never adopt an
// unowned legacy save, or write an old board into a newly signed-in account.
(function (global) {
  function create(sb) {
    const owner = sb.auth.getSession().then(({ data }) => data.session?.user.id || null).catch(() => null);

    async function session() {
      const uid = await owner;
      const result = await sb.auth.getSession();
      if (!uid || result.data?.session?.user.id !== uid) return { data: { session: null } };
      return result;
    }

    async function access(action, key, value) {
      const { data } = await session();
      if (!data.session) return null;
      const scoped = 'ist-game:' + data.session.user.id + ':' + key;
      try {
        if (action === 'get') return localStorage.getItem(scoped);
        if (action === 'set') localStorage.setItem(scoped, value);
        if (action === 'remove') localStorage.removeItem(scoped);
      } catch (e) { /* Remote persistence still works when local storage is unavailable. */ }
      return null;
    }

    // A day's board lives in two places: this browser, and game_state on the
    // server (written by every device that played it). Neither is the truth
    // on its own — a phone that finished the game and a browser holding a
    // half-played board from earlier that day each have a copy. So both are
    // read EVERY time and the one further along wins (`rank`, the game's own
    // measure of progress; a finished board always outranks an unfinished
    // one). The local copy used to win outright whenever it existed, which
    // let Safari replay a game the app had already finished.
    async function loadBoard({ key, game, date, rank }) {
      const parse = (raw) => { try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } };
      const score = (s) => { try { return s ? Number(rank(s)) || 0 : -1; } catch (e) { return 0; } };
      const localRaw = await access('get', key);
      let remote = null;
      try {
        const { data: { session: s } } = await session();
        if (s) {
          const { data } = await sb.from('game_state').select('state')
            .eq('user_id', s.user.id).eq('game', game).eq('date', date).maybeSingle();
          remote = data?.state || null;
        }
      } catch (e) { /* offline: the local board is all there is */ }
      const local = parse(localRaw);
      if (remote && score(remote) > score(local)) {
        const raw = JSON.stringify(remote);
        await access('set', key, raw);
        return raw;
      }
      return localRaw || null;
    }

    // Whether game_results says this member already FINISHED the game that
    // day (attempts >= 1), on any device. The safety net for a finished game
    // whose board never reached game_state: it must still not be playable.
    async function finishedElsewhere(game, date) {
      try {
        const { data: { session: s } } = await session();
        if (!s) return false;
        const { data, error } = await sb.from('game_results').select('attempts')
          .eq('user_id', s.user.id).eq('game', game).eq('date', date).gte('attempts', 1).limit(1);
        return !error && Array.isArray(data) && data.length > 0;
      } catch (e) { return false; }
    }

    return {
      session,
      loadBoard,
      finishedElsewhere,
      get: key => access('get', key),
      set: (key, value) => access('set', key, value),
      remove: key => access('remove', key),
    };
  }
  global.IstGameStorage = { create };
})(window);
