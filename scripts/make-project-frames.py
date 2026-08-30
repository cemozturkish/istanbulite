#!/usr/bin/env python3
"""
The twelve numbered test frames for the Proje tab.

These are a RIG, not artwork. Their whole job is to make the flip book's
behaviour unmistakable with a thumb on a real phone: the big number says
which frame is up, the bar says how far along the journey is, and the
travelling dot makes it obvious whether the flip is following the finger
or lagging behind it.

Drawn at the real target size (1080x1920, 9:16) so the decode and memory
cost is honest rather than flattered by small files.

    python3 scripts/make-project-frames.py [N]
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'project')
W, H = 1080, 1920

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
PAPER = (241, 223, 198)
INK = (26, 26, 26)
RED = (178, 34, 34)


def frame(i, n):
    # Each frame gets its own paper tone as well as its own number, so a
    # flip that skips or sticks is visible even out of the corner of an eye.
    t = i / (n - 1)
    bg = tuple(int(PAPER[k] + (255 - PAPER[k]) * t * 0.55) for k in range(3))
    img = Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(img)

    big = ImageFont.truetype(FONT, 620)
    small = ImageFont.truetype(FONT, 54)
    tiny = ImageFont.truetype(FONT, 40)

    label = str(i + 1)
    b = d.textbbox((0, 0), label, font=big)
    d.text(((W - (b[2] - b[0])) / 2 - b[0], (H - (b[3] - b[1])) / 2 - b[1] - 80), label, font=big, fill=INK)

    cap = 'BASLANGIC' if i == 0 else ('SON' if i == n - 1 else 'ARA KARE')
    b = d.textbbox((0, 0), cap, font=small)
    d.text(((W - (b[2] - b[0])) / 2 - b[0], H * 0.72), cap, font=small, fill=RED if i in (0, n - 1) else INK)

    d.text((60, 70), '%d / %d' % (i + 1, n), font=tiny, fill=INK)

    # Progress rail, so "how far along" is readable without counting.
    x0, x1, y = 90, W - 90, H - 300
    d.rounded_rectangle([x0, y, x1, y + 26], 13, fill=(0, 0, 0, 40), outline=INK, width=3)
    if i:
        d.rounded_rectangle([x0, y, x0 + (x1 - x0) * t, y + 26], 13, fill=INK)

    # A dot that crosses the frame over the journey: the honest test of
    # whether the flip is tracking the finger or trailing it.
    cx = x0 + (x1 - x0) * t
    d.ellipse([cx - 44, y - 150 - 44, cx + 44, y - 150 + 44], fill=RED)

    # Corner ticks, so a frame that is scaled or cropped differently from
    # its neighbours shows up at once.
    for (ax, ay) in ((60, 60), (W - 60, 60), (60, H - 60), (W - 60, H - 60)):
        d.line([ax - 34 if ax < W / 2 else ax + 34, ay, ax, ay], fill=INK, width=6)
        d.line([ax, ay - 34 if ay < H / 2 else ay + 34, ax, ay], fill=INK, width=6)
    return img


def main():
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    os.makedirs(OUT, exist_ok=True)
    for old in os.listdir(OUT):
        if old.endswith('.png') or old.endswith('.jpg'):
            os.remove(os.path.join(OUT, old))
    total = 0
    for i in range(n):
        p = os.path.join(OUT, '%02d.png' % (i + 1))
        frame(i, n).save(p, 'PNG', optimize=True)
        total += os.path.getsize(p)
    print('%d frames, %.2f MB on the wire, %.0f MB decoded'
          % (n, total / 1048576, n * W * H * 4 / 1048576))


if __name__ == '__main__':
    main()
