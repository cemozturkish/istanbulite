#!/usr/bin/env python3
"""
assets/map/istanbul-map-mobile.svg, derived from the landscape tracing.

The İstanbul map exists as two drawings of the SAME artwork: the landscape
assets/map/istanbul-map.png (5046x2300), which assets/map/istanbul-map.svg is
traced against 1:1, and the portrait assets/map/istanbul-map-mobile.png
(1080x1920) the flip book stops on, which had no tracing at all -- so nothing
on the portrait map could be pointed at or coloured.

The portrait drawing is not a redraw. It is the landscape one SCALED and
CROPPED into a 9:16 canvas, which is what makes this derivable rather than a
hand-tracing pass: there is a single affine that carries every polygon from
one frame to the other, and this script measures it rather than guessing it.

Two stages, and the second is the one that matters:

  1. A coarse FFT cross-correlation of the two drawings' ink, over a sweep of
     scales, to find roughly where the crop sits. This only has to land close.
  2. A refinement against the PORTRAIT ARTWORK ITSELF: the polygons' edges are
     densified into points, and the transform is fitted to minimise each
     point's distance to the nearest drawn line in istanbul-map-mobile.png
     (a distance transform, Huber-clipped so the wings cropped off the sides
     cannot drag the fit). That is the thing actually wanted -- hit regions
     landing on the borders the reader can see -- rather than a global image
     match that could be a pixel out everywhere and still score well.

The scale comes out ANISOTROPIC by about 2% (sy/sx = 0.980): the portrait
canvas is not a plain zoom, it is a squeeze. A uniform-scale fit is visibly
worse (mean 0.79px against 0.61px, p90 2.17px against 1.28px), so the two
axes are fitted separately. A full six-parameter affine buys almost nothing
beyond that and starts fitting the thickness of the drawn lines, so it is
deliberately not used.

    python3 scripts/derive-mobile-map-svg.py            # write the SVG
    python3 scripts/derive-mobile-map-svg.py --report   # fit + residuals only

Needs numpy, scipy and pillow. It is developer tooling and is never loaded by
the site -- the site only ever reads the SVG this writes.
"""
import os, re, sys
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
from scipy.optimize import minimize

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC_SVG = os.path.join(ROOT, 'assets', 'map', 'istanbul-map.svg')
SRC_PNG = os.path.join(ROOT, 'assets', 'map', 'istanbul-map.png')
DST_PNG = os.path.join(ROOT, 'assets', 'map', 'istanbul-map-mobile.png')
DST_SVG = os.path.join(ROOT, 'assets', 'map', 'istanbul-map-mobile.svg')

NS = 'http://www.w3.org/2000/svg'
W, H = 1080, 1920          # the portrait canvas, and so the output viewBox
INK = 150                  # below this is a drawn line rather than paper
EDGE_STEP = 6.0            # how finely a polygon edge is sampled, in source px
HUBER = 6.0                # px; past this a residual stops pulling on the fit


# ── reading the source tracing ──────────────────────────────────────────────

def parse_points(s):
    return np.array([float(v) for v in re.split(r'[\s,]+', s.strip())]).reshape(-1, 2)


def shapes():
    """Every drawn shape in the landscape tracing, in document order.

    Returned as (group_id, tag, attrib, geometry) where geometry is an Nx2
    array of points for a polygon, or the raw `d` string for the one path.
    """
    root = ET.parse(SRC_SVG).getroot()
    out = []
    for g in root:
        gid = g.get('id')
        for e in g:
            tag = e.tag.replace('{%s}' % NS, '')
            if tag == 'polygon':
                out.append((gid, tag, dict(e.attrib), parse_points(e.get('points'))))
            elif tag == 'path':
                out.append((gid, tag, dict(e.attrib), e.get('d')))
            else:
                raise SystemExit('unexpected element in the source tracing: ' + tag)
    return out


# The one path (Arnavutköy) is M/c/Z only -- absolute moveto, RELATIVE cubics.
# That distinction is the whole of transforming it correctly: an absolute point
# takes the translation, a relative delta must not.
PATH_TOKEN = re.compile(r'([MmZzCcLlHhVvSsQqTtAa])|(-?\d*\.?\d+(?:[eE][-+]?\d+)?)')


def path_points(d):
    """The absolute on-curve/control points of an M/c/Z path, for fitting."""
    toks = [(m.group(1), m.group(2)) for m in PATH_TOKEN.finditer(d)]
    pts, cur, cmd = [], np.zeros(2), None
    nums = []
    i = 0
    while i < len(toks):
        letter, num = toks[i]
        if letter:
            cmd, nums = letter, []
            i += 1
            continue
        nums.append(float(num))
        i += 1
        if cmd == 'M' and len(nums) == 2:
            cur = np.array(nums); pts.append(cur.copy()); nums = []; cmd = 'L'
        elif cmd == 'c' and len(nums) == 6:
            for j in range(0, 6, 2):
                pts.append(cur + np.array(nums[j:j + 2]))
            cur = cur + np.array(nums[4:6]); nums = []
    return np.array(pts)


def transform_path(d, sx, sy, tx, ty):
    """Rewrite an M/c/Z path under the fitted transform.

    M takes the full affine; c is a run of relative deltas and takes the
    linear part alone. Anything else would need its own case -- the source
    carries no other command, and this refuses rather than quietly mangling
    one if that ever changes.
    """
    used = set(re.findall(r'[A-Za-z]', d))
    if used - set('McZz'):
        raise SystemExit('path uses commands this script cannot transform: ' + ''.join(sorted(used)))
    out, cmd, nums = [], None, []
    for m in PATH_TOKEN.finditer(d):
        letter, num = m.group(1), m.group(2)
        if letter:
            cmd, nums = letter, []
            out.append(letter)
            continue
        nums.append(float(num))
        if cmd == 'M' and len(nums) == 2:
            out.append('%s,%s' % (fmt(nums[0] * sx + tx), fmt(nums[1] * sy + ty)))
            nums = []; cmd = 'L'
        elif cmd == 'c' and len(nums) == 6:
            out.append(','.join(fmt(nums[j] * (sx if j % 2 == 0 else sy)) for j in range(6)))
            nums = []
    return ''.join(o if o in 'MmZzCcLl' else o + ' ' for o in out).strip()


def fmt(v):
    return ('%.2f' % v).rstrip('0').rstrip('.') or '0'


# ── fitting ─────────────────────────────────────────────────────────────────

def densify(P, step=EDGE_STEP):
    """Sample along a closed polygon's edges, not just at its corners."""
    out, Q = [], np.vstack([P, P[:1]])
    for a, b in zip(Q[:-1], Q[1:]):
        n = max(1, int(np.hypot(*(b - a)) / step))
        out.extend(a + (b - a) * (i / n) for i in range(n))
    return np.array(out)


def coarse_scale(dist_free=None):
    """Sweep scales, FFT-correlating the two drawings' ink. Seeds the fit."""
    L = Image.open(SRC_PNG).convert('L')
    M = (np.asarray(Image.open(DST_PNG).convert('L')).astype(np.float32) < 200).astype(np.float32)
    N = 4096
    B = np.zeros((N, N), np.float32); B[:H, :W] = M - M.mean()
    FB = np.fft.rfft2(B)
    best = None
    for s in np.arange(0.20, 0.60, 0.005):
        w, h = int(round(5046 * s)), int(round(2300 * s))
        Li = (np.asarray(L.resize((w, h), Image.BILINEAR)).astype(np.float32) < 200).astype(np.float32)
        A = np.zeros((N, N), np.float32); A[:h, :w] = Li - Li.mean()
        C = np.fft.irfft2(FB * np.conj(np.fft.rfft2(A)), s=(N, N))
        idx = np.unravel_index(np.argmax(C), C.shape)
        dy = idx[0] if idx[0] < N // 2 else idx[0] - N
        dx = idx[1] if idx[1] < N // 2 else idx[1] - N
        if best is None or C[idx] > best[0]:
            best = (float(C[idx]), s, float(dx), float(dy))
    return best[1], best[2], best[3]


def fit(verbose=True):
    """The transform carrying landscape tracing coordinates onto the portrait."""
    dist = distance_transform_edt(
        ~(np.asarray(Image.open(DST_PNG).convert('L')).astype(np.float32) < INK)
    ).astype(np.float32)

    # Fitted on the drawn district borders alone. The unaccommodated shapes and
    # İstanbul Dışı are mostly off the crop, and the land beyond the city has
    # no border drawn inside the portrait frame to pull towards.
    pts = np.vstack([densify(G) for _g, tag, a, G in shapes()
                     if tag == 'polygon' and a.get('class') == 'neighborhood'])

    def sample(xy):
        x = np.clip(xy[:, 0], 0, W - 1); y = np.clip(xy[:, 1], 0, H - 1)
        x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int)
        x1 = np.minimum(x0 + 1, W - 1); y1 = np.minimum(y0 + 1, H - 1)
        fx, fy = x - x0, y - y0
        return (dist[y0, x0] * (1 - fx) * (1 - fy) + dist[y0, x1] * fx * (1 - fy)
                + dist[y1, x0] * (1 - fx) * fy + dist[y1, x1] * fx * fy)

    def residuals(p):
        sx, sy, tx, ty = p
        xy = np.column_stack([pts[:, 0] * sx + tx, pts[:, 1] * sy + ty])
        on = (xy[:, 0] >= 0) & (xy[:, 0] < W) & (xy[:, 1] >= 0) & (xy[:, 1] < H)
        return (sample(xy[on]), on) if on.sum() >= 100 else (None, on)

    def cost(p):
        d, _on = residuals(p)
        if d is None:
            return 1e9
        return np.where(d < HUBER, 0.5 * d * d / HUBER, d - 0.5 * HUBER).mean()

    s, dx, dy = coarse_scale()
    if verbose:
        print('coarse: s=%.3f dx=%.0f dy=%.0f' % (s, dx, dy))
    res = minimize(cost, [s, s, dx, dy], method='Nelder-Mead',
                   options=dict(xatol=1e-7, fatol=1e-10, maxiter=40000, maxfev=40000))
    sx, sy, tx, ty = res.x
    d, on = residuals(res.x)
    if verbose:
        print('fit:    sx=%.6f sy=%.6f tx=%.4f ty=%.4f  (sy/sx=%.4f)' % (sx, sy, tx, ty, sy / sx))
        print('        %d/%d sampled border points land inside the crop' % (on.sum(), len(pts)))
        print('        distance to the nearest drawn line: mean %.2fpx  p90 %.2fpx  p99 %.2fpx'
              % (d.mean(), np.percentile(d, 90), np.percentile(d, 99)))
    return (sx, sy, tx, ty), (d.mean(), np.percentile(d, 90))


# ── writing ─────────────────────────────────────────────────────────────────

def on_canvas(P):
    """Does this shape put anything at all inside the portrait canvas?

    Bounding-box overlap rather than a vertex test: Küçükçekmece keeps only
    a third of its corners and is plainly on screen.
    """
    return P[:, 0].max() >= 0 and P[:, 0].min() <= W and P[:, 1].max() >= 0 and P[:, 1].min() <= H


HEADER = '''<?xml version="1.0" encoding="UTF-8"?>
<!-- Hit-region overlay for assets/map/istanbul-map-mobile.png (the 1080x1920
     portrait İstanbul drawing the flip book stops on at slide 12), so the
     viewBox below is that image's own pixel grid.

     GENERATED. Do not hand-edit: run scripts/derive-mobile-map-svg.py, which
     re-measures the transform against the artwork itself and rewrites this
     file. The source of truth for the shapes is assets/map/istanbul-map.svg,
     traced 1:1 over the LANDSCAPE assets/map/istanbul-map.png (5046x2300);
     every id, class, data-neighborhood and data-name here is carried over
     from it untouched, and only the geometry is transformed. Fix a district's
     outline there, then re-run this.

     Note for editors: no double hyphen anywhere in these comments. This file
     is parsed as XML, not HTML, and XML ends a comment at the first one.
     That goes for the script that writes this header too.

     THE TRANSFORM. The portrait drawing is the landscape one scaled and
     cropped, so each point is carried over by
         x' = x * {sx:.6f} + ({tx:.4f})
         y' = y * {sy:.6f} + ({ty:.4f})
     The two scales differ by about 2 percent: the portrait canvas is a
     squeeze and not a plain zoom, and fitting one scale to both axes leaves
     the borders visibly off. Measured against the portrait artwork's own ink,
     the traced borders land a mean of {mean:.2f}px from the drawn line they
     belong to, p90 {p90:.2f}px, on a 1080 wide canvas.

     HOW IT MUST BE DRAWN. istanbul-map-mobile.png is laid in with cover
     (project.html's own FIT), which crops about 9 percent off each side on a
     390x844 phone. The SVG equivalent of cover with a centred image is
     preserveAspectRatio="xMidYMid slice", and NOT the xMidYMin meet that
     kutuphane-map-mobile.svg carries, because that map is fitted with contain
     and hung from the top of the screen. Draw this one any other way and
     every region is mis-aimed by the amount the fits disagree.

     WHAT THE CROP LEAVES OUT. The portrait frame is the middle of the city:
     the two wings of the landscape drawing run off the sides, so these are
     absent from this file entirely rather than present and unreachable.
     Gone: {dropped}.
     A district reaching only part way in ({partial}) is kept
     whole and clipped by the viewBox, which is what the drawing does too.

     fill="none" and no stroke: the artwork is already drawn in the image
     underneath, these are only the shapes you can point at. The visible
     tints come from the .neighborhood rules in the page that uses it.
-->
'''


def main():
    report_only = '--report' in sys.argv
    (sx, sy, tx, ty), (res_mean, res_p90) = fit()

    kept, dropped, partial = [], [], []
    for gid, tag, attrib, geom in shapes():
        if tag == 'polygon':
            Q = np.column_stack([geom[:, 0] * sx + tx, geom[:, 1] * sy + ty])
        else:
            P = path_points(geom)
            Q = np.column_stack([P[:, 0] * sx + tx, P[:, 1] * sy + ty])
        name = attrib.get('data-name') or attrib.get('id')
        if not on_canvas(Q):
            dropped.append(name)
            continue
        inside = ((Q[:, 0] >= 0) & (Q[:, 0] <= W) & (Q[:, 1] >= 0) & (Q[:, 1] <= H)).mean()
        if inside < 0.999:
            partial.append(name)
        kept.append((gid, tag, attrib, Q if tag == 'polygon' else geom))

    print('kept %d shapes, dropped %d off the crop: %s' % (len(kept), len(dropped), ', '.join(dropped)))
    print('partly on the crop (kept whole, clipped by the viewBox): %s' % ', '.join(partial))
    if report_only:
        return

    out = [HEADER.format(sx=sx, sy=sy, tx=tx, ty=ty, mean=res_mean, p90=res_p90,
                         dropped=', '.join(dropped),
                         partial=', '.join(partial))]
    out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n' % (W, H))
    for gid, tag, attrib, geom in kept:
        out.append('  <g id="%s">\n' % gid)
        bits = []
        for k, v in attrib.items():
            if k in ('points', 'd'):
                continue
            bits.append('%s="%s"' % (k, v))
            if k == 'id':
                if tag == 'polygon':
                    bits.append('points="%s"' % ' '.join(
                        '%s %s' % (fmt(x), fmt(y)) for x, y in geom))
                else:
                    bits.append('d="%s"' % transform_path(geom, sx, sy, tx, ty))
        out.append('    <%s %s/>\n' % (tag, ' '.join(bits)))
        out.append('  </g>\n')
    out.append('</svg>\n')

    with open(DST_SVG, 'w', encoding='utf-8') as f:
        f.write(''.join(out))
    print('wrote', os.path.relpath(DST_SVG, ROOT))


if __name__ == '__main__':
    main()
