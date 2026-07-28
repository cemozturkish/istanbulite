// Shared politician/seat card + detail-sheet builder — a compact
// top-right card mirroring the top-left #library-card (avatar on the
// right, name/title text right-aligned next to it, see each page's own
// .politician-card CSS), plus the "who is this" detail view opened when
// it's clicked.
//
// Used by kutuphane.html (the fixed Cumhurbaşkanı seat) and kahvehane.html
// (the viewer's own neighborhood's mayor seat). anahane.html has its own,
// older copy of this same logic (its card also switches seats on map
// clicks, which predates this shared module) — it hasn't been refactored
// onto this to avoid touching already-working code for no user-visible
// gain; keep the two in sync if this changes.
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

  // opts: { sb, mountElId, seatId, seatLabel, openDetail(html) }
  // Fetches the seat once and renders the compact card; if openDetail is
  // given, wires a click to open the full detail through it. Callable
  // again on a page revisit (e.g. a virtual navigation) — it always
  // re-fetches, since a single seat lookup is cheap.
  async function mount(opts) {
    const { sb, mountElId, seatId, seatLabel, openDetail } = opts;
    const card = document.getElementById(mountElId);
    if (!card || !sb || !seatId) return;
    const { data: seat } = await sb.from('political_seats').select('*, politicians(*)').eq('id', seatId).maybeSingle();
    card.innerHTML = cardHTML(seat, seatLabel);
    if (openDetail) {
      card.onclick = () => openDetail(detailHTML(seat, seatLabel));
    }
  }

  global.IstPoliticianCard = { mount, cardHTML, detailHTML, avatarHTML };
})(window);
