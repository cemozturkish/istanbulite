/* ══════════════════════════════════════════════════════════════
   THE SEA IS PAINTED — sea-brush.js
   On the layered home (project.html, HOME_LAYERS) the water behind the
   vector map is not a flat --map-sea any more: it is covered edge to edge
   with small brush strokes in the sea's own tones, drifting slowly. The
   ground under the whole petek (the logo's wash) is painted the same way,
   in its own --hive-bg.

   - Every tone is the sea moved a little toward something already on the
     map (the land, the 3D edge, the light), read off the box's own
     --map-* tokens, so it follows the palette, the sun and the admin's
     overrides with no colour of its own. The spread is kept small on
     purpose: the strokes should read as one surface, not a patchwork.
   - A stroke is painted ONCE, bristle by bristle (a loaded brush that
     lands, drags along a slight curve and runs dry at the tail), into a
     small sprite; a pool of them is reused all over the screen, so a frame
     is only copies.
   - It moves at 20 frames a second, which is plenty for water this slow,
     and stops whenever it cannot be seen (a game, a page or a sheet over
     it, the app in the background). A phone that cannot draw a frame in
     time, and a reader who asked for reduced motion, get the painting
     standing still.
   - `?deniz=0` turns it off (remembered), `?deniz=1` back on: the same
     pocket A/B map-ink.js carries, for the engine we cannot measure here.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const KILL_KEY = 'ist_sea_brush_off';
  try {
    const q = new URLSearchParams(location.search).get('deniz');
    if (q === '0') localStorage.setItem(KILL_KEY, '1');
    if (q === '1') localStorage.removeItem(KILL_KEY);
  } catch (e) {}
  const killed = () => { try { return localStorage.getItem(KILL_KEY) === '1'; } catch (e) { return false; } };

  // The fine brush: short strokes, laid close in overlapping rows.
  const B = { len: [26, 44], th: [7, 11], bow: 0.14, stepX: 21, stepY: 6, tilt: 0.32 };
  const FRAME_MS = 50;            // 20 fps
  const DRIFT = 9;                // px per second, sideways
  const SLOW_MS = 16;             // a frame slower than this (median) -> stand still
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  const hex = (s) => {
    s = String(s || '').trim();
    const m = s.match(/^rgba?\(([^)]+)\)/);
    if (m) return m[1].split(',').slice(0, 3).map((v) => Math.round(parseFloat(v)));
    s = s.replace('#', '');
    if (s.length === 3) s = s.replace(/./g, (c) => c + c);
    const n = parseInt(s, 16);
    return isNaN(n) ? null : [n >> 16 & 255, n >> 8 & 255, n & 255];
  };
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')';
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => {
    let r = Math.random() * list.reduce((s, x) => s + x[1], 0);
    for (const x of list) { if ((r -= x[1]) <= 0) return x[0]; }
    return list[0][0];
  };

  // ONE brush stroke: lands narrow, opens up, narrows a little at the lift;
  // every bristle leaves its own line, heavy where the brush lands and
  // breaking up into dry streaks where it runs out of paint.
  function paintStroke(len, th, bow, col) {
    const pad = th + 4, h = th * 2 + Math.abs(bow) * len + pad;
    const c = document.createElement('canvas');
    c.width = Math.ceil((len + pad * 2) * DPR); c.height = Math.ceil(h * DPR);
    const g = c.getContext('2d');
    g.scale(DPR, DPR); g.lineCap = 'round'; g.lineJoin = 'round';
    const cy = h / 2, x0 = pad, bend = bow * len * (Math.random() < 0.5 ? -1 : 1);
    const spine = (u) => [x0 + u * len, cy - bend * 4 * u * (1 - u)];
    const norm = (u) => { const dy = -bend * 4 * (1 - 2 * u), m = Math.hypot(len, dy); return [-dy / m, len / m]; };
    const width = (u) => th * (u < 0.15 ? 0.55 + 3 * u : u > 0.85 ? 1 - (u - 0.85) * 2 : 1);
    // A soft underpaint, so the bristles sit on paint rather than on nothing.
    g.fillStyle = rgba(col, 0.55);
    g.beginPath();
    for (let i = 0; i <= 20; i++) { const u = i / 20, p = spine(u), nn = norm(u), w = width(u) * 0.42; g.lineTo(p[0] + nn[0] * w, p[1] + nn[1] * w); }
    for (let i = 20; i >= 0; i--) { const u = i / 20, p = spine(u), nn = norm(u), w = width(u) * 0.42; g.lineTo(p[0] - nn[0] * w, p[1] - nn[1] * w); }
    g.fill();
    const n = Math.round(th * 2.4);
    for (let k = 0; k < n; k++) {
      const f = (k / (n - 1) - 0.5) + rnd(-0.03, 0.03);
      const load = rnd(0.55, 1), runOut = rnd(0.55, 1.05), shade = rnd(-0.035, 0.035);
      const bc = shade > 0 ? mix(col, [255, 255, 255], shade) : mix(col, [0, 0, 0], -shade);
      g.lineWidth = rnd(0.7, 1.7);
      const start = Math.abs(f) * rnd(0, 0.12);
      let prev = null;
      for (let i = 0; i <= 24; i++) {
        const u = start + (i / 24) * (1 - start - rnd(0, 0.05));
        const p0 = spine(u), nn = norm(u), w = width(u);
        const p = [p0[0] + nn[0] * f * w, p0[1] + nn[1] * f * w];
        const a = load * (u < runOut ? 1 - u * 0.35 : Math.random() < 0.4 ? 0.35 : 0);
        if (prev && a > 0.02) {
          g.strokeStyle = rgba(bc, Math.min(1, a));
          g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(p[0], p[1]); g.stroke();
        }
        prev = p;
      }
    }
    return { img: c, w: c.width / DPR, h: c.height / DPR, ox: x0, oy: cy };
  }

  // Which way the water leans at (x, y): a slow swell travelling across.
  const flow = (x, y, t) => B.tilt * (Math.sin(x / 70 + y / 110 - t * 0.6) * 0.6 + Math.sin(y / 45 - x / 160 + t * 0.4) * 0.4);

  // One painted surface: a canvas filling `host`, its tones read off three
  // tokens on `tokenEl`, animating only while `active()` says it is seen.
  function tokens(el, keys) {
    const st = getComputedStyle(el);
    const sea = hex(st.getPropertyValue(keys.base)) || hex(st.backgroundColor);
    if (!sea) return null;
    const land = hex(st.getPropertyValue(keys.light)) || sea;
    const edge = hex(st.getPropertyValue(keys.dark)) || mix(sea, [0, 0, 0], 0.4);
    return { sea, land, edge, key: sea.join() + '|' + land.join() + '|' + edge.join() };
  }

  function Surface(host, tokenEl, keys, active) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fb-sea';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const S = { host, tokenEl, keys, active, canvas, ctx: canvas.getContext('2d'), W: 0, H: 0,
      strokes: [], base: [0, 0, 0], key: '', t: 0, last: 0, checked: 0, raf: 0,
      still: !!reduce, covered: false, slow: [] };

    function build() {
      const tk = tokens(S.tokenEl, S.keys);
      const W = S.host.clientWidth, H = S.host.clientHeight;
      if (!tk || !W || !H) return;
      S.key = tk.key; S.W = W; S.H = H;
      S.canvas.width = Math.round(W * DPR); S.canvas.height = Math.round(H * DPR);
      const sea = tk.sea, white = [255, 255, 255];
      S.base = mix(sea, tk.edge, 0.03);
      const T = [
        [sea, 4], [mix(sea, white, 0.05), 3], [mix(sea, tk.land, 0.2), 2],
        [mix(sea, tk.edge, 0.06), 3], [mix(sea, tk.edge, 0.11), 1.2], [mix(sea, white, 0.1), 0.9],
      ];
      const pool = [];
      for (let i = 0; i < 90; i++) pool.push(paintStroke(rnd(B.len[0], B.len[1]), rnd(B.th[0], B.th[1]), B.bow * rnd(0.3, 1), pick(T)));
      // Laid brick-wise on a jittered grid, each row overlapping the last,
      // so no paper shows between them.
      const strokes = [];
      for (let y = -12, row = 0; y < H + 12; y += B.stepY, row++) {
        for (let x = -60 + (row % 2) * B.stepX / 2 + rnd(-6, 6); x < W + 30; x += B.stepX * rnd(0.8, 1.15)) {
          strokes.push({ s: pool[(Math.random() * pool.length) | 0], x: x + rnd(-4, 4), y: y + rnd(-2, 2), flip: Math.random() < 0.5 });
        }
      }
      strokes.sort(() => Math.random() - 0.5);
      S.strokes = strokes;
      S.slow = [];
      draw();
    }

    function draw() {
      const { ctx, W, H, strokes } = S;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = rgba(S.base, 1);
      ctx.fillRect(0, 0, W, H);
      const span = W + 90, drift = (S.t * DRIFT) % span, t = S.t;
      for (let i = 0; i < strokes.length; i++) {
        const k = strokes[i];
        let x = k.x + drift; if (x > W + 30) x -= span;
        const a = flow(x, k.y, t), ca = Math.cos(a) * DPR, sa = Math.sin(a) * DPR;
        ctx.setTransform(ca, sa, -sa, ca, x * DPR, (k.y + Math.sin(t * 0.8 + x / 60) * 1.2) * DPR);
        if (k.flip) ctx.scale(-1, 1);
        ctx.drawImage(k.s.img, -k.s.ox, -k.s.oy, k.s.w, k.s.h);
      }
    }

    function tick(now) {
      S.raf = requestAnimationFrame(tick);
      if (now - S.last < FRAME_MS) return;
      const dt = S.last ? Math.min(0.2, (now - S.last) / 1000) : 0;
      S.last = now;
      // Once a second: did the palette move (the sun, a palette switch, the
      // admin's preview)? Did the box change size? Then repaint the pool.
      if (now - S.checked > 1000) {
        S.checked = now;
        const tk = tokens(S.tokenEl, S.keys);
        if (tk && (tk.key !== S.key || S.host.clientWidth !== S.W || S.host.clientHeight !== S.H)) { build(); return; }
      }
      // Cheap, so asked every frame: a surface that has just come into view
      // must not wait up to a second to start moving.
      S.covered = document.hidden || !S.active();
      if (S.still || S.covered) return;
      S.t += dt;
      const t0 = performance.now();
      draw();
      // The first frames decide whether this phone can afford the motion.
      if (S.slow && S.slow.length < 24) {
        S.slow.push(performance.now() - t0);
        if (S.slow.length === 24) {
          const m = S.slow.slice().sort((a, b) => a - b)[12];
          if (m > SLOW_MS) S.still = true;
          S.slow = null;
        }
      }
    }

    build();
    S.raf = requestAnimationFrame(tick);
    return {
      host,
      alive: () => canvas.isConnected,
      stop() { cancelAnimationFrame(S.raf); if (canvas.parentNode) canvas.parentNode.removeChild(canvas); },
    };
  }

  // The two surfaces on the layered home: the SEA under the vector map, and
  // the GROUND under the whole petek (the logo's wash, #fb-whole-scrim),
  // which is the map's land tone -- the same ladder, one step down it.
  let sea = null, ground = null;
  const covered = () => !!document.querySelector('.ist-sheet-overlay.open') ||
    document.body.classList.contains('fb-page-on');

  function mount(box) {
    if (!box || killed()) return;
    if (!(sea && sea.host === box && sea.alive())) {
      if (sea) sea.stop();
      sea = Surface(box, box, { base: '--map-sea', light: '--map-land', dark: '--map-edge' }, () =>
        box.classList.contains('fb-layers') && !box.classList.contains('fb-ingame') &&
        !box.classList.contains('fb-whole-wash') && !covered());
    }
    const scrim = box.querySelector('.fb-whole-scrim');
    if (scrim && !(ground && ground.host === scrim && ground.alive())) {
      if (ground) ground.stop();
      ground = Surface(scrim, scrim, { base: '--hive-bg', light: '--map-sea', dark: '--map-edge' }, () =>
        box.classList.contains('fb-layers') && box.classList.contains('fb-whole-wash') && !covered());
    }
  }

  function unmount() {
    if (sea) { sea.stop(); sea = null; }
    if (ground) { ground.stop(); ground = null; }
  }

  window.IstSeaBrush = { mount, unmount };
})();
