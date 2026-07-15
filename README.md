# Istanbulite

Private, referral-gated community platform for people who live in Istanbul. See `CLAUDE.md` for full project context.

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
