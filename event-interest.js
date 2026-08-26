// ══════════════════════════════════════════════════════════════════
// "İLGİMİ ÇEKTİ" — what a member did with an event card
//
// An event on Kahvehane is dealt with the way a story on Kütüphane is:
// the card is thrown left or right and it leaves the deck. The
// difference is that the throw here IS the opinion rather than just
// "next" -- right is "ilgimi çekti", left is "ilgimi çekmedi" -- and the
// ones thrown right are exactly the ones Hane prints beside the petek.
// So the two pages are one move: you sort the city's events on the local
// side, and what you kept is waiting for you in the middle.
//
// Kept per member in localStorage, the same store the news deck's
// "dealt" list is (`dunya_dealt_<uid>` in kutuphane.html) and for the
// same reason: a verdict is the reader's own working state, not
// something anybody else on the site is entitled to read. A server
// mirror can be added beside it later the way news_dealt was, without
// changing anything here -- the deck reads this and only this.
//
// It lives in its own file because both Kahvehane (which writes it) and
// Hane (which reads it) need it, and the two pages share one document
// under router.js: a copy in each page's script is a copy that drifts.
// ══════════════════════════════════════════════════════════════════
(function () {
  const KEY = (uid) => `ev_interest_${uid || 'anon'}`;
  // uid -> { eventId: 'yes' | 'no' }
  const cache = new Map();

  function load(uid) {
    if (cache.has(uid)) return cache.get(uid);
    let map = {};
    try {
      const raw = localStorage.getItem(KEY(uid));
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) map = parsed;
    } catch (e) { /* private mode, or somebody else's junk under the key */ }
    cache.set(uid, map);
    return map;
  }

  function save(uid) {
    try { localStorage.setItem(KEY(uid), JSON.stringify(load(uid))); }
    catch (e) { /* full or blocked: the deck still behaves for this session */ }
  }

  // Fire-and-forget, mirroring recordDealtOnServer in kutuphane.html: the
  // card has already left the deck by the time this runs and nothing
  // here reads the answer back. localStorage stays the source of truth
  // for the reader's OWN verdict -- this exists purely so somebody
  // ELSE'S hive query (hive_event_interest_status) can see it.
  function recordServer(uid, eventId, verdict) {
    const sb = window.IstRouter && window.IstRouter.sb;
    if (!sb) return;
    try {
      sb.from('event_interest')
        .upsert({ user_id: uid, event_id: eventId, verdict, verdict_at: new Date().toISOString() },
                { onConflict: 'user_id,event_id' })
        .then(() => {}, () => {});
    } catch (e) {}
  }

  const API = {
    // 'yes' | 'no' | null (never asked)
    verdict(uid, eventId) {
      const v = load(uid)[String(eventId)];
      return v === 'yes' || v === 'no' ? v : null;
    },
    judged(uid, eventId) { return API.verdict(uid, eventId) != null; },
    interested(uid, eventId) { return API.verdict(uid, eventId) === 'yes'; },
    set(uid, eventId, verdict) {
      if (!uid) return;
      const v = verdict === 'yes' ? 'yes' : 'no';
      load(uid)[String(eventId)] = v;
      save(uid);
      recordServer(uid, eventId, v);
    },
    // ── The verdicts this browser doesn't have yet ──
    // localStorage is where a verdict lives (see recordServer above for
    // why the server copy exists at all), and that is right: it is the
    // reader's own working state, not something anybody else is entitled
    // to read. But a browser is not a member -- a cleared cache, a second
    // device, the app beside mobile Safari -- and an evening somebody
    // kept should be waiting for them beside the petek wherever they
    // open it. So their own rows are read back and merged in, and only
    // for keys this browser has never had a verdict for: what the reader
    // did on THIS device always wins.
    //
    // Best-effort in every direction. A database without
    // db/hive_event_interest.sql answers with an error and nothing
    // happens; that is exactly the state every install was in before it
    // was written, and the deck still works there.
    async hydrate(uid, sb) {
      if (!uid || !sb) return false;
      let rows = null;
      try {
        const { data, error } = await sb.from('event_interest')
          .select('event_id, verdict').eq('user_id', uid);
        if (error) return false;
        rows = data;
      } catch (e) { return false; }
      const map = load(uid);
      let added = false;
      (rows || []).forEach(r => {
        const key = String(r.event_id);
        if (map[key]) return;
        if (r.verdict !== 'yes' && r.verdict !== 'no') return;
        map[key] = r.verdict;
        added = true;
      });
      if (added) save(uid);
      return added;
    },
    // Everything the member kept -- Hane's whole question.
    interestedIds(uid) {
      const map = load(uid);
      return new Set(Object.keys(map).filter(id => map[id] === 'yes'));
    },
    // An event that has already happened is not a verdict worth keeping:
    // drop anything outside the set of rows still being listed, so the
    // store stays the size of the city's calendar rather than growing
    // forever (the news deck prunes its own store to the 72h window for
    // the same reason).
    prune(uid, validIds) {
      if (!uid || !validIds) return;
      const keep = validIds instanceof Set ? validIds : new Set(validIds);
      const map = load(uid);
      let dropped = false;
      Object.keys(map).forEach(id => {
        if (!keep.has(id)) { delete map[id]; dropped = true; }
      });
      if (dropped) save(uid);
    },
  };

  window.IstEventInterest = API;
})();
