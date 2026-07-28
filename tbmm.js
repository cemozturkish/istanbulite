// Shared TBMM (Türkiye Büyük Millet Meclisi) hemicycle geometry + SVG
// rendering — the 600-seat arc chart shown on Kütüphane's TBMM page and
// edited from admin.html's TBMM tab. Both pages must agree on exactly
// which seat_number sits where, so the geometry lives here once instead
// of being computed twice and risking drift (see avatar.js for the same
// pattern with the illustrated avatar system).
//
// Each seat renders as a wedge cell (bounded by two radii and two angles),
// not a dot — a whole row is one ring divided into that row's own seat
// count of equal angular slices, so the chart reads as a proper radial
// grid (thin lines between every seat, a bold outer silhouette) rather
// than a field of separate circles.
//
// Deliberately tiny and dependency-free (no Supabase, no i18n) — callers
// fetch public.tbmm_seats themselves and pass the result in.
(function (global) {
  const TOTAL_SEATS = 600;
  const ROWS = 10;
  const R_MIN = 60;  // inner edge of the innermost ring
  const R_MAX = 500; // outer edge of the outermost ring
  const CENTER_X = 500;
  const CENTER_Y = 500;
  const ANGLE_START = 180; // degrees — left end of the arc
  const ANGLE_END = 0;     // degrees — right end of the arc
  const VIEWBOX = '0 0 1000 520';
  const EMPTY_COLOR = '#d9d3c9';

  // Ring boundaries (ROWS+1 radii) evenly spaced between R_MIN and R_MAX.
  // Seats per row are weighted by each ring's midpoint radius (a wider
  // ring fits more evenly-sized cells), rounded to whole seats via
  // largest-remainder so the total is exactly TOTAL_SEATS. Computed once
  // and cached — this is pure geometry, never changes at runtime.
  //
  // seat_number order sweeps left to right by each cell's center angle
  // across all rings together — real parliament diagrams number seats
  // this way so a contiguous seat_number range reads as a radial wedge
  // (one party's block cutting across every ring), matching how party
  // blocks actually look in a hemicycle chart. Numbering row by row
  // instead would make a "range" fill whole rings before moving to the
  // next one, which looks like concentric bands, not real wedges.
  let _cachedSeats = null;

  function point(r, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    return { x: CENTER_X + r * Math.cos(rad), y: CENTER_Y - r * Math.sin(rad) };
  }

  function seatPositions() {
    if (_cachedSeats) return _cachedSeats;

    const ringBounds = [];
    for (let i = 0; i <= ROWS; i++) {
      ringBounds.push(R_MIN + (i * (R_MAX - R_MIN)) / ROWS);
    }
    const midRadii = [];
    for (let i = 0; i < ROWS; i++) midRadii.push((ringBounds[i] + ringBounds[i + 1]) / 2);
    const radiusSum = midRadii.reduce((a, b) => a + b, 0);
    const rawCounts = midRadii.map(r => (r / radiusSum) * TOTAL_SEATS);
    const counts = rawCounts.map(Math.floor);
    let remainder = TOTAL_SEATS - counts.reduce((a, b) => a + b, 0);
    rawCounts
      .map((v, i) => ({ i, frac: v - counts[i] }))
      .sort((a, b) => b.frac - a.frac)
      .slice(0, remainder)
      .forEach(({ i }) => { counts[i]++; });

    const raw = [];
    for (let row = 0; row < ROWS; row++) {
      const n = counts[row];
      const rIn = ringBounds[row];
      const rOut = ringBounds[row + 1];
      const sliceWidth = (ANGLE_START - ANGLE_END) / n;
      for (let j = 0; j < n; j++) {
        const angleLeft = ANGLE_START - j * sliceWidth;
        const angleRight = ANGLE_START - (j + 1) * sliceWidth;
        const centerAngle = (angleLeft + angleRight) / 2;
        const p1 = point(rIn, angleLeft);   // inner-left
        const p2 = point(rOut, angleLeft);  // outer-left
        const p3 = point(rOut, angleRight); // outer-right
        const p4 = point(rIn, angleRight);  // inner-right
        const path = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} `
          + `L ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} `
          + `A ${rOut.toFixed(2)} ${rOut.toFixed(2)} 0 0 1 ${p3.x.toFixed(2)} ${p3.y.toFixed(2)} `
          + `L ${p4.x.toFixed(2)} ${p4.y.toFixed(2)} `
          + `A ${rIn.toFixed(2)} ${rIn.toFixed(2)} 0 0 0 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Z`;
        raw.push({ row, angleDeg: centerAngle, path });
      }
    }
    // Descending center-angle (180° down to 0°) = left to right. Distinct
    // rows almost never land on the exact same center angle (each row has
    // its own slice width), but break any tie innermost-ring-first anyway.
    raw.sort((a, b) => (b.angleDeg - a.angleDeg) || (a.row - b.row));

    const seats = raw.map((s, i) => ({ seatNumber: i + 1, row: s.row, path: s.path }));
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
    const cells = seats.map(s => {
      const row = byId && byId[s.seatNumber];
      const fill = (row && row.color) || EMPTY_COLOR;
      return `<path class="tbmm-seat" data-seat-number="${s.seatNumber}" d="${s.path}" fill="${esc(fill)}"></path>`;
    }).join('');
    return `<svg viewBox="${VIEWBOX}" class="tbmm-svg" preserveAspectRatio="xMidYMid meet">${cells}</svg>`;
  }

  global.IstTBMM = { TOTAL_SEATS, ROWS, seatPositions, renderSVG, EMPTY_COLOR };
})(window);
