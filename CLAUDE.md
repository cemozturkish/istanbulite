# CLAUDE.md — Istanbulite Codebase Guide

This file provides context for AI assistants working in this repository.

---

## Project Overview

**Istanbulite** (istanbulite.net) is a hyperlocal newspaper website for Istanbul neighborhoods. Users log in and click districts on an interactive SVG map to read neighborhood-specific news articles. The site includes an admin panel for content management and several auxiliary pages (games, community, archive).

**Live site:** https://istanbulite.net
**Hosting:** GitHub Pages with custom domain (CNAME)
**Backend:** Supabase (auth + PostgreSQL database)

---

## Architecture

This is a **pure static site** — no build tools, no bundler, no Node.js, no package.json. Everything is plain HTML, CSS, and vanilla JavaScript, deployed directly via GitHub Pages.

```
/home/user/istanbulite/
├── index.html          # Main site: login overlay + interactive Istanbul map
├── admin.html          # Editorial CMS dashboard (admin-only)
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
| Fonts | Google Fonts: Tinos (serif), UnifrakturMaguntia (decorative) |
| Hosting | GitHub Pages |

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
sb.auth.signUp({ email, password })
sb.auth.signInWithPassword({ email, password })
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

**CSS Custom Properties (design tokens, defined per-page):**
```css
--ink: #1a1a18           /* Main text */
--paper: #f5f0e8         /* Light background */
--paper-dark: #ede8d8    /* Secondary background */
--accent: #8b0000        /* Dark red highlight */
--muted: #6b6b60         /* Secondary/muted text */
--col-border: 1px solid #2a2a28  /* Column dividers */
--success: #2a6a2a       /* Success feedback */
--star: #f4a261          /* Rating star color */
```

**Newspaper aesthetic:** The design intentionally mimics a printed newspaper — serif fonts (Tinos), Gothic masthead font (UnifrakturMaguntia), dark red accents, off-white paper backgrounds, and column-based layouts.

**No responsive design:** The site is desktop-only. Do not introduce responsive breakpoints unless explicitly asked.

---

## Page-by-Page Summary

### `index.html` — Main Site
- Shows a login overlay (signup/signin modes) on first load
- After auth: renders an interactive SVG map of Istanbul
- Clicking a neighborhood calls Supabase to fetch and display that district's articles
- Sidebar shows featured stories
- Displays live date and Istanbul time

### `admin.html` — Admin CMS
- Login restricted to ADMIN_EMAIL
- Full CRUD for articles: select neighborhood, enter title/summary/URL
- Filter articles by neighborhood
- Edit/delete with inline form population

### `kahvehane.html` — Coffeehouse
- Community discussion section
- Partially implemented; structure and styles complete

### `kutuphane.html` — Library
- Historical news archive
- Includes a star rating visual element (`--star`)
- Partially implemented

### `hane.html` — Home
- Smallest page; basic structure only

### `baglantilar.html` — Links
- External links / partner resources
- Multi-column layout with category color coding

### `bulmaca.html` — Crossword
- Fully functional interactive crossword puzzle
- CSS-based grid, JavaScript game mechanics

### `sozcel.html` — Word Game
- Turkish Wordle variant
- 6 attempts, color-coded feedback: success (green), present (yellow), absent (gray)

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
5. **CSS variables:** Use the `--ink`, `--paper`, `--accent` etc. tokens for consistency.
6. **Turkish language:** UI labels and content are primarily in Turkish. Match existing patterns.
7. **Supabase SDK v2:** All database and auth calls go through `const sb = supabase.createClient(...)`.
8. **Inline comments:** Add comments in English above significant code blocks.
9. **Commit style:** Short, imperative commit messages (e.g. "Add article filter by date", "Fix map hover state").

---

## Security Notes

- The Supabase **anon key** is intentionally public — it provides read access only for authenticated users, enforced by RLS policies in Supabase.
- The **admin email** is visible in `admin.html` — this is acceptable because Supabase authentication still requires the correct password.
- Never store private service role keys in client-side code.
- Do not disable Supabase RLS policies.

---

## Common Tasks

### Add a new article (via admin panel)
Open `admin.html` in browser, log in as admin, use the form.

### Add a new neighborhood
1. Add a new SVG polygon group to the map in `index.html` with matching class and data attribute
2. Ensure the neighborhood ID string matches the kebab-case format used in Supabase

### Add a new page
1. Create a new `.html` file
2. Follow the structure of existing pages (inline `<style>`, inline `<script>`, same color tokens)
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
