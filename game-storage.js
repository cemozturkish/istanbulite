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

    return {
      session,
      get: key => access('get', key),
      set: (key, value) => access('set', key, value),
      remove: key => access('remove', key),
    };
  }
  global.IstGameStorage = { create };
})(window);
