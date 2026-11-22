#!/usr/bin/env python3
"""
assets/map/istanbul-map-vector.json -- the home screen's İstanbul, as vectors.

The home screen used to lay assets/map/istanbul-map-mobile.png in as a
picture and a traced SVG over it for the presses. A picture goes soft the
moment it is zoomed, takes the palette only through a lookup filter
(map-ink.js), and needs a second traced copy to know where anything is. This
turns the same drawing into the drawing's own vectors, so the map is shapes
the page can colour, press and move directly.

Nothing here is redrawn. Two things are read off the PNG:

  1. THE LINE WORK, by tone. The drawing is a handful of flat grays
     (CLAUDE.md, "The drawings read the palette"): land #d9d9d9, the light
     kenar line #b4b4b4, ink #000. Each tone is taken as an iso-line of the
     image -- everything darker than LEVEL becomes one even-odd path -- and
     the tones are nested (ink < kenar < land), so three paths stacked in
     that order reproduce the hand drawing: the double lines between
     districts, the coast and the extruded 3D side, all of it.

  2. THE DISTRICTS, by face. assets/map/istanbul-map-mobile.svg already
     holds every district's flat land face inside its drawn double line
     (scripts/derive-mobile-map-svg.py). Each face is smoothed into a
     subpixel outline; it is what is coloured and what is pressed. Each
     district also gets its CELL: every pixel nearer its face than any
     other face, out to the middle of the shared double line. The page
     clips a red copy of the kenar line to it, so a picked district's own
     half of every border goes red and its neighbour's half does not.

    python3 scripts/make-vector-map.py

Needs numpy, scipy, pillow, scikit-image and shapely. Developer tooling,
never loaded by the site -- the site only reads the JSON this writes.
Re-run whenever istanbul-map-mobile.png or its SVG is regenerated.
"""
import json, os, re
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, gaussian_filter
from shapely.geometry import Polygon
from shapely.ops import unary_union
from skimage import measure
from skimage.measure import approximate_polygon

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC_PNG = os.path.join(ROOT, 'assets', 'map', 'istanbul-map-mobile.png')
SRC_SVG = os.path.join(ROOT, 'assets', 'map', 'istanbul-map-mobile.svg')
OUT = os.path.join(ROOT, 'assets', 'map', 'istanbul-map-vector.json')

W, H = 1080, 1920
NS = '{http://www.w3.org/2000/svg}'
# The tone levels, between the drawing's flat grays (247 sea, 217 land,
# 180 kenar, 0 ink).
LEVEL_LAND, LEVEL_EDGE, LEVEL_INK = 232, 198, 110
# How far a district's cell reaches from its face, in drawing pixels: the
# shared double line is ~25px face to face, and its middle ink line ends
# about 14px out.
CELL_REACH = 14


def ring_d(coords):
    return 'M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in coords) + 'Z'


def geom_d(g):
    out = []
    for p in (g.geoms if hasattr(g, 'geoms') else [g]):
        if p.is_empty:
            continue
        for ring in [p.exterior, *p.interiors]:
            out.append(ring_d(list(ring.coords)[:-1]))
    return ''.join(out)


def contours_d(field, level, tol, min_len, pad):
    """Every iso-line of `field` at `level`, as one even-odd path."""
    parts = []
    for c in measure.find_contours(field, level):
        if len(c) < min_len:
            continue
        c = approximate_polygon(c, tol)
        if len(c) >= 3:
            parts.append(ring_d([(x - pad, y - pad) for y, x in c]))
    return ''.join(parts)


def mask_geom(mask, sigma=1.0, tol=0.8, min_area=40):
    """A binary mask as a smoothed polygon (holes kept)."""
    f = np.pad(gaussian_filter(mask.astype(float), sigma), 1)
    polys = []
    for c in measure.find_contours(f, 0.5):
        pts = [(x - 1, y - 1) for y, x in c]
        if len(pts) < 4:
            continue
        p = Polygon(pts)
        if not p.is_valid:
            p = p.buffer(0)
        if p.area >= min_area:
            polys.append(p)
    polys.sort(key=lambda p: -p.area)
    shells = []
    for p in polys:
        host = next((s for s in shells if s['shell'].contains(p.representative_point())), None)
        if host is None:
            shells.append({'shell': p, 'holes': []})
        else:
            host['holes'].append(p)
    res = [s['shell'].difference(unary_union(s['holes'])) if s['holes'] else s['shell'] for s in shells]
    return unary_union(res).simplify(tol, preserve_topology=True)


def main():
    png = np.array(Image.open(SRC_PNG).convert('L')).astype(float)
    tree = ET.parse(SRC_SVG)

    # ── 1. the line work, by tone ──
    pad = 2
    img = gaussian_filter(np.pad(png, pad, constant_values=247), 0.55)
    line = {
        'land': contours_d(img, LEVEL_LAND, 0.35, 6, pad),
        'edge': contours_d(img, LEVEL_EDGE, 0.35, 6, pad),
        'ink': contours_d(img, LEVEL_INK, 0.35, 6, pad),
    }

    # ── 2. the districts, by face ──
    faces, names, kinds = {}, {}, {}
    for el in tree.iter(f'{NS}polygon'):
        nid = el.get('data-neighborhood') or el.get('id')
        pts = [float(v) for v in re.split(r'[\s,]+', el.get('points').strip())]
        im = Image.new('L', (W, H), 0)
        ImageDraw.Draw(im).polygon(list(zip(pts[0::2], pts[1::2])), fill=1)
        m = np.array(im, bool)
        faces[nid] = faces.get(nid, np.zeros_like(m)) | m
        names[nid] = el.get('data-name')
        kinds[nid] = el.get('class')

    ids = sorted(faces)
    lab = np.zeros((H, W), np.int16)
    for i, k in enumerate(ids, 1):
        lab[faces[k]] = i
    dist, (iy, ix) = distance_transform_edt(lab == 0, return_indices=True)
    owner = lab[iy, ix]

    districts = []
    for i, k in enumerate(ids, 1):
        g = mask_geom(faces[k])
        if g.is_empty:
            continue
        cell = owner == i
        cell &= dist <= CELL_REACH
        cf = np.pad(gaussian_filter(cell.astype(float), 0.7), 1)
        rp = g.representative_point()
        districts.append({
            'id': k,
            'name': names[k],
            # 'neighborhood' (a district this app serves) or
            # 'map-unaccommodated' (drawn, not yet served)
            'cls': kinds[k],
            'd': geom_d(g),
            'cell': contours_d(cf, 0.5, 0.7, 12, 1),
            # A point inside the district, for its mark: the polygon's own
            # representative point, so it is never in a neighbour.
            'cx': round(rp.x, 1),
            'cy': round(rp.y, 1),
            'area': round(g.area),
        })

    out = {
        'note': 'Generated by scripts/make-vector-map.py from istanbul-map-mobile.png. Do not hand-edit.',
        'viewBox': [0, 0, W, H],
        **line,
        'districts': districts,
    }
    with open(OUT, 'w') as f:
        json.dump(out, f, separators=(',', ':'), ensure_ascii=False)
    print(f'wrote {OUT}: {len(districts)} districts, {os.path.getsize(OUT) // 1024} KB')


if __name__ == '__main__':
    main()
