// Site-wide "who is this" name-linking: scans rendered text (news bodies,
// article bodies, comments) for full names that match a row in the
// public.politicians people roster and wraps each match in a clickable
// span, styled with a dotted underline (see each page's own
// .person-mention CSS) so it reads as "tap for more" rather than plain
// emphasis. Clicking/activating it opens the page's own bottom sheet
// (whatever function it already uses for the politician-card detail view)
// with a compact card: avatar, party, birth info, bio, jailed status.
//
// Deliberately independent of politician-card.js (which anahane.html
// doesn't load -- it has its own older inline copy of that logic) --
// this only depends on avatar.js (IstAvatar) and, optionally, i18n.js
// (I18N.formatDate) for the birth-date line.
(function (global) {
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  let peoplePromise = null;

  // Fetches the people roster once (cached across calls/pages within the
  // same load) and filters out any row without a usable full name.
  function loadPeople(sb) {
    if (!peoplePromise) {
      peoplePromise = sb.from('politicians').select('*').then(({ data, error }) => {
        if (error) { console.error('[person-mentions] load failed', error); return []; }
        return (data || []).filter(p => (p.first_name || '').trim() && (p.last_name || '').trim());
      });
    }
    return peoplePromise;
  }

  function avatarHTML(p) {
    return global.IstAvatar ? global.IstAvatar.html(null, p.avatar_hair, p.avatar_hat, p.avatar_accessory, p.avatar_shirt, p.in_jail) : '';
  }

  // Bottom-sheet content for a bare person mention -- same visual family
  // as politician-card.js's detailHTML (.politician-detail / -avatar /
  // -name / -row / -bio classes, already defined on every page that shows
  // a seat card), just without a seat title line.
  function personDetailHTML(p) {
    const name = `${p.first_name} ${p.last_name}`.trim();
    const birthParts = [];
    if (p.birth_date && global.I18N && global.I18N.formatDate) {
      birthParts.push(global.I18N.formatDate(p.birth_date, { year: 'numeric', month: 'long', day: 'numeric' }));
    }
    if (p.birth_place) birthParts.push(p.birth_place);
    return `
      <div class="politician-detail">
        <div class="politician-detail-avatar">${avatarHTML(p)}</div>
        <div class="politician-detail-name">${esc(name)}</div>
        ${p.in_jail ? `<div class="politician-detail-title">Tutuklu</div>` : ''}
        ${p.party ? `<div class="politician-detail-row"><strong>Parti:</strong> ${esc(p.party)}</div>` : ''}
        ${birthParts.length ? `<div class="politician-detail-row"><strong>Doğum:</strong> ${esc(birthParts.join(', '))}</div>` : ''}
        ${p.bio ? `<p class="politician-detail-bio">${esc(p.bio)}</p>` : ''}
      </div>
    `;
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

  // Walks root's text nodes, wraps every full-name match in a
  // .person-mention span, and wires clicks to openDetail(personDetailHTML).
  // Safe to call again on re-rendered content -- already-wrapped spans are
  // skipped via the tree-walker filter and a per-span "wired" flag.
  function linkify(root, people, openDetail) {
    if (!root || !people || !people.length || typeof openDetail !== 'function') return;
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
        span.tabIndex = 0;
        span.textContent = m[0];
        span.dataset.personId = byName.get(m[0]).id;
        frag.appendChild(span);
        last = re.lastIndex;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });

    root.querySelectorAll('.person-mention').forEach(span => {
      if (span.dataset.wired === '1') return;
      span.dataset.wired = '1';
      const activate = () => {
        const p = people.find(x => x.id === span.dataset.personId);
        if (p) openDetail(personDetailHTML(p));
      };
      span.addEventListener('click', activate);
      span.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
  }

  global.IstPersonMentions = { loadPeople, linkify, personDetailHTML };
})(window);
