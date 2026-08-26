// ══════════════════════════════════════════════════════════════════
// EVENT CARDS — the one ".event-item" template, in two sizes
//
// Pure markup, nothing else: no fetch, no click-wiring, no DOM writes.
// Anahane's own script builds it for its sidebar column and
// profile-card.js's hive code (which only ever runs inside Anahane's own
// document -- see mountHivePage) builds it again for the copy standing
// inside the petek's level 1 -- two callers, each wiring its own press
// behaviour around the same paper (the sidebar rises THE sheet, the
// petek's copy grows in place). A copy of this template in each script
// is a copy that drifts, the same reason event-interest.js is its own
// file.
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

  // The full card. opts.rsvp = { count, attending, joinLabel, goingLabel,
  // countLabel } is optional -- omit it and the RSVP row is left out
  // entirely (the petek's own grown copy does exactly that: it's about
  // the verdict, not attendance).
  function detailHTML(ev, parts, opts) {
    opts = opts || {};
    const nbLabel = ev.neighborhood
      ? ((opts.districtLabel && opts.districtLabel(ev.neighborhood)) || ev.neighborhood)
      : 'İstanbul';
    const dateTime = [parts.weekday, parts.time].filter(Boolean).join(' ');
    const metaHTML = [dateTime, ev.location].filter(Boolean).map(esc).join('<br>');
    const rsvp = opts.rsvp;
    const rsvpRow = rsvp ? `
        <div class="ev-rsvp-row">
          <button type="button" class="ev-rsvp-btn${rsvp.attending ? ' attending' : ''}" data-event-id="${esc(ev.id)}">${esc(rsvp.attending ? rsvp.goingLabel : rsvp.joinLabel)}</button>
          <span class="ev-rsvp-count">${rsvp.count} ${esc(rsvp.countLabel)}</span>
          <span class="ev-attendees">${opts.attendeesHTML ? opts.attendeesHTML(ev.id) : ''}</span>
        </div>` : '';
    return `
      <div class="event-item">
        <div class="ev-date-block">
          <div class="ev-day">${parts.day}</div>
          <div class="ev-mon">${parts.mon}</div>
        </div>
        <div class="ev-body">
          <div class="ev-kicker">${esc(nbLabel.toLocaleUpperCase('tr-TR'))}</div>
          <div class="ev-title">${esc(ev.title)}</div>
          ${metaHTML ? `<div class="ev-meta">${metaHTML}</div>` : ''}
        </div>
        <div class="ev-details">
          ${ev.description ? `<div class="ev-desc">${esc(ev.description)}</div>` : ''}
          ${rsvpRow}
        </div>
      </div>
    `;
  }

  window.IstEventCards = { dateParts, previewHTML, detailHTML };
})();
