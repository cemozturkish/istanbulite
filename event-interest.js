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
      load(uid)[String(eventId)] = verdict === 'yes' ? 'yes' : 'no';
      save(uid);
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
