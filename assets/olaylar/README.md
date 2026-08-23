# assets/olaylar — the drawings the board is made of

Kütüphane's **Olaylar** box does not open anything. It inks itself, everything else on the page
goes, and **the map becomes the board**: each olay's drawing is laid back over the map, with its
name hung underneath it.

So these files are not pictures on cards. Each one is a **transparent overlay for the map itself** —
the countries of that olay and the hand-drawn line run between them, drawn directly on top of the
map so every stroke lands on the coastline it was drawn against.

## The frame — the one thing that must be exact

**1080 × 1920, transparent PNG.** That is the mobile map's own pixel grid: it is the size of
`assets/map/kutuphane-map-mobile.png`, the viewBox of the traced country overlay
(`assets/map/kutuphane-map-mobile.svg`), and therefore the coordinate system everything on this
page is registered in.

Draw over a copy of `assets/map/kutuphane-map-mobile.png` at 100%, hide the map layer, export the
strokes alone. Nothing is scaled, cropped or offset afterwards: the board draws the overlay with
exactly the `preserveAspectRatio="xMidYMin meet"` the traced overlay uses, which is the SVG
spelling of the `object-fit: contain` / `object-position: center top` the map image is drawn with.
Change the size and every stroke slides off the map.

## Adding one

Name the file after the olay's id:

```
assets/olaylar/dogu-akdeniz.png
assets/olaylar/rusya-ukrayna-savasi.png
assets/olaylar/gazze.png
```

That is the whole of it — nothing is entered in the admin portal. The id is printed on every olay's
card in admin.html's **Olaylar** tab, and the field there is only for a drawing kept somewhere else.

## Drawing them

- **Ink and the one red.** The site is grayscale plus a single red (`#c8322b`), and on this board
  the red is the string. `assets/olaylar/dogu-akdeniz.png` is the reference.
- **Strokes, not fills.** The map underneath is already a drawing; a filled shape over it reads as
  a hole. Lines between places, in the site's own hand.
- **Leave the rest transparent.** Several of these are on the map at once, so any background at all
  would wipe out its neighbours.
- Keep it to the places the olay is actually about. The map answers *where*; the dossier answers
  everything else.

## Where the name lands

Nowhere is it written down. The board reads the drawing's own ink — the first and last pixel that
is not transparent — and hangs the olay's name under the middle of that box (`measureOlayInk` in
kutuphane.html). Draw the strokes where the thing happens and the name follows them.

An olay **without** a drawing is still on the board: its name is placed over its ticked countries
instead, using the map's own traced shapes. That is the fallback, not a broken state — it is what
every olay looks like on the day it is created.
