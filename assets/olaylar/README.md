# assets/olaylar — the drawings the board is made of

Kütüphane's **Olaylar** box does not open anything. It inks itself, everything else on the page
goes, and **the map becomes the board**: each olay is a **piece of paper pinned to the map**, with
the hand-drawn line running from the paper to the place it is about. The paper is the only thing on
the board that takes a press — the drawing is drawing, the paper is the door.

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

- **A colour per olay.** The site is grayscale plus one red, but the board is the exception: each
  olay's strings get their own muted colour, so four of them over one map stay tellable apart.
  `dogu-akdeniz.png` (red) and `rusya-ukrayna-savasi.png` (blue) are the reference. Keep them
  desaturated — the map underneath is a drawing too, and a saturated line over it shouts.
- **Strokes, not fills.** The map underneath is already a drawing; a filled shape over it reads as
  a hole. Lines between places, in the site's own hand.
- **Leave the rest transparent.** Several of these are on the map at once, so any background at all
  would wipe out its neighbours.
- **Draw the line all the way to where the paper will hang** — an empty piece of sea or desert with
  room for a small note. The paper is pinned at the end of that line (see below), so the string
  reads as running from the note to the place.
- Keep it to the places the olay is actually about. The map answers *where*; the dossier answers
  everything else.

## Where the paper hangs

**In the admin portal**, under the drawing field: click the mini map and the paper is pinned there.
Click the **end of the line you drew** — that is the whole point of the coordinate, and nothing in
the picture can work it out on its own (a stroke ending in empty sea looks like a stroke ending
anywhere else). The olay's own drawing is laid over the picker at the same registration the board
uses, so you are aiming at the real line.

The coordinates are in the same 1080 × 1920 frame as everything else, and they mark the **pin** —
the paper hangs down from that point.

Two fallbacks, both a guess and both better than an olay nobody can press: with no coordinate the
paper hangs under the drawing's own ink (`measureOlayInk` reads the PNG for its bounding box), and
with no drawing either, over the olay's ticked countries, off the map's own traced shapes. An olay
with neither is what every olay looks like on the day it is created — not a broken state.

## Where else the drawing shows up

Opening an olay leads with a **crop of the map** around its strokes — the same drawing, cropped to
its own ink with the map put back underneath. Nothing to prepare: it comes from the same file.

## Its colour

An olay can carry its own colour (the admin portal's Olaylar tab, a plain colour picker) — the
paper's pin, its stamp and its dossier's chapter rail all take it. Pick it to match the ink you
actually drew the strokes in, not an arbitrary colour: `rusya-ukrayna-savasi`'s is sampled straight
off `rusya-ukrayna-savasi.png` itself. Left unset, an olay is the site's own red, same as before
this existed. Several olaylar can be pinned to the board at once, which is the whole reason this
is here — it is the one surface on the site where the single house red gives way to several.

## Its chapters are a separate thing from this folder

The dated story an olay tells — its chapters, oldest first, each with an optional lead photo — is
curated in the admin portal, not dropped in as a file. See the OLAYLAR section of `CLAUDE.md` for
how a chapter differs from every other Zaman Akışı on the site (it reads oldest to newest, not
newest first) and how a chapter's photo is meant to look.
