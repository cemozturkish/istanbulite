# assets/sound — what an edition arrives with

The **edition notice** (`edition-notice.js`) is the one-line screen the reader gets the first time
they open the app since the sun last rose or set over İstanbul: *"Güneş bugün İstanbul'da 19:42'te
battı."*, typed out a letter at a time, dismissed by a tap anywhere. Once per edition, so at most
twice a day.

This folder holds the sound that tap makes.

## The sound belongs to the TAP, not to the screen

That is a platform rule, not a preference, and it is the whole reason the files live here rather
than being played on arrival. The notice opens itself the moment the app does, with **no user
gesture behind it** — and every engine, WKWebView hardest of all, refuses to play audio until there
has been one. So a `play()` at the moment the sentence starts typing is silently refused on the
platform ~90% of readers are on: code that looks like it works, and a feature nobody ever hears.

The dismissing tap **is** that gesture. So the crows are what the reader lets the day in *with*,
and they carry over into the app behind the screen for their couple of seconds. Nothing about this
needs a native change, and it behaves identically in the App Store app, in mobile Safari and on
desktop.

## The files

```
assets/sound/crows.m4a
```

`SOUND` in `edition-notice.js` maps each edition to a file. Today both editions point at the one
recording; giving the sunset its own is changing one line there and dropping a second file beside
this one.

| | |
|---|---|
| **Format** | AAC in an `.m4a` container — the one format WKWebView, mobile Safari and desktop all take with no fallback `<source>` |
| **Channels** | mono |
| **Bitrate** | ~96 kbps |
| **Length** | **2–4 seconds.** The sentence finishes typing in a little over a second, and the reader can tap before that; a recording still running long after the screen has gone is playing over an app they are already using |
| **Size** | budget ~100 KB. It ships inside the App Store bundle, downloaded by every member |

`ffmpeg -i crows.wav -ac 1 -c:a aac -b:a 96k crows.m4a` is the whole of the conversion.

## The silent switch is the mute button, and that is deliberate

Left alone, a WKWebView plays in the **ambient** audio session: a phone on silent stays silent.
That is exactly right for a sound that arrives unrequested twice a day, and it is why there is no
`AVAudioSession` category override in the native project and no fourth preference row at the
petek's Sen depth (every row there comes out of the reader's own hexagon). Do not add either.

## A missing file is silence

`play()` swallows every failure — no file there yet, a codec the device will not take, a `play()`
the engine refuses anyway. The screen must always close on a tap, so the sound can never be what
stops it. Until a recording is dropped in here, the notice behaves exactly as it did before this
folder existed.

## Shipping one

`scripts/sync-web.js` copies all of `assets/` into `www/`, so there is nothing to add to it. A new
file needs no `?v=` bump either — it is a new URL, not a changed one. Changing
`edition-notice.js` itself does (CLAUDE.md convention 13); it is referenced from `project.html`
alone.

```bash
npm run sync && npx cap sync ios
```
