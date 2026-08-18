// Shared politician/seat card + detail-sheet builder — a compact
// top-right card mirroring the top-left #library-card (avatar on the
// right, name/title text right-aligned next to it, see each page's own
// .politician-card CSS), plus the "who is this" detail view opened when
// it's clicked.
//
// Used by all three carousel pages: kutuphane.html (the fixed
// Cumhurbaşkanı seat), kahvehane.html (the viewer's own neighborhood's
// mayor seat) and anahane.html (whichever district is selected on the
// map — it keeps its own seat cache and calls render()/detailHTML()
// directly, since mount()'s one-seat fetch can't express that).
//
// ── On a phone the seat lives in the top bar ──
// There is no room beside the map for a second card, and the seat is not
// page furniture anyway: it names who holds power over what you are
// looking at, which is the same *kind* of fact as who you are. So the
// profile bar carries both — the seat on the left, you on the right (see
// "THE TOP BAR" in profile-card.css). render() therefore paints twice:
// the page's own #politician-card (the desktop card) and #ist-pc-seat,
// the slot profile-card.js leaves at the left end of the bar's row.
//
// The bar outlives a virtual navigation (it sits outside #ist-content,
// see router.js), so the seat in it has to be told when the page under it
// changes: router.js calls clearSeat() the moment it swaps the content,
// and the arriving page's own mount() paints the new seat. Without that,
// Kahvehane would wear the Cumhurbaşkanı for as long as its seat fetch
// takes — and a tap in that window would open Kütüphane's sheet.
//
// Whoever wires the click must bind it to the card element, never
// delegate it on document: #politician-card exists on all three pages and
// a document-level listener survives a virtual navigation (see router.js),
// so it would keep firing on the other pages' cards — which is exactly
// how anahane's sheet used to open on top of kütüphane's.
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

  // The seat as an occupant of the profile bar: the bar's own portrait and
  // type classes rather than the desktop card's, so it is dressed by "THE
  // TOP BAR" in profile-card.css exactly like the person on the other end
  // of the row — one portrait treatment, one type scale, no second copy to
  // keep in sync.
  function barHTML(seat, seatLabel) {
    const p = seat?.politicians || null;
    return `
      <div class="ist-pc-avatar ist-pc-seat-avatar">${avatarHTML(p)}</div>
      <div class="ist-pc-id">
        <div class="ist-pc-name">${esc(p ? `${p.first_name} ${p.last_name}`.trim() : seatLabel)}</div>
        <div class="ist-pc-meta">${esc(seat?.title || 'Henüz eklenmedi')}</div>
      </div>
    `;
  }

  // The seat currently on the bar, kept so paintBar() can put it back after
  // profile-card.js rebuilds the row (an avatar change, a re-mount) — that
  // rebuild is an innerHTML swap, so it empties the slot without knowing it
  // held anything.
  let barSeat = null;

  function paintBar() {
    const slot = document.getElementById('ist-pc-seat');
    if (!slot) return;
    const row = slot.closest('.ist-pc-row');
    slot.innerHTML = barSeat ? barSeat.html : '';
    slot.onclick = barSeat && barSeat.open ? barSeat.open : null;
    // The row right-aligns the person only once somebody is standing at the
    // other end; on a page with no seat it keeps its original single-block
    // layout rather than leaving a hole where the seat would be.
    if (row) row.classList.toggle('ist-pc-has-seat', !!barSeat);
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

  // opts: { sb, mountElId, seatId, seatLabel, openDetail(html) }
  // Fetches the seat once and renders it; if openDetail is given, wires a
  // click to open the full detail through it. Callable again on a page
  // revisit (e.g. a virtual navigation) — it always re-fetches, since a
  // single seat lookup is cheap.
  async function mount(opts) {
    const { sb, mountElId, seatId, seatLabel, openDetail } = opts;
    if (!sb || !seatId) return;
    const { data: seat } = await sb.from('political_seats').select('*, politicians(*)').eq('id', seatId).maybeSingle();
    render({ mountElId, seat, seatLabel, openDetail });
  }

  global.IstPoliticianCard = { mount, render, paintBar, clearSeat, cardHTML, detailHTML, avatarHTML };
})(window);
