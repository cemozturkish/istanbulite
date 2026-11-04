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

  3. SNAPPING TO THE DRAWN FACES. The transformed tracing is good enough to
     say which district a patch of land belongs to, and not good enough to
     colour it: it was traced by hand through the middle of the drawn lines,
     so a fill laid on it spilled over the 3D edge into the sea on one side
     and fell short of the border on the other. So the shapes written out are
     not the tracing at all. Every flat patch of land tone in the portrait
     drawing (the face inside a district's drawn double line) is found, given
     to whichever traced shape covers most of it, grown one pixel into the
     line's antialiasing, and traced round its pixel edges. The tracing only
     decides WHO; the drawing decides WHERE. Every patch so far is at least
     90% inside one traced shape, so the vote is never close.

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
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation, distance_transform_edt, label
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


# ── snapping to the drawn faces (stage 3) ───────────────────────────────────

FACE = 217                 # the land tone a district's face is drawn in
FACE_TOL = 25              # how far off it a pixel may be and still be face
MIN_PIECE = 40             # px; smaller patches are specks of antialiasing
GROW = 1                   # px into the drawn line, to cover its antialiasing
SIMPLIFY = 0.7             # px; Douglas-Peucker tolerance on the traced edge


def crack_loops(mask):
    """The boundary of a boolean mask, as closed loops along pixel edges.

    Corner coordinates, clockwise on screen round the foreground. At a vertex
    two pieces only touch diagonally, the walk turns right first, which keeps
    them two loops (4-connected) rather than one figure eight.
    """
    M = np.pad(mask, 1)
    nxt = {}
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys.tolist(), xs.tolist()):
        Y, X = y + 1, x + 1
        if not M[Y - 1, X]: nxt.setdefault((x, y), []).append((x + 1, y))
        if not M[Y, X + 1]: nxt.setdefault((x + 1, y), []).append((x + 1, y + 1))
        if not M[Y + 1, X]: nxt.setdefault((x + 1, y + 1), []).append((x, y + 1))
        if not M[Y, X - 1]: nxt.setdefault((x, y + 1), []).append((x, y))
    loops = []
    while nxt:
        start = next(iter(nxt))
        a, b = start, nxt[start].pop()
        if not nxt[start]:
            del nxt[start]
        ring = [a]
        while b != start:
            ring.append(b)
            dx, dy = b[0] - a[0], b[1] - a[1]
            outs = nxt[b]
            for tx, ty in ((-dy, dx), (dx, dy), (dy, -dx)):
                t = (b[0] + tx, b[1] + ty)
                if t in outs:
                    break
            outs.remove(t)
            if not outs:
                del nxt[b]
            a, b = b, t
        loops.append(ring)
    return loops


def signed_area(R):
    x, y = R[:, 0], R[:, 1]
    return 0.5 * float((x * np.roll(y, -1) - np.roll(x, -1) * y).sum())


def douglas_peucker(P, eps):
    keep = np.zeros(len(P), bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(P) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        a, ab, seg = P[i], P[j] - P[i], P[i + 1:j]
        L = np.hypot(*ab)
        dd = (np.hypot(*(seg - a).T) if L == 0
              else np.abs(ab[0] * (seg[:, 1] - a[1]) - ab[1] * (seg[:, 0] - a[0])) / L)
        k = int(np.argmax(dd))
        if dd[k] > eps:
            keep[i + 1 + k] = True
            stack += [(i, i + 1 + k), (i + 1 + k, j)]
    return P[keep]


def simplify_loop(ring, eps=SIMPLIFY):
    """Douglas-Peucker on a closed loop, split at its two farthest points."""
    R = np.array(ring, float)
    j = int(np.argmax(np.hypot(*(R - R[0]).T)))
    a = douglas_peucker(R[:j + 1], eps)
    b = douglas_peucker(np.vstack([R[j:], R[:1]]), eps)
    return np.vstack([a[:-1], b[:-1]])


def snap_to_faces(kept):
    """For each kept shape, the outlines of the drawn faces it owns.

    Returns {index into kept: [Nx2 outline, ...]}, largest first. A shape that
    owns no face (it lies off the drawing's land) is left out, and is then
    written as the transformed tracing, unchanged.
    """
    g = np.asarray(Image.open(DST_PNG).convert('L')).astype(int)
    face = np.abs(g - FACE) <= FACE_TOL
    owner_img = Image.new('I', (W, H), 0)
    draw = ImageDraw.Draw(owner_img)
    # Rasterised off each shape's points -- for the one path, its corners and
    # control points -- which is close enough to decide who owns a patch.
    for i, (_gid, _tag, _a, _geom, Q) in enumerate(kept):
        draw.polygon([tuple(p) for p in Q], fill=i + 1)
    owner = np.asarray(owner_img)

    pieces, n = label(face)
    masks, worst = {}, 1.0
    for c in range(1, n + 1):
        sel = pieces == c
        if sel.sum() < MIN_PIECE:
            continue
        votes = np.bincount(owner[sel])
        k = int(np.argmax(votes))
        if k == 0:
            continue                       # land no traced shape claims
        worst = min(worst, votes[k] / votes.sum())
        masks.setdefault(k - 1, np.zeros_like(face))
        masks[k - 1] |= sel

    out = {}
    for i, m in masks.items():
        rings = [simplify_loop(r) for r in crack_loops(binary_dilation(m, iterations=GROW))]
        if any(signed_area(r) < 0 for r in rings):
            raise SystemExit('a face has a hole in it; this script writes polygons and cannot draw one')
        out[i] = sorted(rings, key=lambda r: -abs(signed_area(r)))
    print('snapped %d shapes to the drawing; the closest vote was %.0f%%' % (len(out), 100 * worst))
    return out


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
     from it untouched. Fix which district is which there, then re-run this.

     THE OUTLINES ARE THE DRAWING'S, NOT THE TRACING'S. The tracing, carried
     over by the transform below, only decides which district a patch of land
     belongs to. Each shape written here is the flat land face inside that
     district's drawn double line in istanbul-map-mobile.png, found by its
     tone and traced round its pixel edges, so a fill laid on it stops exactly
     at the drawn border and never spills over the 3D edge into the sea. A
     district drawn in several pieces has one polygon per piece, the extra
     ones named id-2, id-3 and carrying the district in data-neighborhood.

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
     underneath, these are only the shapes you can point at and colour. The visible
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
        kept.append((gid, tag, attrib, Q if tag == 'polygon' else geom, Q))

    print('kept %d shapes, dropped %d off the crop: %s' % (len(kept), len(dropped), ', '.join(dropped)))
    print('partly on the crop (kept whole, clipped by the viewBox): %s' % ', '.join(partial))
    if report_only:
        return

    out = [HEADER.format(sx=sx, sy=sy, tx=tx, ty=ty, mean=res_mean, p90=res_p90,
                         dropped=', '.join(dropped),
                         partial=', '.join(partial))]
    snapped = snap_to_faces(kept)
    pts_attr = lambda P: ' '.join('%s %s' % (fmt(x), fmt(y)) for x, y in P)
    out.append('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">\n' % (W, H))
    for i, (gid, tag, attrib, geom, _Q) in enumerate(kept):
        out.append('  <g id="%s">\n' % gid)
        rings = snapped.get(i)
        # A shape that owns a drawn face is written as that face, one polygon
        # per piece; the extra pieces carry the district in data-neighborhood
        # (the page reads that before the id, as it already does for Şişli).
        for n, ring in enumerate(rings or [None]):
            bits = []
            for k, v in attrib.items():
                if k in ('points', 'd'):
                    continue
                if k == 'id' and n:
                    v = '%s-%d' % (v, n + 1)
                bits.append('%s="%s"' % (k, v))
                if k == 'id':
                    if ring is not None:
                        bits.append('points="%s"' % pts_attr(ring))
                    elif tag == 'polygon':
                        bits.append('points="%s"' % pts_attr(geom))
                    else:
                        bits.append('d="%s"' % transform_path(geom, sx, sy, tx, ty))
            if n and 'data-neighborhood' not in attrib:
                bits.append('data-neighborhood="%s"' % attrib['id'])
            out.append('    <%s %s/>\n' % ('polygon' if ring is not None else tag, ' '.join(bits)))
        out.append('  </g>\n')
    out.append('</svg>\n')

    with open(DST_SVG, 'w', encoding='utf-8') as f:
        f.write(''.join(out))
    print('wrote', os.path.relpath(DST_SVG, ROOT))


if __name__ == '__main__':
    main()
