// ══════════════════════════════════════════════════════════════
// PAGE CSS — splitting a level's stylesheet so two can be live at once
//
// Each carousel page carries its whole appearance in one inline
// <style data-page="X">, and until now exactly one of them was ever
// enabled: a second page rendered beside the first would have been drawn
// with the wrong page's rules. That is the single reason the depth
// transition had to destroy one page and build the other in the middle
// of the reader's gesture -- which is where the 111ms freeze came from,
// and no drawing or easing fixes a frozen main thread.
//
// So a page's rules are split in two:
//
//   GLOBAL   what dresses the DOCUMENT: the reset, the palette tokens,
//            #main-site's own box, and the two fixed bars. These are
//            near-identical between pages and cannot be scoped to one,
//            so exactly one page's copy is enabled at a time, as today.
//
//   SCOPED   everything else -- the page's own content, which is ~90% of
//            every stylesheet (498/557 rules on Kütüphane, 322/363 on
//            Kahvehane). Re-aimed at that level's own container, so it
//            styles that level and nothing else, and stays enabled for
//            as long as the level exists.
//
// #main-site is the level container in the re-aimed copy: a page's grid
// is the page's, and each level needs its own. What is left on the real
// #main-site is the frame's box, from frames.css.
//
// The rewriting is done through the CSSOM rather than by parsing text --
// selectorText and cssText come from the engine that will read them
// back, so there is no second parser here to disagree with it.
//
// ── STATUS: validated, NOT yet wired up ──
// Nothing calls this yet. It is committed because the measurements
// behind it are the expensive part and are worth not losing:
//
//   * All 970 content selectors across the four pages re-aim and
//     re-parse cleanly (498 Kütüphane, 322 Kahvehane, 129 Hane, 21
//     mahalle). The split is ~90/10 content-to-chrome everywhere.
//   * The four pages share 73 ids, but 71 of them are SVG artifact ids
//     (Layer_*) and district ids inside the traced overlays that no
//     script ever looks up. Only `library-card` and `map-label` are
//     fetched by getElementById on more than one page, so those two
//     are the whole of the duplicate-id problem.
//   * There are no <use href="#..."> and no url(#...) references
//     anywhere, so duplicated ids cannot silently re-point a clip
//     path, mask or symbol at the wrong level.
//   * The split sheets must be inserted where the original stood, not
//     appended to <head>: at equal specificity document order decides,
//     and moving a 150 KB stylesheet to the end changes which rules win.
//
// What is NOT solved: the layout restructure. Each page's grid lives on
// #main-site and its children are grid items via #ist-content's
// `display: contents`. Two levels need two grids, so #main-site has to
// become a bare positioning wrapper with the frame's box moved onto each
// level. A first pass leaves Hane 3 elements different, mahalle 10,
// Kahvehane 19 and Kütüphane 71 -- all of them the frame padding and
// Kütüphane's full-bleed map lift, which is one family of problems and
// not four. That is the next piece of work.
// ══════════════════════════════════════════════════════════════
(function (global) {
  'use strict';

  // A selector that dresses the document rather than the page. Anchored,
  // so `.article body` (which nobody writes) is not caught, and kept
  // deliberately small: everything not listed here is content.
  const GLOBAL_SEL = /^\s*(html|body|:root|\*|::|#ist-pc-mount|\.section-rule|header\b|nav\b)/;

  function isGlobal(selectorText) {
    return selectorText.split(',').some(s => GLOBAL_SEL.test(s.trim()));
  }

  // Re-aim one selector list at a level's container.
  function reaim(selectorText, root) {
    return selectorText.split(',').map(s => {
      s = s.trim();
      // #main-site IS this level's container now -- a page's grid belongs
      // to the page, and each level needs its own copy of it.
      if (s.indexOf('#main-site') === 0) return root + s.slice('#main-site'.length);
      if (s.indexOf('#main-site') > -1) return s.replace('#main-site', root);
      if (s.indexOf('#ist-content') === 0) return root + s.slice('#ist-content'.length);
      // `body .col-left` and friends: keep the body qualifier (it is
      // there to out-specify frames.css) and put the level inside it.
      const m = /^(html|body)((?:[.#:\[][^\s>+~]*)*)\s+(.*)$/.exec(s);
      if (m) return m[1] + m[2] + ' ' + root + ' ' + m[3];
      return root + ' ' + s;
    }).join(', ');
  }

  // Returns { globalCSS, scopedCSS }. `cssText` is a page's whole inline
  // stylesheet; `slug` names the level.
  function split(cssText, slug) {
    const root = '#' + levelId(slug);
    const el = document.createElement('style');
    el.media = 'not all';               // parsed but never applied
    el.textContent = cssText;
    document.head.appendChild(el);
    const out = { global: [], scoped: [] };
    try {
      walkTop(el.sheet.cssRules, root, out);
    } finally {
      el.remove();
    }
    return { globalCSS: out.global.join('\n'), scopedCSS: out.scoped.join('\n') };
  }

  function walkTop(rules, root, out) {
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      if (r.cssRules && r.conditionText != null) {
        const inner = { global: [], scoped: [] };
        walkTop(r.cssRules, root, inner);
        const at = r.type === 12 ? '@supports' : '@media';
        if (inner.global.length) out.global.push(at + ' ' + r.conditionText + '{' + inner.global.join('') + '}');
        if (inner.scoped.length) out.scoped.push(at + ' ' + r.conditionText + '{' + inner.scoped.join('') + '}');
        continue;
      }
      if (r.selectorText) {
        const body = r.style && r.style.cssText;
        if (!body) continue;
        if (isGlobal(r.selectorText)) out.global.push(r.selectorText + '{' + body + '}');
        else out.scoped.push(reaim(r.selectorText, root) + '{' + body + '}');
        continue;
      }
      if (r.cssText) out.global.push(r.cssText);
    }
  }

  function levelId(slug) { return 'ist-level-' + slug; }

  global.IstPageCSS = { split, reaim, isGlobal, levelId };
})(window);
