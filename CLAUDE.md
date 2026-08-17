# CLAUDE.md — ISTANBULITE Codebase Guide

This file provides context for AI assistants working in this repository.

---

## Project Overview

**Istanbulite** (istanbulite.net) is a private, referral-gated community platform for people that live in Istanbul. Accounts are created either by the admin directly or via referral self-signup, where a prospective user must enter the unique kefil code of an existing member while signing up. Each account is tied to a specific Istanbul neighborhood (current residence), and also records the user's birth neighborhood — both customize their experience across the site. The platform lets members connect with each other but not directly DM, because this app essentially tries to reduce users' screen time and not increase it. The news, discussions, and events posted up on this website are supposed to remind the users that there is a life outside that they have to go get it, it's not supposed to create a life inside the internet. This is why users can not DM each other, but can see each others' profiles and acknowledge such people with such opinions exist. Users can maintain customizable profile pages and engage with neighborhood-specific content including news and discussion. While the site includes news and political content, it is not a newspaper — it is fundamentally a social/community platform. However, it draws from newspaper aesthetic.

**Live site:** https://istanbulite.net
**Hosting:** GitHub Pages with custom domain (CNAME)
**Backend:** Supabase (auth + PostgreSQL database)
**iOS app:** Capacitor wrapper around the same static site (`ios/`, `capacitor.config.json`) — see README.md

---

## Vision & Product Philosophy

This section is the source of truth for **why** the app is shaped the way it is. When a product,
layout, or feature decision is ambiguous, resolve it in favor of these principles.

### The mall-stairway principle

Whatever a user opens the app for — the games, the news, the political content, or just checking
the cheapest coffee in their neighborhood — the layout must route them **through** the rest of the
city on the way, the way a mall deliberately places its stairways so you physically walk past the
shops to go up, down, or out. Users can absolutely come just for the games; but the app is designed
so that on the way there they *see* at least some of everything else. Never build a shortcut that
lets a user reach their one destination without passing through anything. The three-page swipe
carousel **is** this stairway: you enter in the middle, and every destination requires traversal.

### Always in the middle (Avrupa ↔ Anadolu)

Istanbul's essence is being permanently *in between* — Europe on one side, Asia on the other, its
people crossing left and right and back again every single day, belonging to both and reducible to
neither. The app's architecture mirrors this. The user always enters on the **middle page** and
swipes left/right from there — and no matter which way they go, they should feel like they are
still in the middle. Not this, not that: **both**.

The three pages, and what each direction *means*:

- **Middle — `anahane.html` (Hane, "home"):** the self and the city. The Istanbul district map,
  the user's own profile and avatar, events, breaking news. "No matter where you are in Istanbul,
  Istanbul is your home first." Personal customization (avatar creation, profile) belongs to the
  middle — it is the user's anchor point.
- **One direction — `kahvehane.html` (zoom IN, the local):** deeper into the neighborhood. The
  district/mahalle-level map, the **coffee price index** and local economy, the daily games, the
  scoreboards (who got what score), and neighborhood comments. This is the *interactive* side of
  the app — where you engage with other Istanbulites.
- **Other direction — `kutuphane.html` (zoom OUT, Turkey):** the national layer. The Turkey map,
  articles, letters, politicians, TBMM. Deliberately **less interactive** than the local side:
  this page is for reading and observing, not for peer-to-peer interaction at a national level.
  Istanbulite is not a place to argue about Turkey with strangers.

The zoom levels tell one story: mahalle → Istanbul → Türkiye, with the user standing in the middle.

### No DMs — ever

Users can never directly message each other. This is a permanent, foundational decision, not a
missing feature. Istanbulite does not care what its users say to each other in private — and that
is where its power comes from. It does not need to track your conversations, interpret your data,
or use it against your future endeavors. Istanbulite does not feel the need to control you; it is
confident enough to just be a safe space from what is out there. Users can see each other's
profiles and acknowledge that such people with such opinions exist — that is enough.

### Anti-screen-time: remind, don't retain

The app's job is to remind users that **life is outside and they have to go get it** — not to
build a life inside the internet. Every feature should push attention outward. The formula has
three points: **people → their ideas → our opinions on those ideas.** The app reminds you that
these people exist, they are doing these things, here is what they think — now go outside and
meet them. Engagement-maximizing patterns (infinite scroll, notification pressure, streak guilt)
are anti-goals.

### An events app at heart

Strip everything away and Istanbulite is an **events and local-economy app**: it shows you the
nearest cheapest coffee (the coffee index), and it shows you events — real opportunities to
socialize with real people. It tells you almost nothing about who those people are except their
Istanbulite profile, and that is deliberate, because of how trust works here (next section).

### Trust and the earned avatar

A user trusts another Istanbulite through their profile card: the badges, the membership tenure
("member since…"), and the specific clothes/items on their avatar. These signal legitimacy
because **they cannot be bought** — avatar items and badges are earned only through real-world
participation: showing up to events, being with people, interacting outside. You customize your
avatar based on how much you participate in the outside world. Never add a purchase or shortcut
path to avatar/profile cosmetics.

### Istanbulites and visitors

The app is only for people actually **in** Istanbul. Identity is expressed as "Cem from Ataşehir,"
"Cem from Beşiktaş." A future idea: tourists could become Istanbulites for the duration of their
visit — "Sam from Kenya" — with their own distinct interface (not the residents' app, something
better suited to a visitor), letting a tourist feel like an Istanbulite for the moment they're in
the city and interact with locals in a meaningful way. Not built yet; keep the door open for it.

### Platform priority: the app comes first

At least at first, ~90% of users will use the **iOS App Store app** (the Capacitor wrapper). That
is the main target: every change must feel smooth in the app first, then in mobile Safari, then on
desktop. The two runtimes already have divergent code paths where needed (e.g. `router.js` uses
in-document virtual navigation inside Capacitor vs. cross-document View Transitions on the web) —
keeping the app buttery is worth that duplication. Desktop is the third-priority layout, not the
default one.

---

```
/home/user/istanbulite/
├── index.html            # Login/signup gate ONLY — redirects to anahane.html once authenticated
├── anahane.html          # MIDDLE page: home — Istanbul map, profile/avatar, events, breaking news
├── kutuphane.html        # LEFT page (zoom out): Library — Turkey map, articles, letters, TBMM/politicians
├── kahvehane.html        # RIGHT page (zoom in): Coffeehouse — district map, games hub, scoreboards, comments
├── sozcel.html           # Turkish Wordle-style daily word game
├── tumcel.html           # Turkish quote-fragment Connections-style daily game (replaced Bağlantılar)
├── bulmaca.html          # Turkish daily mini crossword
├── admin.html            # Admin dashboard (admin-only)
├── router.js             # Shared shell: single Supabase client, swipe carousel, virtual navigation, clock
├── sheet.css/.js         # THE sheet: the one page that rises from the bottom — see "Site-wide defaults"
├── profile-card.js/.css  # Profile bar (the phone's top bar), avatar, badges — shared across pages
├── onboarding.js/.css    # New-account onboarding flow
├── game-locks.js         # Per-day game on/off enforcement (game_day_toggles)
├── coffee-index.js       # Kahve Endeksi live evaluation: opening hours + scheduled discounts
├── ist-date.js           # THE Istanbul clock: every daily roll-over/date key derives from it
├── i18n.js               # TR/EN language toggle
├── palette.js/.css       # Theme tokens
├── map-parallax.js       # The map drifts behind the page as the phone tilts (mobile only)
├── avatar.js, mahalle-picker.js, map-zoom.js, person-mentions.js, politician-card.js,
│   tbmm.js, sozcu-mascot.js, admin-notification.js, loading-screen.js/.css,
│   safe-area-ready.js, frames.css        # Focused shared modules
├── capacitor.config.json # iOS app config (Capacitor wraps the same site — see README.md)
├── ios/                  # Generated Capacitor Xcode project (committed, minus Pods/build output)
├── scripts/sync-web.js   # Copies site files into www/ for the Capacitor build
├── db/                   # SQL migration files — SOURCE OF TRUTH for the full Supabase schema
├── CNAME                 # GitHub Pages custom domain config: istanbulite.net
└── assets/               # map/, avatar/, mascot/, loading/ subfolders + one-off images
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
| Supabase SDK | `@supabase/supabase-js@2` via CDN (jsdelivr.net) | |
| Hosting | GitHub Pages |
| iOS app | Capacitor (wraps the same static site; `www/` generated by `scripts/sync-web.js`) |
| Navigation | 3-page swipe carousel (Kütüphane ← Anahane → Kahvehane) via `router.js` |

---


## Account & User Model

### Referral-Gated Signup (Kefil System)

There is no fully public registration. Accounts are created in one of two ways:

1. **Admin-created:** The admin (cemwozturk@gmail.com) creates an account directly; the admin becomes the `referred_by` (kefil).

2. **Referral self-signup:** A prospective user enters a valid **kefil code** (the unique `referral_code` of an existing member) before being allowed to fill out the signup form. The DB trigger `public.handle_new_user` validates the code and links `referred_by` to the kefil's profile atomically with the `auth.users` insert — there is no way to create one without the other.

Every profile has a unique `referral_code` (8-char uppercase, generated by the trigger) that the user can share to invite others.

### Neighborhood-Bound Accounts

Each account stores **two** neighborhood values:
- `neighborhood` — current residence; must be one of the 25 Istanbul districts (`istanbul_disi` is **not** allowed here — if you don't live in Istanbul you don't get an account).
- `birth_neighborhood` — where the user was born; same 25 districts plus `istanbul_disi` for users born outside Istanbul.

Both columns are `NOT NULL` and foreign-keyed to the `public.neighborhoods` lookup table. Interactions can gate on either column (e.g. commenting in a neighborhood currently requires `profiles.neighborhood = X`).

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

> **Note:** the tables documented below are the core set. The complete, current schema lives in
> `db/*.sql` — later features each have their own migration file there (events + `event_rsvps`,
> `breaking_news` + polls/series/updates, `library_articles`/shelves/letters/categories,
> `game_results`, avatar item columns, `profile_badges` (cover badges), `politicians`, TBMM
> seats/parties, `mahalles`, `admin_notifications`, Sözcel sözcü assignments, `coffee_prices`
> (the Kahve Endeksi — v3 adds the opening-hours and scheduled-discount columns that make it
> live), `coffee_comments` (what members say about a venue), `countries` + `country_entries`
> + `country_entry_events` (what a country on Kütüphane's map opens, and the key-moment
> timeline an entry can carry) and `breaking_news_countries` (which countries a
> Dünya story is about, lit on that map when the story opens), and more). When in doubt, read the relevant `db/` file — it is the
> source of truth.

**Table: `neighborhoods`** — lookup of valid neighborhood IDs.
- `id text pk` (kebab-case slug), `name_tr text` (Turkish display name).
- 26 rows: the 25 Istanbul districts plus `istanbul_disi` (İstanbul Dışı).
- RLS: readable by `anon` and `authenticated` (needed for the signup dropdown).

**Table: `profiles`** — one row per user, FK `id` → `auth.users.id` (cascade delete).
- Required: `id`, `neighborhood`, `birth_neighborhood`, `referral_code`, `joined_at` (default `now()`), `updated_at` (auto via trigger).
- Optional: `first_name`, `last_name`, `phone` (unique), `email` (unique, synced from `auth.users`), `birth_place` (free text), `avatar_url`, `referred_by` (FK → profiles.id).
- `neighborhood` cannot be `istanbul_disi` (check constraint).
- View `profiles_public` exposes only non-sensitive columns (no phone, no email).
- RLS: authenticated users SELECT all; users UPDATE only their own row; INSERT/DELETE admin-only. A `protect_profile_columns` trigger reverts admin-controlled fields (neighborhood, referred_by, referral_code, email, joined_at, id, birth_neighborhood) on non-admin updates.

**Table: `articles`**
- `id uuid pk`, `neighborhood text` (FK → neighborhoods), `title`, `summary`, `url`, `created_at`, `updated_at`.
- RLS: authenticated users SELECT; admin-only INSERT/UPDATE/DELETE.

**Table: `neighborhood_comments`** — Kahvehane forum posts.
- `id uuid pk`, `author_id` (FK profiles, cascade), `neighborhood` (FK neighborhoods), `body text` (1–5000 chars), `created_at`.
- RLS: authenticated users SELECT all; INSERT only if `author_id = auth.uid()` AND the commenter's `profiles.neighborhood = neighborhood`; DELETE own or admin; no edits (admin UPDATE only).

**Table: `coffee_comments`** — what members say about a Kahve Endeksi venue (`db/coffee_comments.sql`).
- `id uuid pk`, `coffee_id` (FK coffee_prices, cascade), `author_id` (FK profiles, cascade), `body text` (1–1000 chars), `created_at`.
- The members' half of the index: prices, hours and discounts stay admin-only, but anyone signed in may leave a note about the coffee. Surfaced in the venue panel opened by clicking a row on the Kahvehane board.
- **No district gate**, unlike `neighborhood_comments` — that gate keeps a district's feed with the people who live there, whereas a note about a café is worth most from someone who actually went, and going elsewhere in the city is the behaviour the app wants to encourage.
- RLS: authenticated users SELECT all; INSERT only if `author_id = auth.uid()`; DELETE own or admin; no edits (admin UPDATE only).

**Table: `article_comments`**
- `id uuid pk`, `author_id` (FK profiles, cascade), `article_id` (FK articles, cascade), `body`, `created_at`.
- RLS: authenticated users SELECT all; INSERT any authenticated (no neighborhood gate); DELETE own or admin; no edits (admin UPDATE only).

**Table: `quotes`** — general-purpose quote bank (`db/quotes.sql`).
- `id uuid pk`, `body_tr text` (Turkish), `body_en text` (English), `author text`, `created_at`, `updated_at` (auto via trigger). Both `body_tr` and `body_en` are required — every quote is entered in both languages.
- Admin-managed via the "Alıntılar" tab in `admin.html`; not yet surfaced anywhere on the site — where/how they're shown is still undecided, this just holds the data set to draw from. Not related to `tumcel_quote_suggestions`/`tumcel_puzzles`, which are specific to the Tümcel game's daily puzzle pipeline.
- RLS: authenticated users SELECT all; admin-only INSERT/UPDATE/DELETE.

**Table: `game_day_toggles`** — admin on/off switch for a game on a given day (`db/game_day_toggles.sql`).
- `game text` (`sozcel`/`tumcel`/`bulmaca`), `game_date date`, `disabled_by`, `disabled_at`. PK `(game, game_date)`.
- Presence of a row = that game is disabled that day; absence = runs normally. Managed from the on/off board in admin.html's Oyunlar tab (toggling on deletes the row, toggling off upserts it).
- Read by `game-locks.js` on every game page (and Kahvehane) to lock the game's nav card and, if a user hits the game page directly, bounce them to Kahvehane with "Bugün `<Oyun>` yok!".
- RLS: authenticated users SELECT all; admin-only INSERT/UPDATE/DELETE.

**Table: `sozcel_used_answers`** — one row per Istanbul day: that day's Sözcel answer (`db/sozcel_used_answers*.sql`).
- `used_on date pk`, `word` (unique across all days, so an answer never repeats), `definition`, `syllables`, `sozcul_id`, `created_at`.
- **The word is server-authoritative.** Clients never write today's row; they call `public.sozcel_daily_word(candidates text[])`, which resolves the Istanbul date server-side, returns the day's word if it has one, and otherwise records the first unused candidate — atomically, so simultaneous first-players of the day converge on one word (`db/sozcel_used_answers_v5_server_pick.sql`). The client's candidate list is only a proposal.
- This exists because the pick used to be client-side: the answer's index was `hash(date) % pool.length`, so two clients whose snapshot of the used rows differed by a single row computed different words, and whoever lost the insert race kept playing their own word anyway. Never reintroduce a client-side fallback pick — a locally-invented word looks normal while being a puzzle nobody else is playing, and its result lands on the shared scoreboard.
- RLS: authenticated users SELECT all; direct INSERT only for an assigned Sözcü's *own* row before its deadline (midnight Istanbul at the start of `used_on`), matching the UPDATE policy; DELETE admin-only.
- **The admin is never locked out** (`db/sozcel_used_answers_v6_admin_override.sql`): admin INSERT/UPDATE policies sit alongside the Sözcü ones, with no `sozcul_id` match and no deadline, because a word that is wrong *on the day it is being played* is exactly the case that has to be fixable and the one moment every other policy refuses. The admin reaches it through the same Sözcü Görevi form on `sozcel.html` — the button opens a day picker instead of an assignment, and saving preserves whoever the row already belonged to, so correcting a day never takes it over. `game-locks.js` matches: the admin isn't bounced off a game they switched off for the day (they own the switch), though the win-gates still apply to everyone since those are the game's own progression.

**Tables: `hive_codes` + `hive_slots`** — the hane honeycomb on Anahane (`db/hive_slots.sql`).
- `hive_codes`: `(user_id, week_start)` PK, `code` (6 chars, no I/O/0/1), unique per `(week_start, code)`.
  One code per member per Istanbul week — `week_start` is the **Sunday** on or before today
  (`db/hive_slots_v2_sunday_week.sql`), resolved server-side by `public.hive_week_start()`. Note
  this is the one week on the site that does *not* start Monday like the profile's game grid: the
  code week is the rhythm of seeing people, and it turns over on Sunday. Only the live week's codes
  resolve, which is what makes them renew — last week's rows are left alone and simply stop
  matching. RLS: a member may SELECT **only their own** row and there is no client
  write policy at all; that a code cannot be looked up is precisely why holding one means it was
  handed to you.
- `hive_slots`: `(owner_id, slot)` PK with `slot` 0–5, plus `member_id`, `placed_at`, `expires_at`.
  Unique `(owner_id, member_id)` so one person can't hold two of your six. RLS: SELECT/DELETE your
  own rows (emptying a slot early is a plain delete); no client INSERT/UPDATE — filling a slot means
  resolving a code you aren't allowed to read.
- Functions: `hive_my_code()` (SECURITY DEFINER, issues this week's code on first ask),
  `hive_claim_code(code, slot)` (SECURITY DEFINER; returns a *status* — `ok` / `invalid_code` /
  `self` / `slot_taken` / `already_in_hive` — that the UI words itself, see `profile.hive.err.*` in
  `i18n.js`; places for 7 days and sweeps the owner's expired rows first), and `hive_my_slots()`
  (SECURITY INVOKER, the caller's live slots joined to each occupant's public profile fields, with
  expiry settled by the database rather than the device clock).

**Table: `app_settings`** — generic admin-managed key/value feature toggle table (`db/app_settings.sql`).
- `key text pk`, `value boolean`, `updated_by`, `updated_at`.
- Currently one row: `onboarding_enabled` — global on/off switch for the new-account onboarding flow. Read by `onboarding.js`'s `maybeRun()` (missing row or `value = true` = enabled); a row with `value = false` disables it site-wide. Managed from the "Onboarding" panel at the top of admin.html's Users tab.
- RLS: authenticated users SELECT all; admin-only INSERT/UPDATE/DELETE.

### Key DB functions / triggers
- `public.is_admin()` — returns true if `auth.uid()`'s email matches the admin email; used in every admin-only RLS policy.
- `public.handle_new_user()` — trigger on `auth.users insert`. Reads `raw_user_meta_data` (first_name, last_name, phone, neighborhood, birth_neighborhood, birth_place, referral_code), validates the kefil code, resolves the referrer, generates a unique 8-char `referral_code`, inserts the matching `profiles` row. Atomic with the auth user creation — failure rolls everything back.
- `public.sync_profile_email()` — trigger on `auth.users` email change, mirrors it to `profiles.email`.
- `public.set_updated_at()` — `before update` trigger on `profiles`, bumps `updated_at`.
- `public.protect_profile_columns()` — `before update` trigger that snaps system fields back to OLD values for non-admin updates.
- `public.verify_kefil_code(code text)` — `SECURITY DEFINER` RPC, returns minimal kefil info (id, first_name, last_name, neighborhood) for a referral code. Executable by `anon` so the signup form can preview the kefil.

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
sb.auth.signInWithPassword({ email, password })
sb.auth.signOut()
sb.auth.signUp({ email, password, options: { data: {
  first_name, last_name, phone,
  neighborhood, birth_neighborhood, birth_place,
  referral_code,  // the kefil's code; validated by handle_new_user trigger
}}})
sb.rpc('verify_kefil_code', { code })  // preview kefil before showing signup form
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

## Page-by-Page Summary

### `index.html` — Login Gate
- Login / kefil-code signup screen only — no content of its own anymore
- Once a session exists (or right after sign-in), redirects to `anahane.html` (the real home)

### `anahane.html` — Hane (MIDDLE page, home)
- The entry point and anchor of the three-page carousel — the user always starts here
- Interactive Istanbul district map in the center; clicking a district opens its detail sheet
- Left column: events panel (with RSVPs — `events` / `event_rsvps` tables)
- Right column: breaking news feed (with polls, series, updates)
- The personal layer lives here: the user's own profile, avatar, home identity
- The **PETEK** button over the map (the counterpart of Kahvehane's Kahve Endeksi pill, sitting
  just above the map label) opens the **hane honeycomb** — your frame in the middle, six slots
  for other members around it, each filled by entering that member's weekly code
  (`IstProfileCard.openHiveOverlay`, see Site-wide defaults and `db/hive_slots.sql`).
  Opening your profile card here shows the cover alone — the honeycomb is a destination on the
  map, not a page of your account
- Vision: this page is "you + Istanbul" — see Vision & Product Philosophy above

### `admin.html` — Admin Dashboard
- Login restricted to ADMIN_EMAIL
- Full CRUD for articles: select neighborhood, enter title/summary/URL
- Account management: create and assign user accounts to neighborhoods
- Filter articles by neighborhood
- Edit/delete with inline form population
- **Kahve tab** is the only place the Kahve Endeksi (`coffee_prices`) is edited: pick a
  district, enter venue + price, and the list on the right (filterable by district,
  cheapest first) edits/deletes existing entries. Kahvehane renders the index read-only.
  Two optional per-venue nuances make the index behave like a live market board rather
  than a printed list (`db/coffee_prices_v3_live.sql`, evaluated by `coffee-index.js`):
  **Opening Hours** (a weekly schedule; outside it the venue drops out of the ranking on
  Kahvehane) and a **Scheduled Discount** (a cheaper price on chosen weekdays inside a
  time window — "Jay's is cheaper until 18:00 on weekdays" — applied and withdrawn by the
  clock, with nothing to switch off by hand). Leaving Opening Hours off means "hours not
  recorded", which keeps the venue listed around the clock — the behaviour of every row
  entered before this existed. A live preview under the form shows what the venue being
  edited is doing at this exact minute, and each row in the list carries the same read-out
- **Oyunlar tab** combines all three games' admin panels in one place: a shared per-day
  on/off board (next 7 days × Sözcel/Tümcel/Bulmaca, backed by `game_day_toggles`) at the
  top, then sub-nav pills to switch between each game's own management panel (Sözcel sözcü
  assignments, Tümcel puzzle editor, Bulmaca which has no manual content — puzzles are
  generated, so its panel is just a pointer back to the on/off board). Toggling a game off
  for a day locks it site-wide for that day (enforced by `game-locks.js`, see Database Schema above and Assets/coding conventions below).

### `kahvehane.html` — Coffeehouse (RIGHT page, zoom IN — the local, interactive side)
- Istanbul district map with mahalle-level picker; community discussion per neighborhood
- Users can only comment on their own neighborhood, but can view and read all
- This is where the NYTimes-like games live, there are three of them:
  - Sözcel: Turkish Wordle
  - Tümcel: Turkish quote-fragment Connections (replaced Bağlantılar)
  - Bulmaca: Turkish crossword
- The games change every day; scores and scoreboards are tracked (`game_results`)
- The **coffee price index** (Kahve Endeksi, `coffee_prices` table): the "Kahve Endeksi" pill
  above the map label opens a bottom sheet (detail-overlay) listing the cheapest cup of coffee
  per venue, scoped to the selected district or all of Istanbul; on desktop the same list also
  shows permanently in col-right. **Read-only for everyone** — the index is curated from the
  admin portal only (admin.html's "Kahve" tab), and RLS allows writes to the admin alone
  (`db/coffee_prices_v2_admin_only.sql`)
- The index is a **live board, not a printed list** — it is meant to be accurate about the cup
  you could go and buy right now, the way a market board is accurate about a price. A venue
  outside its opening hours drops out of the ranking and sinks to the bottom of the board,
  dimmed and labelled "Kapalı"; a venue inside a scheduled discount window trades at the
  discounted price, re-ranks accordingly, and snaps back when the window ends. Both are
  clock-driven, so the board re-ranks itself on a timer off the already-fetched rows — no one
  edits anything for a shop to close or a discount to expire. The evaluation lives in
  `coffee-index.js` (shared with admin.html so its preview matches exactly); the schema is
  `db/coffee_prices_v3_live.sql`
- Rows print **no district name and no date** — hovering a row highlights the district it is in
  on the map instead (the same `.hover-active` tint the map's own hover uses), which keeps the
  board terse and answers "where is this" with the map rather than more text. Hovering also
  nudges the row toward the map (`translateX(-4px)`), matching `.game-link` and the scoreboard
- **Clicking a row opens that venue.** On desktop it arrives as a left-hand slide-in panel
  (`.coffee-venue-slide`) over the discussion feed — deliberately the same move the weekly
  scoreboard makes when a game opens, so "I tapped something on the right, its detail arrived
  on the left" reads as one consistent gesture. On mobile the board is itself a bottom sheet,
  so the sheet drills into the venue with a back link instead. Both surfaces are built by the
  same `renderVenueHTML()`. The panel carries the venue's live price and status, its week's
  opening hours (today's line inked), and **`coffee_comments`** — the members' half of the
  index. The venue's district stays lit on the map for as long as its panel is open, and the
  panel's live block re-renders on the same 30s tick as the board without disturbing the
  comment list or a half-typed comment

### `kutuphane.html` — Library (LEFT page, zoom OUT — the Turkey/national side)
- Turkey map; articles, shelves, letters (Posta Kutusu), politicians, TBMM seat chart
- Everyone can read, like, and comment on articles
- Per the vision, this side stays *less* interactive than Kahvehane — reading and observing
  the national level, not peer-to-peer engagement about it
- The Dünya feed (`breaking_news` where `category = 'dunya'`) is **tied to the map**: the admin
  ticks the countries a story is about while posting it (`breaking_news_countries`, a join table
  — a story can be about Rusya *and* Ukrayna at once), and opening that story here lights every
  one of them on the phone map behind the sheet, which rests under the map so the reader sees
  where the story they just opened is happening. The story also names those countries under its
  body — on a desktop, where the world map isn't the drawing on screen, that line is the whole of
  it. Country names come off the map's own `data-name`, not a second fetch, so a story names a
  place with the same word the caption prints when you touch it
- **Touching a country opens that country's page** (`country_entries`), and that page is a
  **news page, not a chapter**: the country's entries are the same `.article.openable` cards
  the Dünya feed prints, and opening one gives the same `.article` a story gives — kicker
  (the country's name), headline, body, its Zaman Akışı, source. There is deliberately no
  second page type here; a country reads the way a story reads. The one thing that is the
  country page's own is its head: the hand-drawn arrow (`assets/back.png`, the same one the
  game pages use) alone in the corner, with the country's name centred on the top line — no
  worded back button, because the reader arrived by touching the drawing. `countryHeadHTML()`
  builds it, and an entry's own page passes no title, so the arrow stands alone over the
  article exactly as it does on a story's page
- An entry can carry a **Zaman Akışı** (`country_entry_events`) — a chain of dated key moments,
  the way a `breaking_news` story grows `breaking_news_updates`, reusing that timeline's own
  `.timeline-*` markup and printed **newest first** just like it. The only difference is the
  stamp: a moment carries its date rather than its age, because these chains reach back to 1917
  and "109 yıl önce" tells a reader nothing. Curated from admin.html's Ülkeler tab;
  `db/country_entries_seed.sql` holds the starting set (Rusya–Ukrayna, Filistin–İsrail, Suriye,
  Karabağ, Kıbrıs, Putin Rusyası)

### `tumcel.html` — Tümcel
- Connections-style game where 16 sentence fragments must be regrouped into 4 quotes
- Replaced the earlier Bağlantılar game; that file has been deleted

### `bulmaca.html` — Crossword
- Fully functional interactive crossword puzzle
- CSS-based grid, JavaScript game mechanics

### `sozcel.html` — Word Game
- Turkish Wordle variant
- 6 attempts, color-coded feedback
- **The screen sizes itself, on every device.** `layoutGame()` owns every measurement on
  this page and works off what `.game-panel` *measures* — never a fraction of
  `window.innerHeight`. It sizes the keyboard first (the page's fixed furniture, one key
  width shared by all three rows via `--kb-key` / `--kb-key-h` / `--kb-gap`), then
  `layoutBoard()` gives the hexagon board whatever is genuinely left. `.play-area`'s
  `1fr / auto / 1fr` grid is what puts the board dead centre between the floating top
  buttons and the keys, and the attempt pips dead centre of the band under it. Do not
  reintroduce a viewport-fraction size or a `margin-top: auto` here: two auto margins
  competing for leftover space is what used to push the board up under the buttons and
  clip it, and a centred overflow has no scrollbar to recover it. `fitSozcuLine()` keeps
  the "Günün Sözcüsü: …" credit on **one line** at any name length — it must never wrap,
  because a second line moves the keyboard and re-flows the board under the reader's thumb

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
git push origin main
```
GitHub Pages serves the site automatically after each push to `main`.

### Key Git Commands
```bash
git log --oneline   # Review commit history
git diff            # Check changes before committing
```

---

## Site-wide defaults

Some things on this site are **one object with one implementation**, not a pattern each page
re-types. Before writing layout or chrome for a new surface, check whether it is one of these.
If it is, use it as it is — do not restate its geometry, its transition or its markup in a page's
own stylesheet, and do not invent a second version "just for this page". If the default is wrong
for everyone, change the default.

### THE sheet — `sheet.css` + `sheet.js`

Every surface that opens *over* a page rises from the bottom centre of the window as the same
object: a news item, an event, a game, an article, a shelf, a letter, the TBMM/meclis page, a
politician, a Kahve Endeksi venue, your own profile, another member's profile. There is no second
geometry and no centred modal anywhere on the site.

- **Geometry** (desktop): anchored to the bottom edge, `min(680px, 86vw)` wide,
  `min(88vh, 860px)` tall, sliding up from off-screen over 0.55s. The sheet's own bottom edge is
  never left exposed mid-screen; content taller than the cap scrolls **inside** the sheet
  (`.ist-sheet-body`), never by scrolling the overlay root.
- **Markup:** `.ist-sheet-overlay` > `.ist-sheet-backdrop` + `.ist-sheet` >
  `.ist-sheet-close` + `.ist-sheet-body`. A page may add its own class alongside these for
  content styling (`class="ist-sheet detail-overlay-sheet"`), never for size or position.
- **Behaviour:** `IstSheet.open(overlay)` / `IstSheet.close(overlay, after)` — do not hand-roll
  the unhide → rAF → `.open` dance or the 550ms hide timeout.
- **Phones:** the sheet's side gaps are the same `--screen-inset` (frames.css) the profile bar's
  row is padded to — everything stacked over the same map lines up, always.
  - A sheet opened **from the profile bar** (your profile, a member's) rests under that bar,
    via `--ist-sheet-top` (`IstSheet.position` measures it live).
  - A sheet opened **over the map** — a news item, an event, an article, the meclis, later a
    country — carries `ist-sheet-pull` and is *dragged*: it comes to rest half-way down, under
    the map, so you still see what you tapped; drag it up and it stops at the profile bar;
    past that the reading continues inside it; drag it back down and it closes. One
    implementation, `IstSheet.pull(overlay, { onDismiss })` — attach it once and
    `IstSheet.open/close` drive it from there. Touch only (`pointer: coarse`); a narrow desktop
    window keeps the ordinary sheet.
- **Chrome:** background/border come from `frames.css`'s `.ist-sheet` rule (2px ink border, no
  bottom border, no shadow).

### The phone's hero line — `--map-hero-end`

On a phone all three carousel pages are one screen: a square map at the top, everything else
below it. **Everything below starts on the same line** — Anahane's news and events, Kahvehane's
comments and game tiles, Kütüphane's Dünya column and shelf boxes — and each map's caption sits
just above it. A sheet pulled up over the map comes to rest there too. That line is
`--map-hero-end` (frames.css: frame ring + `--map-hero-top` + the map's own `100vw` square); what
is printed on the two bars sits on `--screen-inset`, and so do the sheets' side gaps. Never
restate any of these as a number — swiping between the three pages must not shift the layout
under the reader.

### The phone's feeds hang from the bottom, not the top

The hero line is where each page's columns *begin*; it is not where their cards sit. On a phone
every stack below the map is **bottom-aligned**: one news item, one event, one comment, one
library box rests just above the tab bar, and the next one is laid **on top of** it, so the
stack grows upward toward the map instead of downward away from the thumb. It is the same move
on all three pages — Anahane's news and events, Kahvehane's comments (they rest on the composer),
Kütüphane's Dünya feed and library boxes — and each pair of columns ends on the same line.

One implementation note, because it fails silently: the space is pushed down with an **auto top
margin on the innermost box** (the feed itself), never `justify-content: flex-end`. A stack that
outgrows the screen resolves its auto margin to zero and simply scrolls, where flex-end would
push the top of the stack out of the scroller and out of reach. The margin also has to sit on a
box that does *not* grow — every wrapper between a column and its feed carries `flex: 1`, and
flex hands the free space to a growing item before any margin sees it, so an auto margin one
level too high does nothing at all.

### The map is scenery, and it drifts — `map-parallax.js`

The map is the one thing on all three carousel pages that is *scenery* rather than content:
everything else — the two bars, the columns, every sheet — is printed **on** the screen, while the
map is what the screen is a window **onto**. On a phone that is literal: tilt the device and the
drawing behind the window shifts against you, the way the view through a real window does. Nothing
else moves — not the profile bar, not the tab bar, not the feeds, not the caption over the map, not
a sheet resting on the hero line. One implementation for all three pages; each page just loads the
script, and `router.js` re-aims it after a virtual navigation swaps `#ist-content`.

Three things about it are load-bearing:

- **The window never moves — the artwork does.** `.map-panel` is the window and is never
  transformed. What moves is each drawing inside it, and *every* drawing moves by exactly the same
  amount: the photo **and** the traced SVG overlay that carries the hit-regions. A parallax that
  moved the picture out from under its own hit-regions would quietly mis-aim every tap on the map.
  Kütüphane's phone overlay is a **sibling** of its panel rather than a child (it has to escape the
  panel's stacking context to be touchable at all), so the module collects siblings too — it is the
  same drawing over the same box and it moves with it.
- **The room to move into is drawn, not borrowed.** The artwork is scaled a few percent past its
  window (`OVERSCAN`) and the drift is clamped to exactly half that surplus per side, so the edge
  of the drawing cannot come into view however far the phone is tilted. The scale happens **about
  the point the artwork is anchored to** — centre for the maps drawn `cover`, top for Kütüphane's,
  which hangs from the top of the screen — read off each layer's own `object-position` /
  `preserveAspectRatio` rather than hardcoded per page, so the two stay registered by construction.
- **The neutral pose is wherever the phone was already being held.** The first reading defines
  "level", so a reader lying on a sofa gets the same range as one sitting upright, and an ordinary
  tilt never makes it creep. Only a tilt held *past* the end of the range drags the neutral pose
  along — which is the one case (lying down, handing the phone over) the old pose can no longer
  describe.

Off entirely on desktop, under `prefers-reduced-motion: reduce`, and while the page is hidden. On
iOS the sensor is permission-gated and the request must come from a user gesture, so it is asked
once per session on the first tap — never on load. The native app needs `NSMotionUsageDescription`
in `ios/App/App/Info.plist` for that same prompt.

### The phone's two bars — `#ist-pc-mount` (top) and `.section-rule > header` (bottom)

A phone shows the city between two fixed charcoal bars: **who you are** at the top (the profile
bar — avatar, name, district, the gear that opens your profile) and **where you can go** at the
bottom (Kütüphane / Hane / Kahvehane). Both run full-bleed edge to edge, both add the device's own
inset on top of their height (notch at the top, home indicator at the bottom), both print their
contents on `--screen-inset`, and neither moves while the three pages swipe underneath. The top
bar stands taller (`--navbar-h-top`) than the bottom one (`--navbar-h`) because it carries a
portrait and two lines of type against the tab bar's one word. Heights and colors are the
`--navbar-h` / `--navbar-h-top` / `--navbar-ink*` tokens in frames.css — the colors deliberately
palette-independent, the same in light, mono and dark. The top bar is one
implementation in profile-card.css ("THE TOP BAR"); the bottom bar's colors live in frames.css
("MOBILE FIXED BOTTOM NAV") while each page still positions its own `<header>`. Never write
either bar's height as a number — the same value also reserves the space each page leaves at the
bottom so its last row of cards clears the tab bar, and one copy left behind is how the two bars
end up different heights. The game pages hide the bottom bar outright for their fullscreen board.

### The three carousel pages share one document

`router.js` navigates Kütüphane ↔ Anahane ↔ Kahvehane **without a page load** — on the web too, not
just in the app. Each page's `#ist-content` is swapped in, but everything else it leaves behind
stays: its body-level overlay markup, and every listener its script ever bound to `document` or
`window`. Two rules follow, and breaking either one fails silently:

- **Body-level overlay ids must be unique across the three pages.** Anahane and Kahvehane both
  called their sheet `#detail-overlay`; the second page's markup was skipped as a duplicate, so it
  drove the first page's node instead (`#anahane-detail` / `#kahvehane-detail` now). `router.js`
  warns in the console when an id clashes across pages — do not ignore that warning.
- **A page script must not delegate on `document` for anything another page also has.**
  `#politician-card`, `.neighborhood`, `.author-link` and friends exist on more than one page: a
  document-level handler keeps firing after you've navigated away. Bind to the element instead
  (it lives inside `#ist-content`, so the binding leaves with it) — or put the behaviour in a
  shared module that every page uses, which is what the member sheet does.

### Your own profile — one page, three versions (`PROFILE_SECTIONS`)

The profile card opens your profile as the sheet above, but **what it contains depends on which of
the three pages you opened it from** (`PROFILE_SECTIONS` in `profile-card.js`): the cover (frame,
avatar, name, district) shows on all three; the week's game grid is Kahvehane's; your account and
settings — with the Kişiselleştir and Çıkış Yap buttons that act on them — are Kütüphane's.
Anahane's is the cover and nothing else.

### The hane honeycomb — the PETEK sheet (`IstProfileCard.openHiveOverlay`)

The honeycomb (`hiveHTML`) is your own cover frame as the middle cell of seven, with six slots
packed around it for other members. It opens from the **PETEK button over Anahane's map**, in the
same sheet the profile opens in (`openHiveOverlay` passes it the block set directly, rather than
through `PROFILE_SECTIONS`) — who you keep close is a destination on the middle page, not a page
of your account, which is why it is reached from the city rather than from the gear in the profile
bar. The honeycomb reuses the cover's own frame for its middle cell — same mask, same drawn ring,
same badges — so there is no second frame treatment to keep in sync.

A slot is filled **hand-to-hand, by code** (`db/hive_slots.sql`): every member holds one code per
Istanbul week, tapping an empty slot asks for someone else's, and whoever it belongs to stands
there for a week. There is deliberately no member search, no follow button and no request-accept
flow — to put someone in your honeycomb you have to have been told their code, which means you saw
them, and since both the code and the placement run out, the honeycomb empties itself unless that
keeps happening. It is a record of contact, not a follower list, and it is the closest thing to a
connection the site has (still no DMs — ever). What is *shown* of an occupant beside their frame is
the undesigned half: name, district, and the week running down, no more.

Each slot owns the space on the outer side of its own row, which just prints the occupant — name,
district, days left — and never changes for a tap. What a tap needs lands in **the dock**, one
fixed spot below the honeycomb (`hiveDockHTML`): your own code at rest, or the tapped slot's panel
while one is open — the code field for an empty slot, a Çıkar button for a filled one. The
honeycomb itself is fixed furniture: no cell resizes and no row shifts when a slot opens, on a
phone or anywhere else — the tapped hex is marked instead (`.ist-hive-cell-open` inks its ring and
lifts it slightly via `transform`, which never moves a neighbour). This replaced an earlier design
where the frame itself grew sideways into the row's own gutter — workable on desktop, but the
gutter was too narrow on a phone to hold a real field without shrinking every hexagon to make room,
which read as the whole honeycomb flinching at a tap. Pressing the same hex again folds the dock
back to the resting code display, which is why there is no close button in it.

Neither the honeycomb nor any of the three profile sets scrolls: each fits inside the sheet, the
way a politician's page does. If a new block stops fitting, drop a block from that page — do not
turn the page into a scroller.

### Another member's profile — `IstProfileCard.initMemberSheet({ sb, I18N })`

Clicking any `.author-link` / `.kefil-link` anywhere on the site opens that member's read-only
profile as the sheet above (cover + weekly grid + member since + kefil chain). One implementation,
in `profile-card.js`; each page just calls `initMemberSheet` once. Do not write a page-local
profile popup.

## Coding Conventions

1. **Self-contained pages, but never at the cost of a site-wide default:** Each `.html` file includes its own `<style>` and `<script>` tags inline for what is genuinely its own. Anything listed under **Site-wide defaults** above is not — reuse it. If the same block appears in two pages, it belongs in a shared file, not in a third page too.
2. **No frameworks:** Stick to vanilla JavaScript. Do not introduce React, Vue, or any framework.
3. **No build tools:** Do not add npm, webpack, vite, or any bundler.
4. **Vanilla DOM:** Use `document.querySelector`, `innerHTML`, `addEventListener` — standard DOM APIs.
5. **CSS variables:** Use the grayscale design tokens (`--ink`, `--paper`, `--accent`, etc.) for consistency.
6. **Turkish language:** UI labels and content are primarily in Turkish. Match existing patterns.
7. **Supabase SDK v2:** All database and auth calls go through `const sb = supabase.createClient(...)`.
8. **Inline comments:** Add comments in English above significant code blocks.
9. **Commit style:** Short, imperative commit messages (e.g. "Add profile page layout", "Fix map hover state").
10. **Never compute an Istanbul date by parsing a formatted one.** Anything that needs the Istanbul
    date/time — daily seeds, `used_on` keys, game locks, opening hours, weekly cutoffs — goes
    through `ist-date.js` (`IstDate.now()`, `.iso()`, `.daySeed()`, `.nextMidnight()`). The old
    `new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))` round-trip asks the
    Date constructor to re-parse a human-readable string, which is engine-dependent (modern ICU
    even inserts U+202F before AM/PM) — a device where it fails gets `NaN` fields and silently
    addresses the wrong day.
11. **Cross-cutting changes touch the game pages too.** When changing anything that lives on more than one page — nav, profile popup, scoreboard, lock rules, header layout, theme tokens — explicitly check **sozcel.html, tumcel.html, bulmaca.html** as well as anahane / kahvehane / kutuphane. The game pages are the easiest to forget and their right-column game nav must stay in sync. Shared logic that risks drift belongs in a dedicated `*.js` (see `game-locks.js`, `profile-card.js`) rather than copy-pasted into each page. **There is no `baglantilar.html`** — Bağlantılar was retired and replaced by Tümcel; do not recreate that file or add `baglantilar` to the games list. The `'baglantilar'` value lingering in the `game_results.game` CHECK constraint is for historical rows only; no new code should write it.

12. **The role is "Sözcü", never "Sözcül".** The day's word-picker is a *sözcü* everywhere a
    human can read it and everywhere the code names it (`IstSozcu`, `sozcu-mascot.js`,
    `.sozcu-line`, `sozcuCount`, `profile.sozcucount`). The only survivors of the old
    spelling are the database identifiers `sozcel_sozcul_assignments` and
    `sozcel_used_answers.sozcul_id`, which stay as they are because renaming a live column
    is a migration, not a rename. Do not spell the role "Sözcül" in new copy or new names.

13. **Bump `?v=` when you change a shared `.js` / `.css`.** GitHub Pages serves the assets with
    `max-age=600` and the app's WKWebView caches harder still, while the HTML that references them
    updates on its own schedule — so for a window after every deploy a returning user runs **new
    HTML against an old shared script**. That is not a subtle degradation: a page that has just
    learned a new `data-i18n` key prints the key itself (`HANE.PETEK`) because the cached `i18n.js`
    has never heard of it, and a button wired to a brand-new function silently throws. The shared
    files carry a version query (`i18n.js?v=2`, `profile-card.js?v=2`, `profile-card.css?v=2`,
    `loading-screen.js?v=2`); changing one of them means bumping its number **in every page at
    once**. All pages must spell the URL identically — `router.js`'s `loadScriptOnce` matches on
    the exact `src` string, so one page left on `i18n.js` while another says `i18n.js?v=3` makes a
    swipe load and re-execute the module a second time.

---

## Security Notes

- The Supabase **anon key** is intentionally public — it provides read access only for authenticated users, enforced by RLS policies in Supabase.
- The **admin email** is visible in `admin.html` — this is acceptable because Supabase authentication still requires the correct password.
- Never store private service role keys in client-side code.
- Do not disable Supabase RLS policies.
- **No self-signup:** Users cannot create their own accounts without a kefil code.

---

## Common Tasks

### Add a new user account
Admin creates the account in Supabase (or via admin panel) and assigns a neighborhood. Credentials are shared privately with the user.

### Add a new article (via admin panel)
Open `admin.html` in browser, log in as admin, use the form.

### Add a new neighborhood
1. Add the hit-region to the map overlays in `anahane.html` and `kahvehane.html` (traced against
   `assets/map/istanbul-map.svg`, the source of truth — keep them in sync)
2. Ensure the neighborhood ID string matches the kebab-case format used in Supabase

### Add a new page
1. Prefer NOT to: the three-page carousel (Kütüphane ← Anahane → Kahvehane) is the intended
   full surface of the app — new features should find their home inside one of the three
   layers per the Vision section, not as a fourth page
2. If a page is truly needed (like the game pages), follow the structure of existing pages
   (inline `<style>`, inline `<script>`, grayscale tokens) and wire it into the shared modules
   (`router.js` conventions, `game-locks.js` if it's a game, profile card, i18n)

### Modify article display
Edit the article/library rendering in `kutuphane.html`.

### Modify admin CRUD logic
Edit the form submission and Supabase call handlers in `admin.html`.

---

## Assets

`assets/` is grouped into subfolders by kind: `assets/avatar/` (layered avatar base + hair overlays, see the Account & User Model section), `assets/mascot/` (onboarding/notification cat mascot), `assets/map/` (Istanbul/Turkey map images and the SVG source of truth). Ungrouped one-offs (favicon, close icon, district stickers, loading screen frames) stay directly in `assets/`.

| Asset | Path | Notes |
|-------|------|-------|
| Istanbul map | `assets/map/istanbul-map.png` | 416 KB, 2739×2057 px; embedded in SVG |
