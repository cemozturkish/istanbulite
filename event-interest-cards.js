// ══════════════════════════════════════════════════════════════════
// EVENT CARDS — the one ".event-item" template, in two sizes
//
// Pure markup, nothing else: no fetch, no click-wiring, no DOM writes.
// The small card in the stack and the page it grows into are the same
// paper in two sizes, and they live here rather than in the page that
// prints them so that changing one is changing both. Anahane's own
// script is the caller (it wires the press, the grow and the RSVP
// button around this markup); it is a file of its own for the same
// reason event-interest.js is -- a template copied into a page script
// is a template that drifts.
//
// Every function takes what it needs as an argument rather than reaching
// for a global: districtLabel and attendeesHTML are passed in because
// the two callers keep separate copies of the neighbourhood lookup and
// the RSVP-avatar renderer (NB_NAMES in profile-card.js, districtNames
// in anahane.html) -- a shared module reaching past its own arguments
// into somebody else's page-local state is exactly the coupling
// event-interest.js was written to avoid.
// ══════════════════════════════════════════════════════════════════
(function () {
  const MONTH_ABBR_TR = ['OCA','ŞUB','MAR','NİS','MAY','HAZ','TEM','AĞU','EYL','EKİ','KAS','ARA'];
  const MONTH_ABBR_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function dateParts(iso, isEnglish) {
    const d = new Date(iso);
    const tz = 'Europe/Istanbul';
    const locale = isEnglish ? 'en-US' : 'tr-TR';
    const day = parseInt(d.toLocaleDateString('en-US', { timeZone: tz, day: 'numeric' }), 10);
    const month = parseInt(d.toLocaleDateString('en-US', { timeZone: tz, month: 'numeric' }), 10);
    const weekday = d.toLocaleDateString(locale, { timeZone: tz, weekday: 'long' });
    const wd = d.toLocaleDateString(locale, { timeZone: tz, weekday: 'short' }).toLocaleUpperCase(locale);
    const time = d.toLocaleTimeString(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: !!isEnglish });
    const monAbbr = (isEnglish ? MONTH_ABBR_EN : MONTH_ABBR_TR)[month - 1] || '';
    return { day, mon: monAbbr, wd, weekday, time };
  }

  // The small card in a stack. opts.districtLabel(id) resolves the
  // neighbourhood name, opts.attendeesHTML(eventId) the avatar row --
  // both optional, so a caller with no RSVP data yet still gets a card.
  function previewHTML(ev, parts, opts) {
    opts = opts || {};
    const nbLabel = ev.neighborhood
      ? ((opts.districtLabel && opts.districtLabel(ev.neighborhood)) || ev.neighborhood)
      : 'İstanbul';
    const attendees = opts.attendeesHTML ? opts.attendeesHTML(ev.id) : '';
    return `
      <div class="event-item openable" data-event-id="${esc(ev.id)}">
        <div class="ev-date-block">
          <div class="ev-day">${parts.day}</div>
          <div class="ev-mon">${parts.mon}</div>
          <div class="ev-wd">${parts.wd}</div>
        </div>
        <div class="ev-body">
          <div class="ev-kicker">${esc(nbLabel.toLocaleUpperCase('tr-TR'))}</div>
          <div class="ev-title">${esc(ev.title)}</div>
          <span class="ev-attendees ev-attendees-preview">${attendees}</span>
        </div>
      </div>
    `;
  }

  // ── THE EVENT PAGE ──
  // What a kept card grows into: head / body / foot, the same three-part
  // page a story opens as on Kütüphane (.news-page there). What it is,
  // and the way back out, on the top line; the event itself scrolling in
  // the middle; the RSVP row standing on the bottom line, where it
  // cannot scroll away from the reader. There is no throw here and no
  // cue stamped on the paper -- a kept event has already had its verdict
  // given on Kahvehane's deck, and the one thing this page asks is
  // whether you are going.
  //
  // opts.rsvp = { count, attending, joinLabel, goingLabel, countLabel }
  // is optional -- omit it and the foot is left out entirely.
  function pageHTML(ev, parts, opts) {
    opts = opts || {};
    const nbLabel = ev.neighborhood
      ? ((opts.districtLabel && opts.districtLabel(ev.neighborhood)) || ev.neighborhood)
      : 'İstanbul';
    const dateTime = [parts.weekday, parts.time].filter(Boolean).join(' ');
    const metaHTML = [dateTime, ev.location].filter(Boolean).map(esc).join('<br>');
    const rsvp = opts.rsvp;
    const back = opts.backLabel || 'Geri';
    return `
      <div class="ev-page-head">
        <button type="button" class="ev-page-back" aria-label="${esc(back)}" title="${esc(back)}"><img src="assets/back.png" alt=""></button>
        <div class="ev-kicker">${esc(nbLabel.toLocaleUpperCase('tr-TR'))}</div>
        <div class="ev-page-when">${parts.day} ${esc(parts.mon)}</div>
      </div>
      <div class="ev-page-body">
        <h2 class="ev-page-title">${esc(ev.title)}</h2>
        ${metaHTML ? `<div class="ev-meta">${metaHTML}</div>` : ''}
        ${ev.description ? `<p class="ev-desc">${esc(ev.description)}</p>` : ''}
      </div>
      ${rsvp ? `
        <div class="ev-page-foot">
          <div class="ev-rsvp-row">
            <button type="button" class="ev-rsvp-btn${rsvp.attending ? ' attending' : ''}" data-event-id="${esc(ev.id)}">${esc(rsvp.attending ? rsvp.goingLabel : rsvp.joinLabel)}</button>
            <span class="ev-rsvp-count">${rsvp.count} ${esc(rsvp.countLabel)}</span>
            <span class="ev-attendees">${opts.attendeesHTML ? opts.attendeesHTML(ev.id) : ''}</span>
          </div>
        </div>` : ''}
    `;
  }

  window.IstEventCards = { dateParts, previewHTML, pageHTML };
})();
