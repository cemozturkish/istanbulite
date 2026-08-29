#!/usr/bin/env python3
"""
PLACEHOLDER frames for the Türkiye -> İstanbul zoom journey.

These are not the real thing. They exist so the frame player can be built
and the frame COUNT can be judged with a thumb on a real phone before
anybody draws a map by hand -- 8 frames reads as hand animation, 20 reads
as video, and that is a decision worth making by feel.

    python3 scripts/make-zoom-frames.py [N]

── The canvas: 9:16, one shape for every frame ──

Every frame is 1080x1920 and they are laid over the whole viewport with
object-fit: cover. That is the only thing the player asks of the
drawings, and it is what "put them on top of each other correctly"
means: identical size, identical crop, so nothing shifts between one
frame and the next whatever the phone's own aspect turns out to be.

It deliberately is NOT the map panel's box. The two levels do not share
one -- Kütüphane's map is the whole screen (390x896 at y=-52 on a 390x844
phone) and Kahvehane's is a 390x390 square hero -- so a strip measured
onto the map would begin in one shape and have to end in another. The
frames own the screen instead, and the two bars stay in front of them.

The last frame therefore has to look like the destination page as the
reader will actually see it, hero square and all: it stands over that
page's real map and fades, so a disagreement becomes a visible cut.
"""
import sys, os, math
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'map', 'zoom')
TURKEY = os.path.join(ROOT, 'assets', 'map', 'kutuphane-map-mobile.png')   # 1080x2420
ISTANBUL = os.path.join(ROOT, 'assets', 'map', 'istanbul-map-mobile.png')  # 3510x1600

# Where İstanbul is in the Türkiye artwork, in its own 1080x2420 grid.
# Read off the mobile hit-region trace in kutuphane.html: the seam where
# the `rumelia` polygon meets `anatolia`, which is the Bosphorus, which is
# the city. Change this and every frame re-aims.
ANCHOR = (277.0, 818.0)

# The frame canvas: 9:16, at half the drawn resolution. The in-betweens
# are on screen for ~30ms each and in motion; the endpoints are the real
# maps at full size. Draw at 1080x1920; these placeholders are 540x960.
W, H = 540, 960

# Where Kahvehane's hero square lands on screen, expressed in this
# canvas: the page shows it at y 26..416 of a 844-tall viewport, and the
# canvas is cover-fitted to that viewport.
SQ_TOP = int(26 / 844 * H)
SQ_SIDE = int(390 / 390 * W)

ZOOM = 26.0        # İstanbul is ~40px across in a 1080-wide Türkiye map
FADE_FROM = 0.5    # where the city starts taking over from the country
PAPER = (241, 223, 198)


def ease(t):
    return t * t * (3 - 2 * t)


def cover(img, w, h):
    r = max(w / img.width, h / img.height)
    out = img.resize((int(img.width * r), int(img.height * r)), Image.LANCZOS)
    return out.crop(((out.width - w) // 2, (out.height - h) // 2,
                     (out.width - w) // 2 + w, (out.height - h) // 2 + h))


def frame(turkey, istanbul, p):
    out = Image.new('RGB', (W, H), PAPER)

    # ── Türkiye, scaled about the anchor ──
    # Exponential in the scale: a zoom feels even when each frame covers
    # the same RATIO of the journey. Linear spends most of its frames on
    # the last, closest sliver.
    s = math.exp(math.log(ZOOM) * ease(p))
    k0 = W / turkey.width
    k = k0 * s
    rest = (ANCHOR[0] * k0, ANCHOR[1] * k0)
    # The anchor holds still where it sits at rest, so the zoom converges
    # on the city rather than on the middle of the frame.
    ox = rest[0] - ANCHOR[0] * k
    oy = rest[1] - ANCHOR[1] * k
    out.paste(turkey.resize((int(turkey.width * k), int(turkey.height * k)), Image.LANCZOS),
              (int(ox), int(oy)))

    # ── The city, arriving into the square it will stand in ──
    if p > FADE_FROM:
        a = ease(min(1.0, (p - FADE_FROM) / (1 - FADE_FROM)))
        side = int(SQ_SIDE * (0.55 + 0.45 * a))
        top = SQ_TOP + (SQ_SIDE - side) // 2
        left = (W - side) // 2
        city = cover(istanbul, side, side)
        layer = out.copy()
        layer.paste(city, (left, top))
        out = Image.blend(out, layer, a)
    return out


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    os.makedirs(OUT, exist_ok=True)
    turkey = Image.open(TURKEY).convert('RGB')
    istanbul = Image.open(ISTANBUL).convert('RGB')
    for old in os.listdir(OUT):
        if old.startswith('tr-ist-'):
            os.remove(os.path.join(OUT, old))
    total = 0
    for i in range(n):
        img = frame(turkey, istanbul, i / (n - 1))
        path = os.path.join(OUT, 'tr-ist-%02d.jpg' % i)
        img.save(path, 'JPEG', quality=82, optimize=True)
        total += os.path.getsize(path)
    print('%d frames, %.2f MB on the wire, %.0f MB decoded'
          % (n, total / 1048576, n * W * H * 4 / 1048576))


if __name__ == '__main__':
    main()
