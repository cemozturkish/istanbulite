#!/usr/bin/env python3
"""Derive assets/frame-edge.png from assets/frame.png.

frame.png's ring is drawn in two flat grays: a dark line along each edge
(~25/255) around a lighter band (~61/255). frame-edge.png keeps only the
dark lines, as alpha, so the petek can paint them in a darker shade of
whatever colour the ring is (profile-card.css, "THE RING'S OWN EDGES").
Same 1024x1536 canvas as frame.png, so the two register by construction.
Re-run if frame.png is redrawn.
"""
import numpy as np
from PIL import Image

src = Image.open('assets/frame.png').convert('RGBA')
a = np.asarray(src).astype(float)
lum = a[..., 0] * .2126 + a[..., 1] * .7152 + a[..., 2] * .0722
# 0 on an edge line, 1 on the band, linear across the antialiasing between.
band = ((lum - 25) / (61 - 25)).clip(0, 1)
alpha = a[..., 3] * (1 - band)
out = np.zeros(a.shape, np.uint8)
out[..., 3] = alpha.round().astype(np.uint8)
Image.fromarray(out, 'RGBA').save('assets/frame-edge.png', optimize=True)
