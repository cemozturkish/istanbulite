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

  // overlay element -> its pull controller (see pull() below), so a page
  // never has to remember to reset/measure/release around its own opens.
  const pulls = new WeakMap();

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
    const p = pulls.get(overlay);
    // A fresh open starts flat, whatever the last gesture left behind.
    if (p) p.reset();
    overlay.hidden = false;
    requestAnimationFrame(() => {
      overlay.classList.add('open');
      // Measured now that the content is laid out and the sheet's real
      // height is resolvable.
      if (p) p.measure();
    });
  }

  // `after` runs once the sheet is off-screen — for whatever the page
  // wants torn down only after it stops being visible (an iframe's src,
  // say), never mid-slide.
  function close(target, after) {
    const overlay = el(target);
    if (!overlay) return;
    // Hands the sheet back to its CSS transition from wherever the pull
    // left it, so it slides down from there instead of jumping first.
    const p = pulls.get(overlay);
    if (p) p.release();
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

  // ══════════════════════════════════════════════════════════════════
  // THE PULL — a sheet opened over the map on a phone
  //
  // It rests half-way down, under the map, so you can still see where
  // you tapped. Drag it up and it rises to the profile card and stops
  // there; keep dragging and the reading continues inside it. Drag it
  // back down past its resting point and it closes. See the
  // .ist-sheet-pull block in sheet.css for the geometry this drives.
  //
  // Touch phones only (`pointer: coarse`): a narrow desktop window is
  // ≤768px too, and there the sheet stays an ordinary sheet, since a
  // finger is the only thing that can move a layout laid out this way.
  //
  // Where the extra pull goes once the sheet is fully raised depends on
  // what's inside it. A page rendered straight into the sheet (an
  // article, the meclis) scrolls it programmatically. A page with its
  // own scrolling region and pinned chrome (the reader's action bar)
  // hands the gesture over to that region natively, so its bar stays
  // put — see scrollerUnder().
  // ══════════════════════════════════════════════════════════════════
  const DISMISS_PX = 70;    // pull-down past the rest point that closes the sheet
  const DISMISS_VEL = 0.6;  // ...or a downward flick this fast (px/ms)
  const RUBBER = 0.5;       // resistance on a pull below the rest point
  const SNAP_AT = 0.35;     // fraction of the rise that settles upward on release
  const FRICTION = 0.93;    // momentum decay per 16ms frame
  const STOP_VEL = 0.08;    // momentum below this (px/ms) is a crawl — settle instead

  // The sheet's ceiling: the profile card's real bottom edge plus the
  // frame gap, measured rather than assumed so it stays right whatever
  // the card ends up containing (badges, longer names, notch insets).
  function topClamp() {
    const padVal = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--frame-pad'));
    const pad = isNaN(padVal) ? 10 : padVal;
    const card = document.getElementById('ist-pc-mount');
    const bottom = card && card.offsetHeight ? card.getBoundingClientRect().bottom : pad + 60;
    return Math.max(pad, bottom + pad);
  }

  // The scrolling region the touch started in, if the sheet's content
  // brought its own (rather than being scrolled as one page). Stops at
  // the sheet: the sheet's own scroll belongs to the gesture.
  function scrollerUnder(node, sheet) {
    let el = node;
    while (el && el !== sheet && el.nodeType === 1) {
      const ov = getComputedStyle(el).overflowY;
      if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight - el.clientHeight > 1) return el;
      el = el.parentElement;
    }
    return null;
  }

  // Adds the gesture to a sheet. `onDismiss` is called when the sheet is
  // pulled down past its resting point — the page closes it however it
  // closes it. Returns { measure, reset, release } for the page to call
  // around its own open/close, or null off this layout.
  function pull(target, opts) {
    const overlay = el(target);
    if (!overlay) return null;
    const sheet = overlay.querySelector('.ist-sheet');
    if (!sheet) return null;
    const onDismiss = (opts && opts.onDismiss) || (() => close(overlay));
    const mobile = global.matchMedia('(max-width: 768px) and (pointer: coarse)');

    let pos = 0, maxRise = 0, maxScroll = 0, maxPos = 0;
    let dragging = false, handedOver = null;
    let startY = 0, startPos = 0, lastY = 0, lastT = 0, vel = 0, raf = 0;

    function measure() {
      // isConnected: a virtual navigation (router.js) can swap in fresh
      // markup, leaving an old instance pointed at a detached sheet.
      if (!mobile.matches || overlay.hidden || !overlay.isConnected) { maxRise = maxScroll = maxPos = 0; return; }
      const clamp = topClamp();
      // Feeds the sheet's height too (height: 100% - clamp), which is what
      // keeps its bottom edge off-screen at rest and exactly on the bottom
      // edge once fully raised.
      overlay.style.setProperty('--ist-sheet-clamp', clamp + 'px');
      // A sheet already pulled up to the clamp stays pulled up to the NEW
      // clamp (rotation, a taller profile card), keeping whatever it had
      // scrolled; anything else is clamped into the new range. Both are
      // read against the OLD limits, so this straddles the recompute.
      const wasRaised = maxPos > 0 && pos >= maxRise;
      const wasScrolled = Math.max(0, pos - maxRise);
      maxRise = Math.max(0, sheet.offsetTop - clamp);
      maxScroll = Math.max(0, sheet.scrollHeight - sheet.clientHeight);
      maxPos = maxRise + maxScroll;
      pos = wasRaised ? maxRise + Math.min(wasScrolled, maxScroll) : Math.min(pos, maxPos);
      // Re-apply: the rise the old numbers produced is stale even when pos
      // itself still fits. Skipped only for the untouched just-opened
      // sheet, whose slide-up is CSS's to run.
      if (pos !== 0 || sheet.style.transform) render();
    }

    function render() {
      let y;
      if (pos >= 0) {
        y = -Math.min(pos, maxRise);
        sheet.scrollTop = Math.min(Math.max(pos - maxRise, 0), maxScroll);
      } else {
        y = -pos * RUBBER;
        sheet.scrollTop = 0;
      }
      sheet.style.transform = 'translateY(' + y + 'px)';
    }

    function stopAnim() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    // Hands the sheet back to CSS once it's stopped moving, so a close
    // slides from wherever it ended up.
    function finish() {
      raf = 0;
      sheet.style.transition = '';
      if (pos === 0) sheet.style.transform = '';
    }

    // Release: coast on the flick's own momentum, then settle. A sheet
    // left half-raised lands on one of its two rest points (down, or
    // parked at the clamp); past the clamp it's ordinary content scroll,
    // so it stays wherever it stopped.
    function settle() {
      stopAnim();
      let last = performance.now();
      const step = (now) => {
        const dt = Math.min(34, Math.max(1, now - last));
        last = now;
        if (Math.abs(vel) > STOP_VEL) {
          pos += vel * dt;
          vel *= Math.pow(FRICTION, dt / 16);
          if (pos <= 0) { pos = 0; vel = 0; }
          else if (pos >= maxPos) { pos = maxPos; vel = 0; }
          render();
          raf = requestAnimationFrame(step);
          return;
        }
        vel = 0;
        const target = pos >= maxRise ? pos : (pos > maxRise * SNAP_AT ? maxRise : 0);
        const gap = target - pos;
        if (Math.abs(gap) < 0.5) { pos = target; render(); finish(); return; }
        pos += gap * Math.min(1, dt / 90);
        render();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    sheet.addEventListener('touchstart', (e) => {
      if (!mobile.matches || e.touches.length !== 1) return;
      stopAnim();
      // Re-measured per gesture: an accordion opening, late images and
      // rotation all change how much paper there is to pull.
      measure();
      dragging = true;
      handedOver = scrollerUnder(e.target, sheet);
      startPos = pos;
      startY = lastY = e.touches[0].clientY;
      lastT = e.timeStamp || performance.now();
      vel = 0;
      sheet.style.transition = 'none';
    }, { passive: true });

    sheet.addEventListener('touchmove', (e) => {
      if (!dragging || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      // Content with its own scroller takes the gesture once the sheet is
      // as high as it goes — except when it's scrolled to its top and the
      // pull is downward, which is the sheet coming back down.
      if (handedOver && pos >= maxRise - 0.5) {
        const pullingDown = y > startY;
        if (!(pullingDown && handedOver.scrollTop <= 0)) return;
      }
      const now = e.timeStamp || performance.now();
      const dt = now - lastT;
      // Weighted toward the newest sample so a flick's final speed wins
      // over the slow start of the same drag.
      if (dt > 0) vel = 0.7 * ((lastY - y) / dt) + 0.3 * vel;
      lastY = y;
      lastT = now;
      // Hard stop at the top — nothing left to give once the sheet is at
      // the clamp and its content is scrolled through.
      pos = Math.min(startPos + (startY - y), maxPos);
      render();
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    const end = () => {
      if (!dragging) return;
      dragging = false;
      handedOver = null;
      if (pos < 0 && (pos < -DISMISS_PX || vel < -DISMISS_VEL)) { onDismiss(); return; }
      settle();
    };
    sheet.addEventListener('touchend', end);
    sheet.addEventListener('touchcancel', end);

    // A device can report pointer:coarse and still have a trackpad or a
    // keyboard attached (an iPad with a Magic Keyboard is the obvious
    // one). Those land on this layout, where the sheet is not a native
    // scroller, so wheel and key input drive the very same pull. Both
    // jump straight to their new position: only a finger gets momentum.
    let inputIdle = 0;
    function nudge(delta) {
      stopAnim();
      measure();
      if (maxPos <= 0 && pos === 0) return false;
      vel = 0;
      pos = Math.min(Math.max(pos + delta, 0), maxPos);
      sheet.style.transition = 'none';
      render();
      // Back under CSS control once the wheel/keys go quiet, so a close
      // still slides instead of cutting.
      clearTimeout(inputIdle);
      inputIdle = setTimeout(finish, 160);
      return true;
    }

    sheet.addEventListener('wheel', (e) => {
      if (!mobile.matches || dragging) return;
      if (scrollerUnder(e.target, sheet)) return;
      // deltaMode: 0 px, 1 lines, 2 pages.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sheet.clientHeight : 1;
      if (nudge(e.deltaY * unit) && e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (!mobile.matches || dragging || overlay.hidden || !overlay.isConnected) return;
      if (!overlay.classList.contains('open')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
      // Page-sized steps off the sheet's own height; End/Home just overshoot
      // and let nudge() clamp, so they don't need the limits measured first.
      const page = Math.max(120, sheet.clientHeight * 0.85);
      let delta;
      if (e.key === 'ArrowDown') delta = 60;
      else if (e.key === 'ArrowUp') delta = -60;
      else if (e.key === 'PageDown') delta = page;
      else if (e.key === 'PageUp') delta = -page;
      else if (e.key === 'End') delta = 1e9;
      else if (e.key === 'Home') delta = -1e9;
      else return;
      if (nudge(delta)) e.preventDefault();
    });

    // overflow:hidden boxes are still scrollable programmatically, and the
    // browser does exactly that when focus lands on something below the
    // fold (tabbing through links with a keyboard attached). Left alone it
    // would scroll the sheet out from under `pos`: pin the overlay, and
    // take the sheet's own scroll as truth when it moves on its own.
    overlay.addEventListener('scroll', () => {
      if (mobile.matches && overlay.scrollTop) overlay.scrollTop = 0;
    });
    sheet.addEventListener('scroll', () => {
      if (!mobile.matches || dragging || raf) return;
      const ours = Math.min(Math.max(pos - maxRise, 0), maxScroll);
      if (Math.abs(sheet.scrollTop - ours) > 1) pos = maxRise + sheet.scrollTop;
    });

    function reset() {
      stopAnim();
      clearTimeout(inputIdle);
      dragging = false; handedOver = null; pos = 0; vel = 0;
      sheet.style.transition = '';
      sheet.style.transform = '';
      sheet.scrollTop = 0;
    }

    global.addEventListener('resize', () => { if (!overlay.hidden) measure(); });
    // Gaining/losing a fine pointer swaps the whole layout out from under
    // the sheet — drop anything this handler applied so the ordinary rules
    // (and native scrolling) take over cleanly.
    mobile.addEventListener('change', () => {
      reset();
      if (!overlay.hidden) measure();
    });

    const controller = {
      measure,
      // A fresh open starts flat: sheet at its resting top, content
      // unscrolled, CSS back in charge of the slide-up.
      reset,
      // Closing: drop the inline transform in the same tick the .open
      // class goes away, so the CSS transition interpolates from where
      // the pull left the sheet down to off-screen.
      release: reset,
    };
    pulls.set(overlay, controller);
    return controller;
  }

  global.IstSheet = { open, close, position, isOpen, pull, SLIDE_MS };
}(window));
