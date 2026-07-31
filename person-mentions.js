// Site-wide "who is this" name-linking: scans rendered text (news bodies,
// article bodies, comments) for full names that match a row in the
// public.politicians people roster and wraps each match in a
// .person-mention span (dotted underline, see each page's own CSS). If
// that person currently holds a title -- a public.political_seats seat
// (mayor, Cumhurbaşkanı) or, failing that, a public.tbmm_seats seat
// (plain "Milletvekili") -- the title is stashed in data-tip and revealed
// as a small label above the name on hover/focus, purely via CSS (see
// .person-mention[data-tip] rules on each page). No click/detail-sheet
// here on purpose: a person's full profile card belongs on their own seat
// card (see politician-card.js), not layered onto every inline mention of
// their name in unrelated articles.
//
// Deliberately independent of politician-card.js (which anahane.html
// doesn't load -- it has its own older inline copy of that logic) --
// this only depends on the politicians/political_seats/tbmm_seats tables.
(function (global) {
  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  let peoplePromise = null;

  // Fetches the people roster once (cached across calls/pages within the
  // same load), filters out any row without a usable full name, and tags
  // each person with the title of whatever seat they currently hold (if
  // any) -- a political_seats title takes priority over the generic
  // "Milletvekili" fallback from tbmm_seats, since it's more specific.
  function loadPeople(sb) {
    if (!peoplePromise) {
      peoplePromise = Promise.all([
        sb.from('politicians').select('*'),
        sb.from('political_seats').select('title, politician_id').not('politician_id', 'is', null),
        sb.from('tbmm_seats').select('politician_id').not('politician_id', 'is', null),
      ]).then(([{ data: people, error }, { data: seats }, { data: tbmmSeats }]) => {
        if (error) { console.error('[person-mentions] load failed', error); return []; }
        const titleById = new Map();
        (seats || []).forEach(s => {
          if (s.politician_id && s.title && s.title.trim() && !titleById.has(s.politician_id)) {
            titleById.set(s.politician_id, s.title.trim());
          }
        });
        (tbmmSeats || []).forEach(s => {
          if (s.politician_id && !titleById.has(s.politician_id)) {
            titleById.set(s.politician_id, 'Milletvekili');
          }
        });
        return (people || [])
          .filter(p => (p.first_name || '').trim() && (p.last_name || '').trim())
          .map(p => ({ ...p, seatTitle: titleById.get(p.id) || '' }));
      });
    }
    return peoplePromise;
  }

  // Longest-name-first alternation so e.g. "Ahmet Yılmaz" doesn't shadow
  // a longer "Ahmet Yılmaz Kaya" match earlier in the same string.
  function buildMatcher(people) {
    const named = people
      .map(p => ({ p, name: `${p.first_name} ${p.last_name}`.trim() }))
      .filter(x => x.name.length > 2)
      .sort((a, b) => b.name.length - a.name.length);
    if (!named.length) return null;
    const byName = new Map(named.map(x => [x.name, x.p]));
    return { re: new RegExp(named.map(x => escapeRegExp(x.name)).join('|'), 'g'), byName };
  }

  // Walks root's text nodes and wraps every full-name match in a
  // .person-mention span carrying data-tip (the person's seat title, if
  // any) for the CSS hover/focus tooltip. Safe to call again on
  // re-rendered content -- already-wrapped spans are skipped via the
  // tree-walker filter, and there's no event wiring left to double up.
  function linkify(root, people) {
    if (!root || !people || !people.length) return;
    const matcher = buildMatcher(people);
    if (!matcher) return;
    const { re, byName } = matcher;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || node.nodeValue.length < 3) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest('a, script, style, .person-mention')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);

    nodes.forEach(n => {
      const text = n.nodeValue;
      re.lastIndex = 0;
      if (!re.test(text)) return;
      re.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = re.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        span.className = 'person-mention';
        span.textContent = m[0];
        const p = byName.get(m[0]);
        if (p.seatTitle) {
          span.tabIndex = 0;
          span.dataset.tip = p.seatTitle;
        }
        frag.appendChild(span);
        last = re.lastIndex;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }

  global.IstPersonMentions = { loadPeople, linkify };
})(window);
