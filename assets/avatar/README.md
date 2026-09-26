# The avatar drawings

A member's avatar is a **stack of transparent layers** on one shared
canvas, never a single picture: a bald, bare base with optional overlays
laid over it, so any hair can be worn with any shirt. `avatar.js` is the
only place the filenames are written down, and it stacks them in this
order (bottom to top):

    base → shirt → accessory → hair → hat → jail

Accessory sits **under** hair on purpose: glasses temples should disappear
behind long hair rather than poke through it.

## The one rule the artwork owes

**Every file here is 1024 × 1536, transparent, and registered on that one
canvas.** Not cropped to the drawing, not trimmed, not resized. Each layer
is laid over the others at `inset: 0` (`.ist-avatar-stack img`), so a
shirt drawn on a tighter canvas does not sit on the body it was drawn for
— it stretches, and the collar lands somewhere around the chin. It is the
same frame `frame.png` and `background.png` use (`--hexframe-ratio` in
frames.css).

Two more things, both of which fail silently:

- **Four flat tones and nothing else** — `#f9f9f9` the figure's own paper,
  `#dcdbdb` the ground behind it, `#5b5b5b` the jail stripes, `#181818`
  the ink that draws the outline, the hair, the glasses and the shirt
  alike. `map-ink.js` binds each of those to a palette token, which is
  what lets an avatar follow the earth palette without a second PNG per
  palette. A tone drawn off that ladder is one the filter has no sample
  for, and it lands wherever the nearest one is.
- **Transparent, with real alpha.** Everything but the drawing must be
  fully transparent — the stack is composited, so a white background on an
  overlay hides every layer under it.

## The files

| Filename | What it is | Status |
|---|---|---|
| `base.png` | the bald, bare figure every avatar starts from | **uploaded** |
| `background.png` | the flat ground behind the figure — painted as the hexframe's own CSS background (palette.css / frames.css), not stacked as an `<img>` | **uploaded** |
| `shirt-black.png` | Siyah Tişört | **uploaded** |
| `shirt-white.png` | Beyaz Tişört | **uploaded** |
| `hair-buzz.png` | Çok kısa saç | **uploaded** |
| `hair-short.png` | Kısa saç | **uploaded** |
| `hair-long.png` | Uzun saç | **uploaded** |
| `accessory-glasses.png` | Gözlük — drawn to sit *under* long hair | missing |
| `jail.png` | the stripes, admin-only: `politicians.in_jail`, never something a member can wear | missing |
| `hat-crown.png` | Sözcü Tacı, the earned reward hat | missing, and **parked** |

`hat-crown.png` is parked rather than merely missing: the option is
commented out in `AVATAR_HAT_OPTIONS` (profile-card.js) and `HAT_URLS`
(avatar.js) is empty, because offering a reward that renders as nothing is
worse than not offering it. Dropping the file in is not enough — putting
both of those back is the rest of it.

Until a file lands, its option is simply skipped: `hairUrl()` and friends
return null for anything not in their map, so a missing overlay is a layer
that is not drawn rather than a 404'd `<img>`.

**On the greys, measured rather than assumed.** The set as drawn uses a
body around `#bdbcbc`, outlines around `#494848`, hair and the black shirt
around `#303030`, the white shirt around `#cac9c9`, and `background.png`'s
flat `#dcdbdb`. Only the last of those sits exactly on a ladder anchor, so
the other tones are reached by interpolation — and that is fine in
practice: the filter preserves the drawing's own relationships almost
unchanged (the white shirt is 1.147:1 off the skin as drawn and 1.10–1.15:1
after the filter, in every palette and both themes). The shirt reads by its
collar line rather than by its tone, which is what a white t-shirt on pale
paper has to do. Re-anchoring the ladder to these exact tones was
considered and is not needed; if a future drawing does land somewhere the
ramp handles badly, `?ink=0` renders the set exactly as drawn and is the
A/B to judge it against.

## Adding a layer

1. Draw it on the 1024 × 1536 canvas, in the four tones above.
2. Drop it here, named `<kind>-<value>.png` — the folder already says
   "avatar", so the files inside it do not repeat it.
3. Add the value to its own map in `avatar.js` (`HAIR_URLS`,
   `SHIRT_URLS`, `ACCESSORY_URLS`, `HAT_URLS`).
4. Add it to the matching `AVATAR_*_OPTIONS` table in `profile-card.js`
   with its Turkish label, and to `PP_AVATAR_*_OPTIONS` in `admin.html`
   so the Kişiler tab can dress a politician in it too.
5. **A new SHIRT also needs a migration**, and it is the one step that
   fails at the database rather than quietly: `profiles.avatar_shirt`
   carries a check constraint naming every allowed value, so a shirt
   added to the lists alone is offered in the picker and then refused on
   save. See `db/avatar_shirt_v2_white.sql`. Hair, hats and accessories
   have no such constraint and need no migration.
6. Bump `avatar.js?v=` in every page (CLAUDE.md convention 13).

Nothing that a member can put on their own avatar may ever be bought: the
items are earned by going outside (see "Trust and the earned avatar" in
CLAUDE.md).
