# assets/olaylar — the drawings pinned to the board

Kütüphane's **Olaylar** door opens a pinboard: up to four olaylar pinned to cork, with a
labelled piece of string run between any two that share a country (see `worldEventThreads` in
`kutuphane.html`, and the OLAYLAR section of `CLAUDE.md`).

What is pinned is a **drawing of that olay** — its countries and the lines between them, in the
site's own hand. The strings *between* the cards are drawn live by the page and are not artwork;
these files are the pictures on the cards.

## Adding one

Drop the file in here named after the olay's id:

```
assets/olaylar/rusya-ukrayna-savasi.png
assets/olaylar/gazze.png
assets/olaylar/iran-abd.png
assets/olaylar/suriye.png
```

That is the whole of it — nothing is entered in the admin portal. The id is printed on every
olay's card in admin.html's **Olaylar** tab, and the field there is only for the odd drawing kept
somewhere else.

## Drawing them

- **Transparent PNG.** The card's own paper is the background, and it changes with the palette
  (light / mono / dark), so a drawing on a white rectangle will sit in a white box on a dark
  screen.
- **Ink, not colour.** The site is grayscale plus one red, and on this board the red is the
  string. A drawing in near-black lines reads correctly in all three palettes.
- **Wider than tall, roughly 4:3 to 16:9.** The card gives the drawing the room left over above
  its name, and scales it down to fit (`object-fit: contain`) — a tall drawing simply comes out
  small.
- **Around 800–1200px on the long edge.** It is never printed larger than half a phone screen.
- Keep it legible at card size: a few countries and the lines between them. The detail belongs in
  the olay's own page, which prints the same drawing at full width.

A missing file is not a broken state — the card prints the olay's name alone, on purpose.
