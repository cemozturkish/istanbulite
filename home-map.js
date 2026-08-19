// ══════════════════════════════════════════════════════════════
// Home map — the member's own district, painted by hand.
//
// The map behind Anahane and Kahvehane is the same drawing for
// everyone, with the member's own district picked out of it. That used
// to be done in CSS: a red wash (.neighborhood.home) laid over the art
// through the traced hit-region polygon. A tint through a polygon is
// only ever as good as the trace — it sits on top of the drawing rather
// than in it, its edge is the polygon's edge instead of the district's
// own coastline, and every ferry line, label and street under it goes
// red too.
//
// So instead each district gets its OWN copy of the map, with that one
// district coloured in the artwork itself (assets/map/home/<id>.png,
// same 5046x2300 frame as assets/map/istanbul-map.png so every
// hit-region still lands where it did). This module picks the right
// copy for the member looking at the page and puts it in place of the
// base map.
//
// Adding a district is a file drop plus one line: paint the map, save
// it as assets/map/home/<district-id>.png, and add the id to PAINTED
// below. Districts not in that list keep the old CSS tint, so the two
// can coexist while the set is being drawn one by one.
// ══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  // Districts with a hand-painted map in assets/map/home/. Add an id here
  // the moment its file lands — an id listed with no file behind it is
  // not fatal (the load fails and the base map simply stays), but it does
  // cost a wasted request for every member who lives there.
  const PAINTED = ['bakirkoy'];

  // A painted map is the base map's own filename with the district's id on
  // the end -- assets/map/home/istanbul-map-bakirkoy.png -- so a folder of
  // them reads as copies of one drawing rather than 25 unrelated files.
  const BASE = 'assets/map/istanbul-map.png';
  const DIR = 'assets/map/home/';
  const STEM = 'istanbul-map-';
  const EXT = '.png';

  // Which district the last resolved profile said the member lives in.
  // Remembered so a reload can put the right map up on the FIRST paint,
  // before the profiles round-trip that confirms it — the district a
  // member lives in effectively never changes, and being wrong for one
  // beat only means showing the base map a moment longer.
  const MEM_KEY = 'ist-home-district';

  // Painted sources already fetched once, so swiping between the two map
  // pages (and re-entering one via router.js) never re-decodes the image.
  const ready = new Set();

  let current = null;

  function remembered() {
    try { return localStorage.getItem(MEM_KEY); } catch (e) { return null; }
  }
  function remember(id) {
    try { id ? localStorage.setItem(MEM_KEY, id) : localStorage.removeItem(MEM_KEY); } catch (e) {}
  }

  function srcFor(id) {
    return id && PAINTED.indexOf(id) !== -1 ? DIR + STEM + id + EXT : null;
  }

  function panels() {
    return Array.prototype.slice.call(document.querySelectorAll('.map-panel'));
  }

  // Put `src` on every base map image of every map panel on this page (or
  // put the original back when src is null). The base src is stashed on
  // the element the first time it is touched, so restoring never has to
  // know what the page's own markup said.
  function paint(src) {
    panels().forEach((panel) => {
      // Only the Istanbul map has painted copies. Kütüphane's panel is the
      // Turkey map and wears the same .map-photo class, and router.js keeps
      // one document across all three pages -- so the swap is aimed at the
      // artwork by name rather than at whatever a page calls its map.
      const imgs = Array.prototype.filter.call(
        panel.querySelectorAll('img.map-photo'),
        (img) => (img.dataset.baseSrc || img.getAttribute('src') || '').endsWith(BASE)
      );
      if (!imgs.length) return;
      panel.classList.toggle('ist-home-painted', !!src);
      imgs.forEach((img) => {
        if (!img.dataset.baseSrc) img.dataset.baseSrc = img.getAttribute('src') || '';
        const want = src || img.dataset.baseSrc;
        // Compare against the attribute, not img.src: the property is
        // absolute, so a plain !== would swap the same image every call.
        if (img.getAttribute('src') !== want) img.setAttribute('src', want);
      });
    });
  }

  // Swap only once the painted map is decoded and in cache. An <img> whose
  // src changes to something not yet fetched goes blank while it loads,
  // which on this page reads as the whole city flickering out.
  function applySrc(src) {
    if (ready.has(src)) { paint(src); return; }
    const pre = new Image();
    pre.onload = () => {
      ready.add(src);
      // The member may have navigated (or the value may have been
      // corrected) while this was in flight — only paint if it is still
      // the map we want.
      if (srcFor(current) === src) paint(src);
    };
    // No file behind the id, or the network refused it: leave the base map
    // up. The CSS .home tint is still on the polygon underneath, so the
    // district stays marked either way.
    pre.onerror = () => {};
    pre.src = src;
  }

  // Show the map belonging to `id` (a neighborhood id, or null/unknown for
  // the plain base map). Safe to call on every mount and as often as the
  // page likes — repeat calls for the district already up do nothing.
  function apply(id) {
    current = id || null;
    remember(current);
    const src = srcFor(current);
    if (src) applySrc(src); else paint(null);
  }

  // Re-assert the current district onto map images that have just been
  // swapped in — router.js replaces #ist-content wholesale on a virtual
  // navigation, so the panel painted a moment ago is a different node now.
  function refresh() {
    apply(current || remembered());
  }

  // First paint: the remembered district goes up as soon as this file runs
  // (defer, so the markup exists), which is well before the page's own
  // profile fetch resolves and calls apply() with the confirmed value.
  function boot() { if (remembered()) refresh(); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  global.IstHomeMap = { apply, refresh, isPainted: (id) => !!srcFor(id), PAINTED };
})(window);
