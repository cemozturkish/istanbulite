// Shared politician/seat card + detail-sheet builder — a compact
// top-right card mirroring the top-left #library-card (avatar on the
// right, name/title text right-aligned next to it, see each page's own
// .politician-card CSS), plus the "who is this" detail view opened when
// it's clicked.
//
// Used by two of the three carousel pages: kahvehane.html (one fixed
// seat, the viewer's own neighborhood's mayor) and kutuphane.html, whose
// seat follows its map — the touched country's leader, resting on the
// Cumhurbaşkanı with nothing selected. That page calls render() with a
// seat out of seats() rather than mount(), which only knows how to show
// one fixed id. Hane names no seat at all: the petek is the people, and
// there is no map on that page for a seat to be true of.
//
// ── On a phone the seat lives in the top bar ──
// There is no room beside the map for a second card, and the seat is not
// page furniture anyway: it names who holds power over what you are
// looking at, which is the same *kind* of fact as who you are. So the
// profile bar carries both — at opposite ends of the row, and which end
// each of them stands at is the page (Kütüphane seats the politician at
// the left and you at the right; Kahvehane mirrors it), see "THE TOP BAR"
// in profile-card.css. render() therefore paints twice:
// the page's own #politician-card (the desktop card) and #ist-pc-seat,
// the slot profile-card.js leaves in the bar's row for it.
//
// The bar outlives a virtual navigation (it sits outside #ist-content,
// see router.js), so the seat in it has to be told when the page under it
// changes: router.js calls clearSeat() the moment it swaps the content,
// and the arriving page's own mount() paints the new seat. Without that,
// Kahvehane would wear the Cumhurbaşkanı for as long as its seat fetch
// takes — and a tap in that window would open Kütüphane's sheet.
//
// Whoever wires the click must bind it to the card element, never
// delegate it on document: #politician-card exists on both pages that
// carry a seat and a document-level listener survives a virtual
// navigation (see router.js), so it would keep firing on the other page's
// card — which is exactly how anahane's sheet used to open on top of
// kütüphane's.
//
// Backed by public.political_seats (id -> politician_id + title) joined
// with public.politicians, the people roster shared with mayors — see
// db/politicians.sql. Each page supplies its own seatId (fixed, or
// resolved from the logged-in user's own neighborhood) and its own
// openDetail(html) bottom-sheet function, since each page's overlay
// mechanism differs.
//
// Deliberately tiny (no i18n) — depends only on avatar.js (IstAvatar),
// already loaded wherever this is.
(function (global) {
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function avatarHTML(p) {
    return global.IstAvatar.html(null, p?.avatar_hair, p?.avatar_hat, p?.avatar_accessory, p?.avatar_shirt, p?.in_jail);
  }

  function cardHTML(seat, seatLabel) {
    const p = seat?.politicians || null;
    return `
      <div class="card-top">
        <div class="card-id">
          <div class="card-name">${esc(p ? `${p.first_name} ${p.last_name}`.trim() : seatLabel)}</div>
          <div class="card-meta">${esc(seat?.title || 'Henüz eklenmedi')}</div>
        </div>
        <div class="avatar">${avatarHTML(p)}</div>
      </div>
    `;
  }

  function detailHTML(seat, seatLabel) {
    const p = seat?.politicians || null;
    const name = p ? `${p.first_name} ${p.last_name}`.trim() : seatLabel;
    const birthParts = [];
    if (p?.birth_date && global.I18N && global.I18N.formatDate) {
      birthParts.push(global.I18N.formatDate(p.birth_date, { year: 'numeric', month: 'long', day: 'numeric' }));
    }
    if (p?.birth_place) birthParts.push(p.birth_place);
    return `
      <div class="politician-detail">
        <div class="politician-detail-avatar">${avatarHTML(p)}</div>
        <div class="politician-detail-name">${esc(name)}</div>
        <div class="politician-detail-title">${esc(seat?.title || 'Henüz eklenmedi')}</div>
        ${p?.party ? `<div class="politician-detail-row"><strong>Parti:</strong> ${esc(p.party)}</div>` : ''}
        ${birthParts.length ? `<div class="politician-detail-row"><strong>Doğum:</strong> ${esc(birthParts.join(', '))}</div>` : ''}
        ${p?.bio ? `<p class="politician-detail-bio">${esc(p.bio)}</p>` : ''}
        ${!p ? `<p class="politician-detail-bio" style="font-style:italic;color:var(--muted);">Bu koltuğa henüz kimse atanmadı.</p>` : ''}
      </div>
    `;
  }

  // The seat as an occupant of the profile bar: the bar's own type classes
  // rather than the desktop card's, so it is dressed by "THE TOP BAR" in
  // profile-card.css exactly like the person on the other end of the row —
  // one type scale, no second copy to keep in sync.
  //
  // No portrait: the bar is two names in type and nothing else, on both
  // ends (see the same section). The face is what the detail sheet opens
  // with — a bar that prints it too spends the row's whole width saying
  // twice what one line of type already says.
  function barHTML(seat, seatLabel) {
    const p = seat?.politicians || null;
    return `
      <div class="ist-pc-id">
        <div class="ist-pc-name">${esc(p ? `${p.first_name} ${p.last_name}`.trim() : seatLabel)}</div>
        <div class="ist-pc-meta">${esc(seat?.title || 'Henüz eklenmedi')}</div>
      </div>
    `;
  }

  // The seat currently on the bar, kept so paintBar() can put it back after
  // profile-card.js rebuilds the row (a re-mount, a profile refresh) — that
  // rebuild is an innerHTML swap, so it empties the slot without knowing it
  // held anything.
  let barSeat = null;

  function paintBar() {
    const slot = document.getElementById('ist-pc-seat');
    if (!slot) return;
    slot.innerHTML = barSeat ? barSeat.html : '';
    slot.onclick = barSeat && barSeat.open ? barSeat.open : null;
    // Which end of the bar this slot stands at — and whether the page has
    // a seat at all — is the *page's*, not this module's: it is one of
    // three layouts set by IstProfileCard.setBarLayout (see "THE TOP BAR"
    // in profile-card.css). The slot holds its half of the row on the two
    // pages that name a seat whether it is painted yet or not, so the row
    // does not re-flow under the reader when a seat lands a moment after
    // the page it belongs to.
  }

  // Paints one seat onto both of its surfaces (the page's desktop card and
  // the bar) and wires the same detail view to each.
  // opts: { mountElId, seat, seatLabel, openDetail(html) }
  function render(opts) {
    const { mountElId, seat, seatLabel, openDetail } = opts;
    const open = openDetail ? () => openDetail(detailHTML(seat, seatLabel)) : null;
    const card = document.getElementById(mountElId || 'politician-card');
    if (card) {
      card.innerHTML = cardHTML(seat, seatLabel);
      card.onclick = open;
    }
    barSeat = { html: barHTML(seat, seatLabel), open };
    paintBar();
  }

  // Called by router.js the instant a virtual navigation swaps the page
  // under the bar — see the note at the top of this file.
  function clearSeat() {
    barSeat = null;
    paintBar();
  }

  // Every seat, fetched once and kept for the session, keyed by id.
  //
  // Two of the three pages swap their seat as their map is tapped — Hane
  // through its districts, Kütüphane through the countries on its phone
  // map — and there the next seat has to arrive *with* the tap rather than
  // a request later. All three read the same small table, so they share one
  // fetch; both pages used to keep a copy of this, which meant two
  // identically named globals in one document once router.js had injected
  // both page scripts (see "The three carousel pages share one document" in
  // CLAUDE.md) — the second `let` to be parsed threw and took its whole page
  // script with it.
  //
  // The promise is what's cached, not the rows, so simultaneous first
  // callers share the one request. A failed fetch is dropped rather than
  // cached: it is a network blip, not an empty table, and caching it would
  // leave every seat blank for the rest of the session.
  let seatsPromise = null;
  function seats(sb) {
    if (!seatsPromise) {
      seatsPromise = sb.from('political_seats').select('*, politicians(*)').then(({ data, error }) => {
        if (error) {
          seatsPromise = null;
          console.error('[politician-card seats]', error);
          return {};
        }
        const byId = {};
        (data || []).forEach(s => { byId[s.id] = s; });
        return byId;
      });
    }
    return seatsPromise;
  }

  // opts: { sb, mountElId, seatId, seatLabel, openDetail(html) }
  // Renders one fixed seat; if openDetail is given, wires a click to open
  // the full detail through it. Callable again on a page revisit (e.g. a
  // virtual navigation) — the seats are already in hand by then, so the
  // repaint costs nothing.
  async function mount(opts) {
    const { sb, mountElId, seatId, seatLabel, openDetail } = opts;
    if (!sb || !seatId) return;
    const byId = await seats(sb);
    render({ mountElId, seat: byId[seatId], seatLabel, openDetail });
  }

  global.IstPoliticianCard = { mount, render, seats, paintBar, clearSeat, cardHTML, detailHTML, avatarHTML };
})(window);
