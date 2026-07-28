// Shared TBMM (Türkiye Büyük Millet Meclisi) hemicycle geometry + SVG
// rendering — the 600-seat arc chart shown on Kütüphane's TBMM page and
// edited from admin.html's TBMM tab. Both pages must agree on exactly
// which seat_number sits where, so the geometry lives here once instead
// of being computed twice and risking drift (see avatar.js for the same
// pattern with the illustrated avatar system).
//
// Deliberately tiny and dependency-free (no Supabase, no i18n) — callers
// fetch public.tbmm_seats themselves and pass the result in.
(function (global) {
  const TOTAL_SEATS = 600;
  const ROWS = 10;
  const R_MIN = 80;
  const R_MAX = 480;
  const CENTER_X = 500;
  const CENTER_Y = 500;
  const ANGLE_START = 180; // degrees — left end of the arc
  const ANGLE_END = 0;     // degrees — right end of the arc
  const VIEWBOX = '0 0 1000 520';
  const DOT_RADIUS = 7;
  const EMPTY_COLOR = '#d9d3c9';

  // Row radii evenly spaced between R_MIN and R_MAX, seats per row
  // weighted by radius (a wider arc fits more evenly-spaced dots),
  // rounded to whole seats via largest-remainder so the total is exactly
  // TOTAL_SEATS regardless of rounding. Computed once and cached — this
  // is pure geometry, never changes at runtime.
  let _cachedSeats = null;

  function seatPositions() {
    if (_cachedSeats) return _cachedSeats;

    const radii = [];
    for (let i = 0; i < ROWS; i++) {
      radii.push(R_MIN + (i * (R_MAX - R_MIN)) / (ROWS - 1));
    }
    const radiusSum = radii.reduce((a, b) => a + b, 0);
    const rawCounts = radii.map(r => (r / radiusSum) * TOTAL_SEATS);
    const counts = rawCounts.map(Math.floor);
    let remainder = TOTAL_SEATS - counts.reduce((a, b) => a + b, 0);
    rawCounts
      .map((v, i) => ({ i, frac: v - counts[i] }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, remainder)
      .forEach(({ i }) => { counts[i]++; });

    const seats = [];
    let seatNumber = 1;
    for (let row = 0; row < ROWS; row++) {
      const n = counts[row];
      const r = radii[row];
      for (let j = 0; j < n; j++) {
        const t = n === 1 ? 0.5 : j / (n - 1);
        const angleDeg = ANGLE_START + t * (ANGLE_END - ANGLE_START);
        const angleRad = angleDeg * Math.PI / 180;
        seats.push({
          seatNumber: seatNumber++,
          row,
          cx: CENTER_X + r * Math.cos(angleRad),
          cy: CENTER_Y - r * Math.sin(angleRad),
        });
      }
    }
    _cachedSeats = seats;
    return seats;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Renders the full 600-seat chart as an inline SVG string.
  // `byId`: seat_number -> row from public.tbmm_seats (with an optional
  // embedded `politicians` object), or omitted for an all-empty chart.
  // Every seat renders regardless of whether it has data — an unfilled
  // seat just shows in EMPTY_COLOR.
  function renderSVG(byId) {
    const seats = seatPositions();
    const circles = seats.map(s => {
      const row = byId && byId[s.seatNumber];
      const fill = (row && row.color) || EMPTY_COLOR;
      return `<circle class="tbmm-seat" data-seat-number="${s.seatNumber}" cx="${s.cx.toFixed(2)}" cy="${s.cy.toFixed(2)}" r="${DOT_RADIUS}" fill="${esc(fill)}"></circle>`;
    }).join('');
    return `<svg viewBox="${VIEWBOX}" class="tbmm-svg" preserveAspectRatio="xMidYMid meet">${circles}</svg>`;
  }

  global.IstTBMM = { TOTAL_SEATS, ROWS, seatPositions, renderSVG, EMPTY_COLOR };
})(window);
