// ══════════════════════════════════════════════════════════════════
// sheet.js — the JS half of THE sheet (see sheet.css).
//
// Opening a sheet is three steps, always the same three: put it where
// it rests, unhide it, then add .open on the next frame so the slide
// animates from off-screen. Closing is two: drop .open, and re-hide it
// once the 0.55s slide has finished. Every page used to spell those out
// again — one copy per sheet, five copies of the same resting-point
// measurement — and they drifted.
//
// The resting point is the only part with any thinking in it: on phones
// a sheet stops under whatever the page keeps pinned at the top (the
// compact profile card, #ist-pc-mount), and that card's height depends
// on the member's name and district, so it is measured live rather than
// written down as a number. On desktop there is nothing to clear: the
// sheet is anchored to the bottom of the window and the variable is
// cleared so sheet.css's own geometry applies.
// ══════════════════════════════════════════════════════════════════
(function (global) {
  // Matches .ist-sheet's 0.55s transition in sheet.css.
  const SLIDE_MS = 550;

  function el(target) {
    return typeof target === 'string' ? document.getElementById(target) : target;
  }

  // Sets --ist-sheet-top, which sheet.css's phone rules read.
  function position(target) {
    const overlay = el(target);
    if (!overlay) return;
    if (!global.matchMedia('(max-width: 768px)').matches) {
      overlay.style.removeProperty('--ist-sheet-top');
      return;
    }
    const framePad = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-pad')) || 10;
    const card = document.getElementById('ist-pc-mount');
    const cardBottom = card ? card.getBoundingClientRect().bottom : 0;
    overlay.style.setProperty('--ist-sheet-top', `${Math.max(cardBottom, 0) + framePad}px`);
  }

  function open(target) {
    const overlay = el(target);
    if (!overlay) return;
    position(overlay);
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  // `after` runs once the sheet is off-screen — for whatever the page
  // wants torn down only after it stops being visible (an iframe's src,
  // say), never mid-slide.
  function close(target, after) {
    const overlay = el(target);
    if (!overlay) return;
    overlay.classList.remove('open');
    setTimeout(() => {
      overlay.hidden = true;
      if (after) after();
    }, SLIDE_MS);
  }

  function isOpen(target) {
    const overlay = el(target);
    return !!overlay && overlay.classList.contains('open');
  }

  // Keeps every open sheet's resting point correct across rotation and
  // window resizes — registered once here rather than per sheet.
  global.addEventListener('resize', () => {
    document.querySelectorAll('.ist-sheet-overlay.open').forEach(position);
  });

  global.IstSheet = { open, close, position, isOpen, SLIDE_MS };
}(window));
