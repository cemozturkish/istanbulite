// ══════════════════════════════════════════════════════════════
// THE FLIP BOOK — flip.js
//
// The journey between two zoom levels is a flip book: ~10 drawn steps,
// scrubbed by the finger, with every element on screen having a defined
// place at each step. Release and it runs to whichever end is nearer.
// Nothing between the two ends is live -- there is no landing and no
// clicking in there -- and that is exactly what makes it cheap.
//
// ── Why this is not the page moving ──
// The obvious reading is "animate the real page from level A to level
// B", and it is the expensive one: the two levels are different DOM,
// styled by stylesheets that cannot both be live, so the page has to be
// rebuilt somewhere in the middle of the gesture. That rebuild is a
// single ~111ms task, and a frozen main thread is what "not smooth"
// actually is.
//
// So the flip book does not move the page. It REPLACES the screen with
// a layer of its own for the length of the journey: the drawings, plus
// a handful of actors posed per step. The layer owns nothing but
// transforms and opacity, so scrubbing it costs nothing, and the real
// page underneath can be swapped while the reader is looking at step 7
// of a drawing.
//
// ── The contract with the artwork ──
// Step 0 must look like the level you are leaving and the last step
// like the one you are arriving at, because those are the two moments
// the layer hands over to a real page. Everything between is free.
// ══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  const LAYER_ID = 'ist-flip-layer';

  // ── Poses ──
  // A pose is where an actor stands at one step: x/y in px from where it
  // really sits, a scale, an opacity, and a rotation. Anything left out
  // is interpolated from the poses either side of it, so a step table
  // only has to name the moments that matter -- an actor with a pose at
  // step 0 and step 9 and nothing between simply travels evenly.
  const IDENTITY = { x: 0, y: 0, scale: 1, opacity: 1, rot: 0 };

  function lerp(a, b, t) { return a + (b - a) * t; }

  // Fill the gaps in a sparse pose list so every step has one.
  function expand(poses, steps) {
    const out = new Array(steps);
    const given = [];
    for (let i = 0; i < steps; i++) {
      if (poses[i]) {
        out[i] = Object.assign({}, IDENTITY, poses[i]);
        given.push(i);
      }
    }
    if (!given.length) { for (let i = 0; i < steps; i++) out[i] = IDENTITY; return out; }
    // Before the first and after the last: hold.
    for (let i = 0; i < given[0]; i++) out[i] = out[given[0]];
    for (let i = given[given.length - 1] + 1; i < steps; i++) out[i] = out[given[given.length - 1]];
    // Between: interpolate.
    for (let g = 0; g < given.length - 1; g++) {
      const a = given[g], b = given[g + 1];
      for (let i = a + 1; i < b; i++) {
        const t = (i - a) / (b - a);
        out[i] = {
          x: lerp(out[a].x, out[b].x, t),
          y: lerp(out[a].y, out[b].y, t),
          scale: lerp(out[a].scale, out[b].scale, t),
          opacity: lerp(out[a].opacity, out[b].opacity, t),
          rot: lerp(out[a].rot, out[b].rot, t),
        };
      }
    }
    return out;
  }

  function applyPose(node, pose) {
    node.style.transform = 'translate3d(' + pose.x + 'px,' + pose.y + 'px,0) scale(' + pose.scale + ')' +
                           (pose.rot ? ' rotate(' + pose.rot + 'deg)' : '');
    node.style.opacity = String(pose.opacity);
  }

  // ── A running journey ──
  // `def` is the step table (see steps.js). `frames` is the decoded
  // strip from map-frames.js, or null where the journey has no drawings
  // yet -- the actors still work, which is what makes a half-drawn
  // journey worth looking at.
  function start(def, frames) {
    const steps = def.steps;
    const layer = document.createElement('div');
    layer.id = LAYER_ID;
    layer.setAttribute('aria-hidden', 'true');

    // The drawings.
    let strip = null;
    if (frames && frames.length) {
      strip = document.createElement('div');
      strip.className = 'ist-flip-frames';
      frames.forEach(img => { img.style.opacity = '0'; strip.appendChild(img); });
      layer.appendChild(strip);
    }

    // The actors. Each is lifted from the page it belongs to -- a clone,
    // so nothing the reader can still see is disturbed -- and parked at
    // the exact box it really occupies, so step 0 lines up with the page
    // underneath by construction rather than by anyone's arithmetic.
    const cast = [];
    (def.actors || []).forEach(a => {
      const src = document.querySelector(a.from);
      if (!src) return;                       // not on this page: skip, quietly
      const box = src.getBoundingClientRect();
      if (box.width < 1 && box.height < 1) return;
      const holder = document.createElement('div');
      holder.className = 'ist-flip-actor';
      holder.style.left = box.left + 'px';
      holder.style.top = box.top + 'px';
      holder.style.width = box.width + 'px';
      holder.style.height = box.height + 'px';
      const clone = src.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      clone.style.margin = '0';
      holder.appendChild(clone);
      layer.appendChild(holder);
      cast.push({ node: holder, poses: expand(a.poses || {}, steps), hide: src });
    });

    document.body.appendChild(layer);
    // Everything the layer is standing in for goes quiet. Not display:
    // none -- these are the real page and it must not re-layout while
    // the reader is mid-gesture.
    cast.forEach(c => { c.hide.style.visibility = 'hidden'; });
    const map = document.querySelector('.map-panel');
    if (map) map.style.visibility = 'hidden';

    let shown = -1;
    const session = {
      steps,
      // p is 0..1 along the journey. The frame is whole-numbered -- a
      // flip book flips, it does not dissolve -- while the actors move
      // continuously between their poses, so type never lands on a
      // half-pixel and shimmer.
      paint(p) {
        p = Math.max(0, Math.min(1, p));
        const at = p * (steps - 1);
        const i = Math.round(at);
        if (frames && frames.length && i !== shown) {
          if (shown >= 0) frames[Math.min(shown, frames.length - 1)].style.opacity = '0';
          frames[Math.min(i, frames.length - 1)].style.opacity = '1';
          shown = i;
        }
        const lo = Math.floor(at), hi = Math.min(steps - 1, lo + 1), t = at - lo;
        cast.forEach(c => {
          const a = c.poses[lo], b = c.poses[hi];
          applyPose(c.node, {
            x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t),
            scale: lerp(a.scale, b.scale, t),
            opacity: lerp(a.opacity, b.opacity, t),
            rot: lerp(a.rot, b.rot, t),
          });
        });
      },
      // Run to an end at a steady rate and resolve there. There is no
      // stopping in between, so this only ever aims at 0 or 1.
      run(from, to, ms) {
        return new Promise(resolve => {
          const t0 = performance.now();
          const span = Math.max(1, ms);
          (function step(now) {
            const a = Math.min(1, (now - t0) / span);
            // ease-out: the flip book is being let go of, not thrown
            session.paint(from + (to - from) * (1 - Math.pow(1 - a, 3)));
            if (a < 1) requestAnimationFrame(step);
            else resolve();
          })(t0);
        });
      },
      // Put the page back and take the layer off. Deliberately two
      // steps: whoever calls this decides when the real page is ready
      // to be seen, and until then the last drawing is still standing.
      reveal() {
        cast.forEach(c => { c.hide.style.visibility = ''; });
        if (map) map.style.visibility = '';
      },
      end() {
        session.reveal();
        if (layer.parentNode) layer.parentNode.removeChild(layer);
        if (strip) frames.forEach(img => { img.style.opacity = '0'; });
      },
      fade(ms) {
        layer.style.transition = 'opacity ' + ms + 'ms linear';
        layer.style.opacity = '0';
        setTimeout(session.end, ms + 40);
      },
    };
    session.paint(0);
    return session;
  }

  global.IstFlip = { start, expand };
})(window);
