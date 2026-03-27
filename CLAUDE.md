# CLAUDE.md — Istanbulite Codebase Guide

This file provides context for AI assistants working in this repository.

---

## Project Overview

**Istanbulite** (istanbulite.net) is a private, invite-only community platform for people in Istanbul. Users are given accounts (no self-signup) and each account is tied to a specific Istanbul neighborhood, which customizes their experience across the site. The platform lets members connect with each other, maintain customizable profile pages, and engage with neighborhood-specific content including news and discussion. While the site includes news and political content, it is not a newspaper — it is fundamentally a social/community platform.

**Live site:** https://istanbulite.net
**Hosting:** GitHub Pages with custom domain (CNAME)
**Backend:** Supabase (auth + PostgreSQL database)

---

## Architecture

This is a **pure static site** — no build tools, no bundler, no Node.js, no package.json. Everything is plain HTML, CSS, and vanilla JavaScript, deployed directly via GitHub Pages.

```
/home/user/istanbulite/
├── index.html          # Main site: login screen + interactive Istanbul map
├── admin.html          # Admin dashboard (admin-only)
├── kahvehane.html      # Community/discussion page (Coffeehouse)
├── kutuphane.html      # Archive/library page
├── hane.html           # Home/household section
├── baglantilar.html    # Links/connections page
├── bulmaca.html        # Interactive crossword puzzle game
├── sozcel.html         # Turkish Wordle-style word guessing game
├── style.css           # Legacy global stylesheet (mostly unused; prefer inline <style>)
├── main.js             # Empty placeholder (unused)
├── CNAME               # GitHub Pages custom domain config: istanbulite.net
├── README.md           # Empty
└── assets/
    └── istanbul-map.png  # High-res Istanbul map (416 KB), used in SVG viewport
```

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, Flexbox, Grid) |
| Logic | Vanilla JavaScript (ES6+) |
| Map | SVG with clickable polygon regions |
| Backend | Supabase (auth + REST API + PostgreSQL) |
| Supabase SDK | `@supabase/supabase-js@2` via CDN (jsdelivr.net) |
| Fonts | To be updated — moving away from newspaper-style fonts (Tinos, UnifrakturMaguntia) |
| Hosting | GitHub Pages |

---

## Design Direction

### Visual Style: Grayscale / Monochrome

The site uses a **strictly grayscale palette** — only shades between pure white (`#ffffff`) and pure black (`#000000`). No warm tones (browns, creams, reds), no accent colors. The aesthetic should feel clean, modern, and minimal — not like a newspaper.

**CSS Custom Properties (design tokens):**
```css
--ink: #000000           /* Main text — black */
--paper: #ffffff         /* Primary background — white */
--paper-dark: #f0f0f0   /* Secondary background — light gray */
--accent: #333333        /* Emphasis/highlight — dark gray */
--muted: #888888         /* Secondary/muted text — medium gray */
--border: #cccccc        /* Borders and dividers — light gray */
--success: #555555       /* Success feedback — dark gray */
--hover: #e0e0e0         /* Hover states — very light gray */
```

### Font Direction

The sign-in screen and overall site need **new fonts** — move away from Tinos (serif) and UnifrakturMaguntia (Gothic/decorative). Choose clean, modern fonts appropriate for a community platform, not a newspaper. Sans-serif is preferred.

### Key Principles
- **No newspaper aesthetic.** No serif masthead, no column-based news layouts, no "printed gazette" feel.
- **Grayscale only.** Every color must be a shade between white and black. No browns, reds, creams, yellows, or any chromatic color.
- **Clean and modern.** The design should feel like a contemporary web app / community platform.
- **No responsive design:** The site is desktop-only. Do not introduce responsive breakpoints unless explicitly asked.

---

## Account & User Model

### Invite-Only — No Self-Signup

There is **no public registration**. The admin (cemwozturk@gmail.com) manually creates accounts and distributes credentials. The sign-up flow in `index.html` should be removed or disabled. Only sign-in should be available to users.

### Neighborhood-Bound Accounts

Each user account is registered to a **specific Istanbul neighborhood**. This neighborhood assignment:
- Customizes the user's experience on the site (content, community, map focus)
- Is set by the admin at account creation time
- Determines what content and connections are highlighted for the user

### User Profiles

Every user should have a **profile page** that they can customize. Profile features (planned/in progress):
- Display name, bio, neighborhood affiliation
- Customizable sections (interests, links, etc.)
- Visible to other logged-in members

---

## Supabase Configuration

Supabase credentials are hardcoded in the HTML files (acceptable for a public anon key):

```javascript
const SUPABASE_URL = 'https://fgxispjoiynnoqitwpks.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iCNHaPaYLC-WRfmsfNPxYg_x2XJtI9Z';
const ADMIN_EMAIL = 'cemwozturk@gmail.com'; // admin.html only
```

Located in:
- `index.html` lines ~537–538
- `admin.html` lines ~703–705

The anon key is intentionally public (read-only for authenticated users). Row-level security (RLS) on Supabase enforces permissions.

---

## Database Schema

**Table: `articles`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key, auto-generated |
| `neighborhood` | text | Kebab-case district ID (see list below) |
| `title` | text | Article headline |
| `summary` | text | Lead paragraph / summary |
| `url` | text | Optional link to full article |
| `created_at` | timestamp | Auto set on insert |
| `updated_at` | timestamp | Auto set on update |

**RLS Policy:**
- Authenticated users → can SELECT (read all articles)
- Admin user only (cemwozturk@gmail.com) → can INSERT, UPDATE, DELETE

*Note: A `profiles` table will be needed for user profile data (neighborhood, display name, bio, etc.). This is planned but may not exist yet.*

---

## Neighborhood IDs

The 25 Istanbul districts supported by the system (used as `neighborhood` values in Supabase):

```
bakirkoy, bayrampasa, bahcelievler, sisli, eyupsultan, gop, esenler,
bagcilar, basaksehir, kucukcekmece, sultangazi, uskudar, kadikoy,
maltepe, umraniye, cekmekoy, beykoz, sariyer, besiktas, beyoglu,
gungoren, kagithane, atasehir, zeytinburnu, fatih
```

These IDs match SVG group element data attributes in `index.html` and the values stored in the Supabase `articles` table.

---

## Key Supabase SDK Calls

**Authentication (index.html & admin.html):**
```javascript
sb.auth.getSession()
sb.auth.signInWithPassword({ email, password })  // primary — invite-only, no signUp for users
sb.auth.signOut()
```

**Article reads (index.html):**
```javascript
sb.from('articles').select('*').eq('neighborhood', id).order('created_at')
```

**Admin CRUD (admin.html):**
```javascript
sb.from('articles').insert([{ neighborhood, title, summary, url }])
sb.from('articles').update({ title, summary, url }).eq('id', id)
sb.from('articles').delete().eq('id', id)
```

---

## Styling Conventions

Each page uses **inline `<style>` tags** for CSS isolation. The global `style.css` is legacy and largely unused — do not add new styles there.

**Grayscale enforcement:** All colors must be shades of gray (white to black). Do not introduce any chromatic colors (no reds, browns, blues, greens, yellows, etc.) unless explicitly asked.

**Font direction:** Use clean, modern sans-serif fonts. Do not use Tinos, UnifrakturMaguntia, or other serif/decorative fonts. The sign-in screen fonts especially need to feel contemporary, not old-fashioned.

---

## Page-by-Page Summary

### `index.html` — Main Site
- Shows a **sign-in only** screen on first load (no self-signup; accounts are admin-distributed)
- After auth: renders an interactive SVG map of Istanbul
- Clicking a neighborhood fetches and displays that district's content
- User experience is customized based on their assigned neighborhood

### `admin.html` — Admin Dashboard
- Login restricted to ADMIN_EMAIL
- Full CRUD for articles: select neighborhood, enter title/summary/URL
- Account management: create and assign user accounts to neighborhoods
- Filter articles by neighborhood
- Edit/delete with inline form population

### `kahvehane.html` — Coffeehouse
- Community discussion section
- Partially implemented; structure and styles complete

### `kutuphane.html` — Library
- Content archive
- Partially implemented

### `hane.html` — Home
- Smallest page; basic structure only

### `baglantilar.html` — Links
- External links / partner resources
- Multi-column layout

### `bulmaca.html` — Crossword
- Fully functional interactive crossword puzzle
- CSS-based grid, JavaScript game mechanics

### `sozcel.html` — Word Game
- Turkish Wordle variant
- 6 attempts, color-coded feedback

---

## Development Workflow

### Making Changes
1. Edit HTML/CSS/JS files directly — no build step required
2. Open files in a browser to test locally
3. Commit and push to GitHub; GitHub Pages auto-deploys

### No Tests or Linting
There is no test suite, no linting configuration, and no CI/CD pipeline. QA is manual via browser testing.

### Deployment
```bash
git add <files>
git commit -m "Descriptive commit message"
git push origin master
```
GitHub Pages serves the site automatically after each push to `master`.

### Key Git Commands
```bash
git log --oneline   # Review commit history
git diff            # Check changes before committing
```

---

## Coding Conventions

1. **Self-contained pages:** Each `.html` file includes its own `<style>` and `<script>` tags inline. Do not create shared JS modules unless asked.
2. **No frameworks:** Stick to vanilla JavaScript. Do not introduce React, Vue, or any framework.
3. **No build tools:** Do not add npm, webpack, vite, or any bundler.
4. **Vanilla DOM:** Use `document.querySelector`, `innerHTML`, `addEventListener` — standard DOM APIs.
5. **CSS variables:** Use the grayscale design tokens (`--ink`, `--paper`, `--accent`, etc.) for consistency.
6. **Grayscale only:** Never introduce chromatic colors. All UI elements must use shades between white and black.
7. **Turkish language:** UI labels and content are primarily in Turkish. Match existing patterns.
8. **Supabase SDK v2:** All database and auth calls go through `const sb = supabase.createClient(...)`.
9. **Inline comments:** Add comments in English above significant code blocks.
10. **Commit style:** Short, imperative commit messages (e.g. "Add profile page layout", "Fix map hover state").

---

## Security Notes

- The Supabase **anon key** is intentionally public — it provides read access only for authenticated users, enforced by RLS policies in Supabase.
- The **admin email** is visible in `admin.html` — this is acceptable because Supabase authentication still requires the correct password.
- Never store private service role keys in client-side code.
- Do not disable Supabase RLS policies.
- **No self-signup:** Users cannot create their own accounts. Only the admin provisions accounts.

---

## Common Tasks

### Add a new user account
Admin creates the account in Supabase (or via admin panel) and assigns a neighborhood. Credentials are shared privately with the user.

### Add a new article (via admin panel)
Open `admin.html` in browser, log in as admin, use the form.

### Add a new neighborhood
1. Add a new SVG polygon group to the map in `index.html` with matching class and data attribute
2. Ensure the neighborhood ID string matches the kebab-case format used in Supabase

### Add a new page
1. Create a new `.html` file
2. Follow the structure of existing pages (inline `<style>`, inline `<script>`, grayscale tokens)
3. Add a navigation link in the relevant pages

### Modify article display
Edit the `renderArticles()` function (or equivalent) in `index.html`.

### Modify admin CRUD logic
Edit the form submission and Supabase call handlers in `admin.html`.

---

## Assets

| Asset | Path | Notes |
|-------|------|-------|
| Istanbul map | `assets/istanbul-map.png` | 416 KB, 2739×2057 px; embedded in SVG |

No other media assets exist. If adding images, place them in `assets/`.
