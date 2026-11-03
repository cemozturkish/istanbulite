#!/usr/bin/env python3
"""Split the home screen's İstanbul drawing into its two shores.

Writes two masks the size of assets/map/istanbul-map-mobile.png (1080x1920):

    assets/map/istanbul-map-mobile-west.png   Avrupa yakası
    assets/map/istanbul-map-mobile-east.png   Anadolu yakası

project.html lays the drawing twice, one copy masked to each shore, so the
logo can send the European side off to the left and the Anatolian side off
to the right (see "THE TWO SHORES" in its stylesheet). A mask is white with
alpha 255 on its own shore and 0 elsewhere; the two are exact complements,
so laid together they are the drawing again, pixel for pixel.

How a pixel is given a shore:
  1. LAND is every pixel darker than the sea (#f7f7f7) and the page band
     (#fff) -- land, the 3D edge and the outline are all far below the
     threshold, so a coastline and its own shadow stay one piece.
  2. The two largest land pieces are the two shores, told apart by which
     one lies further left. Every smaller piece (an island, a speck of
     outline) joins whichever shore it is nearest.
  3. The SEA is handed out by distance: each sea pixel goes to the nearest
     land. So the seam between the two masks runs down the middle of the
     Bosphorus and across the open water, as far from any coast as it can
     be, and never cuts a drawn line.

The work is done at a quarter of the size (270x480) and scaled back up with
nearest-neighbour, which keeps the seam hard; it lies in open water, where
a hard edge between two sheets of the same paper cannot be seen.

Run from the repository root:  python3 scripts/make-home-map-sides.py
Re-run it if istanbul-map-mobile.png is ever redrawn.
"""
from collections import deque
from PIL import Image

SRC = 'assets/map/istanbul-map-mobile.png'
OUT = {'w': 'assets/map/istanbul-map-mobile-west.png',
       'e': 'assets/map/istanbul-map-mobile-east.png'}
SCALE = 4
LAND_MAX = 237          # luminance at or below this is land (the sea is 247)

src = Image.open(SRC).convert('L')
W, H = src.size
w, h = W // SCALE, H // SCALE
# A low-res cell is land if any pixel in it is: a thin outline must not
# vanish in the downscale and let the sea run through a coast.
px = src.load()
land = [[False] * w for _ in range(h)]
for y in range(h):
    for x in range(w):
        dark = False
        for dy in range(SCALE):
            for dx in range(SCALE):
                if px[x * SCALE + dx, y * SCALE + dy] <= LAND_MAX:
                    dark = True
                    break
            if dark:
                break
        land[y][x] = dark

# 1. Connected land pieces (4-connected).
comp = [[-1] * w for _ in range(h)]
pieces = []
for y in range(h):
    for x in range(w):
        if not land[y][x] or comp[y][x] != -1:
            continue
        cid = len(pieces)
        q = deque([(x, y)])
        comp[y][x] = cid
        n = sx = 0
        while q:
            cx, cy = q.popleft()
            n += 1
            sx += cx
            for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                if 0 <= nx < w and 0 <= ny < h and land[ny][nx] and comp[ny][nx] == -1:
                    comp[ny][nx] = cid
                    q.append((nx, ny))
        pieces.append((n, sx / n, cid))

big = sorted(pieces, reverse=True)[:2]
west_id, east_id = (big[0][2], big[1][2]) if big[0][1] < big[1][1] else (big[1][2], big[0][2])
print('pieces:', len(pieces), 'west', big[0] if big[0][2] == west_id else big[1],
      'east', big[1] if big[1][2] == east_id else big[0])

# 2 and 3. One multi-source BFS from the two shores outward hands every other
# cell -- small pieces and sea alike -- to the nearest shore.
side = [[None] * w for _ in range(h)]
q = deque()
for y in range(h):
    for x in range(w):
        if comp[y][x] == west_id:
            side[y][x] = 'w'; q.append((x, y))
        elif comp[y][x] == east_id:
            side[y][x] = 'e'; q.append((x, y))
while q:
    cx, cy = q.popleft()
    s = side[cy][cx]
    for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
        if 0 <= nx < w and 0 <= ny < h and side[ny][nx] is None:
            side[ny][nx] = s
            q.append((nx, ny))

for key, path in OUT.items():
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            if side[y][x] == key:
                mp[x, y] = 255
    alpha = m.resize((W, H), Image.Resampling.NEAREST)
    out = Image.new('LA', (W, H), 255)
    out.putalpha(alpha)
    out.save(path, optimize=True)
    print('wrote', path)
