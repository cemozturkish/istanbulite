# Istanbulite

Private, referral-gated community platform for people who live in Istanbul. See `CLAUDE.md` for full project context, including the **Vision & Product Philosophy** section that governs product decisions.

## The idea in one paragraph

Istanbulite is, at heart, an events and local-economy app that tries to *reduce* screen time, not grow it: people → their ideas → our opinions on those ideas — then go outside and meet them. The app is three pages you swipe between, the way Istanbul itself moves between Europe and Asia: you enter in the **middle** (Anahane — you and Istanbul: profile, avatar, events, breaking news), swipe one way to zoom **in** to the neighborhood (Kahvehane — coffee index, daily games, scoreboards, local comments), and the other way to zoom **out** to Turkey (Kütüphane — articles, letters, politics; read-only in spirit). Like a mall that places its stairways so you walk past the shops, every destination routes you through the rest of the city. There are no DMs and never will be; trust comes from profile badges, tenure, and avatar items that can only be **earned** by showing up in the real world — never bought. The App Store app (Capacitor) is the primary target; mobile Safari second, desktop third.

## The baskı — how content reaches a reader

Nothing a reader sees is there because somebody wrote it. It is there because
somebody **put it in the baskı** (the edition). Writing and publishing are two
separate acts, and the second one is a **column of the admin desk that is always
up**: the two pages a reader actually swipes between — Kütüphane and Kahvehane —
drawn on the right of every section, with one empty rectangle per slot the reader
will really meet. The list you are looking at in the middle is the case of loose
type: you drag a row out of it and drop it into the paper beside it. (A phone
showing the live site used to stand in that column. It answered a question nobody
was asking.) The countdown over it is the real deadline: the app prints two
editions a day and the sun decides when (sunrise and sunset over İstanbul), so the
time left to set the next one moves through the year.

An edition is a **date**. "The edition in force" is the newest one at or before
today, per kind — there is no timer and no forced rollover, so a baskı holds
until a newer one is set.

Six kinds of thing, and they are what the admin rail is now grouped by:

| | What it is | Reaches the reader |
|---|---|---|
| **HABER** | Something that happened. Written once, kept forever. | Only through a baskı. Its slot — İstanbul / Türkiye / Dünya — is its own category. Slots stack: one baskı can carry three İstanbul stories and the reader goes through them one at a time. A story is **read and thrown away, either direction** — it asks nothing. |
| **AKIŞ** | A label tying separate habers into one developing thing, read as a timeline. | Nothing yet beyond a story's own Zaman Akışı — it is a grouping recorded when it is noticed, for later. |
| **OLAY** | An ongoing conflict that has run for years (Rusya–Ukrayna, Gazze). Several akış belong to one olay. | Its own board on Kütüphane, unchanged; not part of the baskı. |
| **MEKTUP** | A letter written by a real person. Sits in the postbox until it is opened. | Addressed: everybody, or only members living in chosen districts. |
| **ETKİNLİK** | Something scheduled to happen. | Only through a baskı. Its slot — Bugün / Yarın / Öbür gün — is its own date. Opening one highlights its district; the reader throws left or right to say whether they are going. |
| **OYUN** | A game. No fixed schedule; the admin decides what is on tonight. | In the baskı or not, per night. |
| **ANKET** | The city's own question, answered once per member and filed under their district. | Only through a baskı. It is the **one** multiple choice in the app: **by day it asks, by night it prints the answers** — same box, same page. |

**A slot is not a choice.** Which rectangle a thing lands in is a fact about the
thing — a story's category, an evening's date, a game's name — so dropping only
ever answers *is this in the baskı*, never *where does it go*. A slot that
cannot hold what is being dragged goes dim rather than taking it and quietly
rewriting it. The one exception is Anket, whose three boxes are positions rather
than categories.

Everything the admin writes is entered and listed in **Turkish and English side
by side**, so a half-translated row is visible from across the room rather than
below the fold.

The schema for all of this is `db/baski_v1.sql` (plus
`db/breaking_news_v3_edition.sql`, which did it for the news first). See
`db/README.md` for the migration order.

## Website

The site is plain HTML/CSS/JS, no build step. Open any `.html` file in a browser, or serve the repo root with any static file server.

## iOS App (Capacitor)

The App Store app wraps this same site — no rewrite, no framework. Capacitor bundles the existing HTML/CSS/JS into a native shell.

**Requires a Mac with Xcode and CocoaPods installed** — Apple only allows building/signing iOS apps on macOS.

### First-time setup (on your Mac)

```bash
npm install                # installs Capacitor
npm run sync                # copies the site's web files into www/
npx cap sync ios            # copies www/ into the ios/ project, installs Pods
npx cap open ios            # opens the project in Xcode
```

In Xcode: sign in with your Apple ID under Signing & Capabilities, select your personal team, and hit Run to install on your own device or the simulator — no paid Apple Developer membership required for this. You only need the paid membership ($99/yr) once you're ready to upload a build to TestFlight or submit to the App Store.

### After editing any site file

The `www/` folder is generated, not source — never edit files inside it directly. After changing any root-level HTML/CSS/JS, re-sync before testing in the app:

```bash
npm run cap:sync   # re-syncs www/ and copies it into ios/
```

Or `npm run cap:open` to also relaunch Xcode.

### Project layout

- Root `.html`/`.css`/`.js` files — the actual site source (same as the website).
- `scripts/sync-web.js` — copies site files into `www/`, excluding dev tooling, `db/`, and docs.
- `capacitor.config.json` — app ID, display name, and `webDir` (`www`).
- `ios/` — the generated native Xcode project. Committed to source control (standard for Capacitor apps) except for `Pods/`, build output, and other machine-generated artifacts (see `ios/.gitignore`).
