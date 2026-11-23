# App Store screenshots and App Preview

`./make.sh` renders the real `project.html` in headless Chromium against a **mocked Supabase**
(no network, no real accounts) and builds the App Store assets that live in `appstore-screenshots/`.

- `harness.js` — fakes a signed-in session and answers every `/rest/v1/*` and `/rest/v1/rpc/*`
  call from in-memory tables (eq/gte/lt/in filters, `.single()`, counts).
- `fixtures.js`, `guncel.js` — the demo city: reader **Deniz Aksoy**, 18 neighbours on the petek,
  8 city evenings, 3 plans, tonight's Sözcel + Güncel results, a Güncel board. All fictional.
- `env.js` — opens the app at a fixed İstanbul time (`page.clock`), palette and language.
- `scenes.js` — one function per screen (`sehir`, `dosya`, `petek`, `ajanda`, `plan`, `oyunlar`,
  `guncel`, `sozcel`, `butun`). Viewport 430×932 @3x with the device's safe-area insets emulated
  (`Emulation.setSafeAreaInsetsOverride`) and `window.Capacitor` present, so the app lays itself
  out exactly as in the iOS build (`html.ist-native`); the status bar and home indicator are drawn
  over it afterwards. A shorter window than the real screen lays the petek out smaller -- don't.
- `compose.html` / `compose.js` — the marketing frames (kicker, headline, phone), 1290×2796.
- `video2.js` — the App Preview: Chromium **virtual time**, one 2× screenshot per 1/30 s, so every
  animation is captured frame-perfect; `make.sh` encodes it to 886×1920, 30 fps, H.264 + silent AAC.

When the app's screens change, adjust the selectors in `scenes.js` / `video2.js`; when the copy
changes, edit `FRAMES` in `compose.js`.
