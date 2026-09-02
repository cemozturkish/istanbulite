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

- **Middle — `anahane.html` (Hane, "home"):** the self and the people, and nothing else. The
  page **is the PETEK** — the shared honeycomb, drawn from where you are standing in it — with the
  **events** beside it and the user's own profile and avatar reached from the bar. "No matter where
  you are in Istanbul, Istanbul is your home first." Personal customization (avatar creation,
  profile) belongs to the middle — it is the user's anchor point. The map is not here: the city as
  a drawing is one swipe away on Kahvehane, where a district is a thing you actually choose. What
  is here is who you are standing next to and where you can go and meet them; the news is on the
  national side.
- **One direction — `kahvehane.html` (zoom IN, the local):** deeper into the neighborhood. The
  district/mahalle-level map, the **coffee price index** and local economy, the daily games, the
  scoreboards (who got what score), and the **events**. This is the *interactive* side of the app
  — where you engage with other Istanbulites, and an event is the one thing on the site that ends
  with you outside, standing next to one. The neighborhood comments used to live here too; they
  are parked while the events hold that column (`COMMENTS_ENABLED` in kahvehane.html).
- **Other direction — `kutuphane.html` (zoom OUT, Turkey):** the national layer. The Turkey map,
  **all of the news** (İstanbul, Türkiye, the districts and Dünya in one feed, down the left),
  articles, letters, politicians, TBMM. Deliberately **less interactive** than the local side:
  this page is for reading and observing, not for peer-to-peer interaction at a national level.
  Istanbulite is not a place to argue about Turkey with strangers.

### The map tells stories, not entries

The world map on Kütüphane is not a set of country articles. **A country is not a subject** —
what happens is never contained by one border, and a page that pretends otherwise has to keep
retelling the same events from each side. So the map is grouped into **stories**, and touching
any country in one lights every country in it and opens the story they share: Ukrayna lights
Rusya, Filistin lights Lübnan and Suriye and İran, Ermenistan lights Azerbaycan, Yunanistan
lights Kıbrıs, Ankara lights Türkiye. The reader learns the shape of a thing by seeing which
places light up together — that is the map doing work no paragraph does.

The rule this comes from, and the one to resolve future map questions with: **we show people
stories, not an information dump about every country.** A page here earns its place by being
about something that is *happening* — with a beginning, a chain of moments, and a place it
currently stands. Not a profile, not a fact sheet, not an encyclopaedia entry with a population
figure at the top. If a country has no story, it opens and says so; that is a better page than a
manufactured one. And a story is finite: it ends where the reader has enough to go and talk to
someone about it, which is the whole point of the app being on the other side of the swipe.

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
├── anahane.html          # HANE tab: home — the PETEK honeycomb itself, plus the events
├── kutuphane.html        # İSTANBULITE tab, OUTERMOST zoom: Türkiye — Turkey map, ALL news, articles, letters, TBMM
├── kahvehane.html        # İSTANBULITE tab, MIDDLE zoom: İstanbul — district map, games hub, scoreboards, events
├── mahalle.html          # İSTANBULITE tab, INNERMOST zoom: the reader's own ilçe and its mahalles
├── project.html          # PROJE tab: the flip book on its own, as a rig — 12 numbered frames, nothing else
├── sozcel.html           # Turkish Wordle-style daily word game
├── tumcel.html           # Turkish quote-fragment Connections-style daily game (replaced Bağlantılar)
├── bulmaca.html          # Turkish daily mini crossword
├── admin.html            # Admin dashboard (admin-only)
├── router.js             # Shared shell: single Supabase client, the two tabs + the zoom stack, virtual navigation, clock
├── sheet.css/.js         # THE sheet: the one page that rises from the bottom — see "Site-wide defaults"
├── profile-card.js/.css  # Profile bar (the phone's top bar), avatar, badges — shared across pages
├── onboarding.js/.css    # New-account onboarding flow
├── game-locks.js         # Per-day game on/off enforcement + the sequence's question gates
├── event-interest.js     # "İlgimi çekti": the verdict Kahvehane's event deck records, Hane reads
├── coffee-index.js       # Kahve Endeksi live evaluation: opening hours + scheduled discounts
├── ist-date.js           # THE Istanbul clock: every daily roll-over/date key derives from it
├── i18n.js               # TR/EN language toggle
├── palette.js/.css       # Theme tokens
├── map-parallax.js       # The map drifts behind the page as the phone tilts (mobile only)
├── home-map.js           # Swaps in the hand-painted map for the member's own district
├── avatar.js, mahalle-picker.js, map-zoom.js, person-mentions.js, politician-card.js,
│   tbmm.js, sozcu-mascot.js, admin-notification.js, loading-screen.js/.css,
│   safe-area-ready.js, frames.css        # Focused shared modules
├── capacitor.config.json # iOS app config (Capacitor wraps the same site — see README.md)
├── ios/                  # Generated Capacitor Xcode project (committed, minus Pods/build output)
├── scripts/sync-web.js   # Copies site files into www/ for the Capacitor build
├── db/                   # SQL migrations (see db/README.md); db/seed/ holds one-off data imports
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
> `game_results`, avatar item columns, `profile_badges` (cover badges), `politicians` +
> `political_seats` (one seat per district, the two fixed national/city ones, and one per country
> on Kütüphane's map — `db/political_seats_countries_seed.sql` fills that last set), TBMM
> seats/parties, `mahalles`, `admin_notifications`, Sözcel sözcü assignments, `coffee_prices`
> (the Kahve Endeksi — v3 adds the opening-hours and scheduled-discount columns that make it
> live), `coffee_comments` (what members say about a venue), `countries` + `country_entries`
> + `country_entry_events` + `country_stories` + `country_story_countries` (what a country on
> Kütüphane's map opens, the key-moment timeline an entry can carry, and which countries light
> and open together as one story), `world_events` + `world_event_moments` +
> `world_event_countries` (the OLAYLAR — the world events themselves, with their per-olay colour,
> where their paper hangs on the map, the countries an open one lights, and their chapters —
> oldest first, each optionally carrying its own photo) and `breaking_news_countries` (which
> countries a Dünya story is about, lit on that map when the story opens), and more). When in doubt, read the relevant `db/` file — it is the
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

**Tables: `daily_questions` + `question_answers`** — the question between two games
(`db/daily_questions.sql`).
- The three games are a **sequence with a question in each joint**: play Sözcel, answer a
  question, play Tümcel, answer another, play Bulmaca, answer the last. The questions are the
  point of the sequence rather than a garnish on it — they are how the site learns what its
  members actually think, from people who are already here rather than from a survey nobody opens.
- `daily_questions`: `id`, `question_date`, `after_game` (`sozcel`/`tumcel`/`bulmaca` — the game it
  is asked *after*, which is its position in the sequence), the body and two options in TR and
  optional EN. Unique `(question_date, after_game)`: three slots a day, one question each.
- `question_answers`: `(question_id, user_id)` PK, `choice` (`a`/`b`). **Insert-only** — there is
  deliberately no UPDATE policy: an answer is what you thought when you were asked, and a row that
  can be rewritten later is not that.
- RLS: questions readable by everyone signed in, writable by the admin alone. An answer is
  readable by **its own author and the admin**, and by nobody else; there is no policy that lets
  one member read another's. The count the card prints back comes from `question_tally(question_id)`
  (SECURITY DEFINER, two integers, no identities) — Kütüphane's news polls show who voted, these do
  not, because a poll about a news story is a public opinion and these are closer to the member.
- **No data, no gate.** Every lock the client applies is conditional on a question existing for that
  day (`GATES` in `game-locks.js`): a day the admin left empty behaves exactly as the site did
  before this file existed. A feature that locks the app when its content table is empty is a
  feature that takes the app down.
- Curated from admin.html's Oyunlar tab → **Sorular** panel (date × game, both languages).

**Table: `sozcel_used_answers`** — one row per Istanbul day: that day's Sözcel answer (`db/sozcel_used_answers*.sql`).
- `used_on date pk`, `word` (unique across all days, so an answer never repeats), `definition`, `syllables`, `sozcul_id`, `created_at`.
- **The word is server-authoritative.** Clients never write today's row; they call `public.sozcel_daily_word(candidates text[])`, which resolves the Istanbul date server-side, returns the day's word if it has one, and otherwise records the first unused candidate — atomically, so simultaneous first-players of the day converge on one word (`db/sozcel_used_answers_v5_server_pick.sql`). The client's candidate list is only a proposal.
- This exists because the pick used to be client-side: the answer's index was `hash(date) % pool.length`, so two clients whose snapshot of the used rows differed by a single row computed different words, and whoever lost the insert race kept playing their own word anyway. Never reintroduce a client-side fallback pick — a locally-invented word looks normal while being a puzzle nobody else is playing, and its result lands on the shared scoreboard.
- RLS: authenticated users SELECT all; direct INSERT only for an assigned Sözcü's *own* row before its deadline (midnight Istanbul at the start of `used_on`), matching the UPDATE policy; DELETE admin-only.
- **The admin is never locked out** (`db/sozcel_used_answers_v6_admin_override.sql`): admin INSERT/UPDATE policies sit alongside the Sözcü ones, with no `sozcul_id` match and no deadline, because a word that is wrong *on the day it is being played* is exactly the case that has to be fixable and the one moment every other policy refuses. The admin reaches it through the same Sözcü Görevi form on `sozcel.html` — the button opens a day picker instead of an assignment, and saving preserves whoever the row already belonged to, so correcting a day never takes it over. `game-locks.js` matches: the admin isn't bounced off a game they switched off for the day (they own the switch), though the win-gates still apply to everyone since those are the game's own progression.

**Tables: `hive_slot_offers` + `hive_cells` + `hive_bonds`** — the petek, which is Anahane itself
(`db/hive_lattice_v4.sql` for the grid, `db/hive_slot_codes_v5.sql` for the codes; together they
supersede the six-slot `hive_slots` and the weekly `hive_codes` of `db/hive_slots*.sql`).
- The petek is **one shared grid**, not a comb per member. A member is a single hexagon at axial
  coordinates on a map; attaching to somebody makes you their neighbour on a grid everybody is
  standing on, and a third member attaching to either of you arrives into the shape those two have
  already made. A petek that is redrawn per viewer is not one object, it is a picture of one —
  which is exactly what the old design was, and why it was replaced.
- `hive_slot_offers`: **the code belongs to the empty seat, not to the member**
  (`db/hive_slot_codes_v5.sql`). `code` PK (6 chars, no I/O/0/1), `owner_id`, `dir` (which side of
  the owner's own hexagon the seat is on), `expires_at` (ten minutes), `claimed_by`/`claimed_at`.
  Tapping a free side mints one on the spot; you read it out to the member in front of you, they
  type it in and land in that exact place, and it is spent. Nobody carries a code around any more —
  there is nothing to pass on afterwards and nothing to look up, which is the hand-to-hand rule
  made literal. It replaces `hive_codes` (one code per member per week, from `db/hive_slots.sql`):
  a code that identifies a *person* for a week is a small permanent handle on them, and it left the
  newcomer, not the owner, deciding where on the grid they would stand. RLS: **no client policies
  at all** — a member mints through `hive_offer_slot(dir)` and spends through `hive_claim_slot(code)`,
  and claiming has to resolve a row the caller was never allowed to see.
- `hive_cells`: `user_id` PK, plus `map_id` and `(q, r)`. Unique `(map_id, q, r)` — two members can
  never stand in the same place — declared **deferrable**, because a merge moves a whole map in one
  statement and only its end state is meaningful. A `map_id` is not a row in a table of its own: a
  map is exactly the set of cells sharing an id, so merging two is an update of the losing id. A
  member who has never attached to anyone **has no cell at all** — they are their own hexagon with
  six free sides, and they join the grid on their first attachment.
- `hive_bonds`: `(a, b)` PK with `a < b`, plus `map_id`, `bonded_at` and `locked_until`. Stored once
  per pair, unordered, because an attachment has no direction: there is no owner of a bond and no
  follower in one.
- **A bond is locked for the week it was made in.** `locked_until` is the *next* week's start;
  `hive_unbond` refuses with `locked` until then. A petek that can be unpicked the moment it is
  built is a drawing, not a structure.
- **Merging preserves both formations exactly.** Attaching two members already on different maps
  carries the smaller map over to the larger one's frame **rigidly** — rotated by a multiple of 60°
  and shifted, never rearranged — so every existing neighbour stays a neighbour at the same angle.
  The tapped side is tried first, then the caller's other free sides, each in all six rotations; if
  nothing lands without a collision the attach is refused (`no_room`) rather than moving anyone.
  Nobody's formation is ever disturbed to make room for a newcomer.
- RLS: **no client policies at all** on either table. The grid is read only through `hive_map()`,
  which hands back the one map the caller is standing on, relative to them — it is not a directory
  to be enumerated, and every write has to resolve a code the caller is not allowed to read.
- Functions: `hive_map()` (SECURITY DEFINER; the caller's map with the caller at `(0,0)`, each row
  carrying `bonded` and `locked` for the caller's own attachments), `hive_offer_slot(dir)`
  (SECURITY DEFINER; mints that seat's code and returns it with its expiry — one live offer per
  side, and tapping the same side again replaces it rather than leaving two doors into one seat),
  `hive_claim_slot(code)` (SECURITY DEFINER; returns a *status* the UI words itself — `ok` /
  `invalid_code` / `expired` / `spent` / `self` / `already_bonded` / `dir_taken` / `too_far` /
  `no_room`, see `profile.hive.err.*` in `i18n.js`), `hive_unbond(member_id)` (SECURITY DEFINER;
  Çıkar, clearing the one bond both ways and releasing the cell of anyone left attached to
  nothing), plus the helpers `hive_dir(d)` and `hive_rot(q, r, k)`. **The direction is the offer's,
  not the claimer's**: whoever opened the seat decided where it is, which is the whole point of the
  code being the seat rather than the person.
- **Directions are numbered 0-5 the way the drawing reads them** — `0 (0,-1)`, `1 (+1,-1)`,
  `2 (-1,0)`, `3 (+1,0)`, `4 (-1,+1)`, `5 (0,+1)` — and `HIVE_DIRS` in profile-card.js must match
  `hive_dir()` exactly: the server decides where a member lands and says so in these terms, so
  renumbering either side silently mis-aims every tap. (It is also the old slot numbering, which is
  why the migration reproduces most old combs cell for cell.)
- Two edges the attach decides rather than guessing at: joining someone else's petek takes the side
  of them that puts them on the side of you that you tapped, falling back to any free side of theirs
  (being attached at all matters more than the exact angle); and two members already on the **same**
  map who are not adjacent are refused with `too_far`, because moving either of them would drag a
  formation other people are standing in.
- The old `hive_slots` rows are embedded onto the grid by the migration at the bottom of
  `db/hive_lattice_v4.sql`: each connected group is walked breadth-first, keeping each pair's old
  direction where the cell is free. A bond whose two members end up placed but not adjacent is
  dropped — the shape on screen has to be the truth about who is next to whom.

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
- Once a session exists (or right after sign-in), redirects to `project.html` — the flip book,
  which is the app (it used to be `anahane.html`)

### `anahane.html` — Hane (MIDDLE page, home)
- The entry point and anchor of the three-page carousel — the user always starts here
- **The page is the petek** (`IstProfileCard.mountHivePage`, see Site-wide defaults and
  `db/hive_lattice_v4.sql`): one shared honeycomb, your own frame in the middle and everybody you
  are standing next to around it, each attachment made by entering that member's weekly code.
  It was a sheet opened by a button over a map; it is the middle page itself now. There is nothing
  to open and nothing to close — you arrive and you are standing in it
- **There is no map on Hane.** The Istanbul map lives on Kahvehane, which is where a district is a
  thing you are actually choosing (a mahalle, an event, what a cup costs there). Hane had the same
  drawing with nothing to pick on it. **Hane names no seat at all** — the profile bar over it
  carries you alone, centred in the row. A seat names whoever holds power over what the page is
  showing, and what this page shows is the people; there is no map on it for a seat to be true of,
  and the two sides are where power is a fact (Kahvehane's district, Kütüphane's countries). The
  one thing that ever stands in your place there is **another member**, put there by pressing their
  hexagon on the petek — which is the people again, not a seat (see the petek's own section)
- **The events are the column beside it** (`#events-panel`, `events` / `event_rsvps`). They belong
  next to the petek: the petek is who you are standing next to, an event is the one thing on the
  site that ends with you actually standing next to them. Opening a card **grows it into the
  column's own band**, in place — the same primitive Kütüphane's news page and Kahvehane's event
  page use (`IstSheet.grow`, `openEventGrowPage`), measured onto the strip's own box
  (`measureEventGrowBand`). And it is the same three-part page a story opens as over there: what it is and the way
  back out (the hand-drawn arrow) on the top line, the event scrolling in the middle, the **RSVP
  row** standing on the bottom line where it cannot scroll away
- **The petek above it does not move, and that is what the column's fixed height is for.** Row 1 of
  the phone grid is `minmax(0, 1fr)` — everything the events take comes out of the petek's own box,
  so anything that changed this column's height visibly slid the reader up or down the screen. So
  the column is a **fixed box** (`--hane-events-h`, see the petek's own section): the same size on
  a night with three things on, a night with none, and while a card stands grown open in it.
  Nothing about the layout changes on a press or on a render — only what is drawn inside a box that
  was already that size
- **There is no throw on this page.** A kept event has already had its verdict given on Kahvehane's
  deck — that is what put it here — so the one thing this page asks is whether you are **going**,
  and it asks it with a button rather than a gesture. The deck's left/right verdict belongs to the
  page where the whole city's calendar is being sorted; a second, different meaning for the same
  throw on the page holding what survived it would make both unreadable
- **And the petek answers it** — this is the page's whole point, so both marks stand **inside** the
  drawn hexagon, either side of its foot, never in a corner of the cell's box: the box is not the
  drawing (the silhouette is inset, and its bottom is a point), so a badge in a corner lands in the
  paper between hexagons, belonging to nobody, and two neighbours' badges meet in the same gap. With
  a card open, the reader's own honeycomb is marked
  (`IstProfileCard.paintHiveEventMarks` / `clearHiveEventMarks`): the ink/paper corner dot is the
  **verdict** a member gave the event on the deck (`hive_event_interest_status`), and a red disc in
  the opposite corner is that they are actually **going** (`hive_event_rsvp_status`,
  `db/hive_event_rsvp.sql`). Two facts, kept apart on purpose — "there is somebody to go with" and
  "somebody is going" are not the same thing. The reader's own hexagon is painted from what the
  page already knows (`myRsvpIds`), which is also what lets the mark land the instant the button is
  pressed; both RPCs answer only for the caller's own map and only for the events it names, the
  same fence `hive_member_status` stands behind. The ring is deliberately left alone: red on a
  hexagon's ring already means "this is the one named on the bar"
- **Set like Kahvehane's own event cards** — the kicker, the title, the meta and the page's whole
  type scale are that page's numbers (`.ev-card` / `.event-page-*` in kahvehane.html), not a second
  set: it is the same object on both pages, and what the reader threw right over there is what
  stands here. The ink is `--ink`/`--muted` with it, so the cards follow the palette instead of the
  fixed dark they carried from the days they floated over a map photo — which on the dark theme was
  dark text on a dark card
- **And it is what the member KEPT, not the city's whole calendar** (`keptEvents`,
  `event-interest.js`). The calendar is dealt with one card at a time on Kahvehane — thrown right
  is "ilgimi çekti", thrown left is gone (see that page's own section) — and this column is the
  other end of that gesture: the evenings that were actually theirs, standing beside the people
  they would be standing next to. A list of everything on in İstanbul is a listings page; this is a
  plan. Three empties, and they say different things — a city with nothing on says exactly that
  (`events.none`), a city with events on and none of them kept says one line pointing at the deck,
  and a fetch that *failed* says so (`events.failed`, `eventsFailed`) rather than reporting an empty
  calendar the phone never actually saw — but **all of them say it inside the same dashed frame**
  (`.events-empty`), the rule Kahvehane's
  own decks already follow: a column with nothing in it at all reads as the page being broken
  rather than as there being nothing on, and this column stands directly under the petek, where its
  absence moved the drawing itself. If the store is missing entirely the column degrades to the
  whole city's list rather than to an empty page — that is the failure a reader can make sense of
- **A verdict lives in the reader's own browser, but a browser is not a member**
  (`IstEventInterest.hydrate`). What was thrown right on Kahvehane's deck is kept in `localStorage`,
  which is right — it is the reader's working state, not something anybody else may read — but a
  cleared cache, a second device or the app beside mobile Safari left the evenings they kept
  nowhere. Their own rows of the deck's server mirror (`event_interest`,
  `db/hive_event_interest.sql`) are read back on load and merged in for keys this browser has never
  had a verdict for, so what the reader did on THIS device always wins. Best-effort in every
  direction: a database without the migration answers nothing and the column behaves exactly as it
  did before. And Kahvehane never prunes the store against an **empty** fetch — a request that
  returned no rows cannot tell "the city has nothing on" apart from "this request saw nothing", and
  pruning against it wiped every verdict the member had
- On a phone the petek stands in the hero square the map used to hold and the events hang from the
  bottom of the band below it, so the hero line is exactly where it is on the other two pages
- **The petek has three depths and the reader pulls up and down through them** — you alone at the
  innermost, the six places touching you in the middle, the whole shape at the outermost, where the
  seats can actually be handed out. One drawing zoomed, not three pages; see the petek's own section
  under Site-wide defaults
- The personal layer lives here: the user's own profile, avatar, home identity. Opening your
  profile card on this page shows the cover alone — the petek is the page, not a block inside your
  account, and what is yours to change is printed on the petek's innermost depth
- Vision: this page is "you + the people" — see Vision & Product Philosophy above

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
- **Olaylar tab** curates the world events (`world_events`) Kütüphane's middle box opens —
  the olay itself (including its own colour and where its paper hangs) on the left, and on the
  right a list whose every card carries its own chapter editor, oldest chapter first, each with
  a room for its own lead photo. See "OLAYLAR — the world events themselves" below for what an
  olay is and how it differs from a seri and from a country hikâye
- **Oyunlar tab** combines all three games' admin panels in one place: a shared per-day
  on/off board (next 7 days × Sözcel/Tümcel/Bulmaca, backed by `game_day_toggles`) at the
  top, then sub-nav pills to switch between each game's own management panel (Sözcel sözcü
  assignments, Tümcel puzzle editor, Bulmaca which has no manual content — puzzles are
  generated, so its panel is just a pointer back to the on/off board, and **Sorular**, where
  the question that follows each game on a given day is written in both languages — see
  `daily_questions` in the schema above). Toggling a game off
  for a day locks it site-wide for that day (enforced by `game-locks.js`, see Database Schema above and Assets/coding conventions below).

### `kahvehane.html` — Coffeehouse (RIGHT page, zoom IN — the local, interactive side)
- Istanbul district map with mahalle-level picker
- **Two buttons stand in the two top corners** (`.corner-boxes`), the same pair Kütüphane's
  Makaleler/Posta Kutusu boxes are: the **Kahve Endeksi** on the left (`#coffee-box`, see below)
  and the week's **Skor Tahtası** on the right (`#scoreboard-box`)
- **The band under the map is TWO decks**: the city's events in its bottom-left corner
  (`#events-deck`), the day's games in its bottom-right one (`#game-deck`). On a phone `#main-site`
  is two equal columns in row 2 — `.col-left` holds the events (the mayor's card and the parked
  comments inside it stay hidden), `.col-right` the games — and each deck fills its own half, so
  the channel between them is exactly the distance each keeps from its own outer screen edge
  (`--deck-inset` / `--deck-channel-pad`, stated once on `#main-site` because the two halves have
  to agree or the channel is off-centre). That is why the decks stretch rather than sizing to their
  own cards, as the games deck did while it *was* the whole band: two content-width decks leave a
  gap whose width is decided by whichever card carries the longest word
- The **neighborhood comments are parked**, not deleted: their column belongs to the index and
  where the comments belong is still an open question, so the feed, its composer and everything
  driving them stay exactly as they are behind `const COMMENTS_ENABLED = false` plus `hidden` on
  `#discussion-section`. Turning both back on is the whole of re-enabling it. Comments are still
  posted only to your own neighborhood (RLS enforces it)
- This is where the NYTimes-like games live, there are three of them:
  - Sözcel: Turkish Wordle
  - Tümcel: Turkish quote-fragment Connections (replaced Bağlantılar)
  - Bulmaca: Turkish crossword
- The games change every day; scores and scoreboards are tracked (`game_results`)
- **The three games are a sequence with a question in each joint, and on a phone that sequence is
  a DECK** — the same object Kütüphane's news is, in the same terms (`#game-deck`, `buildGameDeck`;
  `daily_questions`, see the schema above). One card is in front of you at a time: play the game on
  top, come back, the question that follows it is standing there, throw it left or right and the
  next game is already behind it. The depth is `nth-child` and nothing else, so dealing the front
  card is *removing the node* — the ones behind transition forward on their own. A game played
  today and a question already answered are simply not in the deck; when nothing is left it says
  "Hepsi bu kadar. / Dışarısı seni bekliyor.", the same bottom Kütüphane's deck has
- **And a game card is a news card**, printed on the same paper in the same band: a kicker saying
  where in the day's sequence it stands (1./2./3. OYUN, `games.step1-3`), the game's name as the
  headline, what it is under that — the type sizes are `.article`'s own. Three squares side by
  side said nothing about order; a stack of cards in order says it without a word. The deck sits
  in the band's **bottom-right corner** — down against the tab bar like every other phone stack
  (`margin-top: auto`), and filling its own half of the band (`align-self: stretch`; see the two
  decks' channel above for why it no longer keeps the cards' own width). A game already played today is inked over the way a story you have dealt
  with is gone — *played* meaning finished (`attempts >= 1`), never merely opened: a game left
  half-done stays on top of the deck, marked, because it is exactly what the reader still has in
  front of them. Sözcel's
  A game the admin has switched **off** for the day (`game_day_toggles`) is not in the deck at
  all — it is not a step the reader has left to take, and a card that can never be dealt is a deck
  that can never be emptied. So a day whose only game is Sözcel ends on "Hepsi bu kadar." the
  moment Sözcel is done, exactly as Kütüphane's news deck does. **An emptied deck's dashed frame
  takes the band's own width** rather than its text's: a box whose width is decided by a line of
  type lands on a fractional pixel, and WebKit drops the LEFT edge of a dashed border sitting on
  one — the frame printed with three sides and no visible reason for the fourth to be missing.
  Stretching it (`:has(> .deck-done:only-child)`) puts both edges back on whole pixels, and is the
  right picture anyway, since that is the width the same frame has always had on Kütüphane. The admin keeps theirs, the same
  way their nav link stays open (`IstGameLocks.offGamesToday`, game-locks.js). Sözcel's
  wordmark is a tile's way of saying its name — in the deck it says it in the headline like every
  other card. The desktop three-square tiles are untouched
- **The events are a deck in the other corner** (`#events-deck`, `loadKahveEvents`,
  `event-interest.js`) — the same object as the games beside it and as Kütüphane's news, in the
  same terms: cards laid on top of each other, only the front one live, the depth `nth-child` and
  nothing else, dealt by being *thrown* rather than by being opened. An event card is a news card
  too: kicker (the district — this page has a map, so the word has something to point at), the
  event as the headline, when it is under that. The deck is the **whole city's**, never the
  district the map is scoped to: an event is a reason to cross town, and a list that quietly shrank
  to the district under the reader's thumb would be the app talking them out of exactly that. **The
  corner is never blank**: the two empties still say different things — a deck the reader emptied
  themselves is told so and pointed at the door, a city with nothing on says exactly that
  (`events.none`) — but both say it inside the same dashed frame (`deckFrameHTML`), because a
  corner with nothing in it at all reads as the deck being broken rather than as there being
  nothing on. Kütüphane's news column still goes blank when there is no news: that is a whole
  column over a map, and an apology printed across it is a bigger object than this one
- **What the throw means here is a verdict, not "next"**: right is **İlgimi çekti**, left **İlgimi
  çekmedi**, stamped on the paper as it goes (`.ev-swipe-cue`) so nobody gives a verdict they never
  saw. **And the throw is the only way to give one** — there is deliberately no row of buttons on
  the page: it is the one thing this page asks of the reader, and a page carrying both says the
  gesture is the shortcut and the buttons are the real way, which is the wrong way round. It is
  also the gesture the news deck and the question cards have already taught. A desktop reader has
  no finger, so there the mouse drags the page itself (`wireEventPageSwipe` binds both, one set of
  three steps behind them). What is thrown right is
  what Hane prints beside the petek — so the two pages are one move: you sort the city's calendar
  on the local side, and what you kept is waiting for you in the middle. That is the mall stairway
  in its smallest form: the member who came for the games walks the whole city's calendar on the
  way, and leaves with the two or three evenings that were actually theirs. The verdict is kept per
  member in `localStorage` (`ev_interest_<uid>`), the same store the news deck's dealt list is and
  for the same reason — a verdict is the reader's own working state, not something anybody else is
  entitled to read. `event-interest.js` is its own file because both pages need it and the two
  share one document under router.js, where a copy in each page's script is a copy that drifts
- **A card opens into the band, not over the map** (`#event-overlay`, `openEventPage`,
  `growEventPage`) — the same object, and the same argument, as Kütüphane's news page: the page
  lights the event's district on the map above (`lightMapDistrict`), and a sheet rising over that
  map would cover the very thing it had just lit. So on a phone the tapped card *grows* into the
  whole band — both halves, its own and the games' — off a `clip-path` measured from the card's own
  box, and folds back into it on the way out. Head / body / foot, only the middle scrolling. On
  desktop there is no band and no map to protect, so it stays THE sheet
- **The band under it goes quiet, and so does everything but the city** — the same tint the Kahve
  Endeksi and the Skor Tahtası rise with (`.ist-sheet-dim`), which stops at the hero line and is
  then painted over the map by the map's own traced overlay, with the districts punched out of it
  (see THE sheet's own section). Here the tint takes no taps at all: the whole band is
  the page, so there is no backdrop left to press, and the map above has to stay live
- **The direction is the answer**, exactly as on a news story: right is the first option, left the
  second, and the option is stamped on the card as it goes (`.q-cue`) so nobody answers a question
  they never saw. The two buttons say the same thing for a mouse. Tümcel stays locked until the
  question after Sözcel is answered, Bulmaca until the one after Tümcel is (`game-locks.js`) — this
  is the mall-stairway principle in its smallest form: a member who came only for the games still
  says what they think on the way to the next one. Answering prints back one number — how many
  other people answered the same — and no names
- **Desktop has no deck**, the way the news column there is a list rather than a deck: the three
  tiles all print, and the question card simply stands above the tile it is holding shut. Because
  the phone deck's depth is `nth-child`, a card taken out of it is removed from the DOM rather than
  hidden — a hidden child still counts, and one left in place would push the next card past the
  rule that stops drawing them
- The **coffee price index** (Kahve Endeksi, `coffee_prices` table) opens from **the top-LEFT
  corner button** (`.corner-boxes` > `#coffee-box`) as THE sheet (`#coffee-overlay`), which
  is where `#coffee-index-panel` itself now lives: the cheapest cup of coffee per venue, in the
  district the map is scoped to or all of İstanbul. It stood open as the left column for a while;
  it is a destination again, because what the band under the map is *for* is the day's games — a
  member who came for the games walks past the whole city on the way, which is the point, and the
  board is one tap off that path rather than half of it. Still **one** surface, not two: the same
  panel node, the same ids, the same board, wherever it is standing. It keeps its own overlay
  rather than sharing `#kahvehane-detail`, whose body `openDetail` paints over wholesale for the
  politician card. Scoping still follows the map even while the sheet is shut, so opening it never
  shows the wrong district. **Read-only for everyone** — the index is curated from the admin portal only
  (admin.html's "Kahve" tab), and RLS allows writes to the admin alone
  (`db/coffee_prices_v2_admin_only.sql`)
- The **weekly scoreboard opens from the other corner** (`#scoreboard-box` → `#scoreboard-overlay`,
  THE sheet). It needed a door of its own because the games are **fleeting**: a game card is dealt,
  played and inked over, and the board only ever surfaced as the desktop panel that slides in over
  the discussion feed *while a game is open* (`.game-score-slide`, >1240px) — so on a phone the
  score a member had just earned was nowhere to be seen the moment they finished. There is still
  **one** board and not two: the single `#scoreboard-board` node is moved into the sheet on opening
  and put back into `.game-score-slide` after it closes, so every `#scoreboard-*` id
  `loadScoreboard()` targets stays exactly one element wherever the board is standing. It re-reads
  on each opening (a week rolls over while a page stays open) and follows the map's scope, the same
  rule the index follows

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
- **Clicking a row drills the board into that venue**, in place, with a back link — the same
  move on every screen. Nothing slides in over anything and nothing rises on top of it: you tapped
  a line in a list and the list became the thing you tapped. Built by `renderVenueHTML()`. The panel carries the venue's live price and status, its week's
  opening hours (today's line inked), and **`coffee_comments`** — the members' half of the
  index. The venue's district stays lit on the map for as long as its panel is open, and the
  panel's live block re-renders on the same 30s tick as the board without disturbing the
  comment list or a half-typed comment

### `kutuphane.html` — Library (LEFT page, zoom OUT — the Turkey/national side)
- Turkey map; **all the news**, articles, shelves, letters (Posta Kutusu), politicians, TBMM chart
- **Every breaking story is here now**, in the left-hand column (`#dunya-news-feed`, still named
  for the Dünya feed it grew out of): İstanbul, Türkiye, the districts and the world in one feed,
  each card kickered with its own category. Hane used to carry the first three; there is one place
  on the site where the news is
- **The feed is a deck on a phone, not a list.** The newest story stands on top, the rest behind
  it, and the depth is `nth-child` and nothing else: every card sits in the same grid cell of
  `#dunya-news-feed`, and the two behind are pushed up and back a step so their edges show.
  Promoting the next story is *removing the front node* (`dealDeckCard`) — the ones behind
  transition forward on their own instead of being re-rendered there. The order is the deck's own
  rule, not the query's: `undealtNews()` sorts by `updated_at` itself, so the newest story is on
  top by construction. Past the third card the
  picture stops changing; the rest stay in the DOM (the desktop column still prints the whole
  list, and the fourth has to be standing ready) but are not drawn. Only the top of the deck takes
  a tap. Desktop keeps the scrolling list
- **A story leaves the deck by being swiped, not by being opened** (`wireNewsPageSwipe`,
  `dealNewsPage`). The arrow at the top of the page puts it back on the deck; a throw left or
  right is done with it, and the deck advances *behind* the page while it is still flying out, so
  the next story is already standing there as the paper clears. Where the story is asking
  something — the newest `breaking_news_polls` row the reader hasn't answered — the direction is
  the answer (right is `option_a`, left is `option_b`) and that option is stamped on the page as
  it moves, so nobody answers a question they never saw; a story with nothing open to answer
  swipes away just the same, unstamped
- **A story that has been dealt with comes back only when it has actually moved.** What is kept
  per member in `localStorage` (`dunya_dealt_<uid>`) is not "this story is done" but the story's
  own `updated_at` *as thrown* — so a gelişme landing on its timeline (which bumps
  `breaking_news.updated_at`; a deliberately backdated one does not, see `addNewsUpdate` in
  admin.html) puts it back in the deck, and back on **top** of it, because the deck is ordered by
  that same column. A story that has not moved stays gone. The store is pruned to the stories
  still in the 72h window, and the earlier stampless format (a plain array) is migrated on the
  next fetch by stamping each entry with the story as it currently stands. A deck that refills
  itself on every reload is one nobody can reach the bottom of, and reaching the bottom is the
  point — the empty deck says so and points at the door
- **A story opens into the band it was lying in, not over the map** (`#news-overlay` /
  `#news-page`). On a phone the tapped card *grows* into the whole strip between the hero line and
  the tab bar — run by `growNewsPage` off a
  `clip-path` measured from the card's own box — and folds back into that card on the way out. It
  is deliberately not the pulled sheet the rest of this page uses: a story lights the countries it
  is about (`setNewsCountryHighlight`), and a sheet rising over the map covered the very thing it
  had just lit, so the reader had to drag the page back down to see it. The page's two sides are
  measured off the feed's own content box (`measureNewsPageBand`) so it comes out of the card with
  its edges already on the card's edges; the map above stays live and untouched, and touching a
  country there opens that country over the top (`initNewsPage` watches `#reader-overlay` and folds
  the story away). On desktop there is no band and no map to protect, so it stays THE sheet
- **The lit countries breathe while the story is open** (`.country.news-active`, a slow 1.9s
  pulse in fill and stroke). A static tint says "these are selected"; a pulse says "this is what
  you are reading about, up there, now" — the one thing the page down in the band cannot say for
  itself, being nowhere near the drawing. Slow and even rather than a hard blink: the map is
  hand-drawn scenery, and a flashing shape over it reads as an alarm. Every shape of every country
  in the story takes the class in the same frame, so the whole story pulses on one beat instead of
  as a set of places that happen to be lit; `prefers-reduced-motion: reduce` holds it lit
- **A card presses like a button**: it gives under the finger (`.pressing`, scale 0.955) and pops
  past its own size when released (`.released`, a keyframed 1.022 — the travel is too small for a
  springy easing to overshoot visibly), which is the first frame of it growing into the page. It
  replaced a sideways `:hover` nudge, which a touch screen cannot take back: the tapped card was
  left sitting 6px off in plain view behind the page it had just opened. The press is a class
  driven by pointer events (`wireCardPress`) for that reason — `:hover` and `:active` both stick
  after a tap on iOS — and only a real `pointerup` pops, so a flick down the feed doesn't
  announce a press the reader never made
- The page is **head / body / foot**, and only the middle moves: what the story is (kicker, age)
  on the top line, the story and its Zaman Akışı scrolling in the middle, and where it is
  happening on the bottom line — the caption to the highlight burning on the map right above it —
  with the sources at the other end of that line, opening as a drawer that slides up to it. The
  two lines are furniture rather than sections because the band is short and those are exactly the
  two things that must not scroll away. A story reached by touching the *map* is a different route
  and keeps its own page in the reader sheet (see `openCountryEntryReader`); the objects printed
  inside either — sources, the timeline, its polls — are one set of rules
  (`:is(.article, .news-page)`)
- **Two small buttons on the line under the profile bar**: **Olaylar** in the left corner and
  **Posta Kutusu** (with its unread badge) in the right. They used to
  be full-width cards stacked down that column; the column is the news column now, so what is left
  of them is the smallest thing that still reads as a door. On a phone they are pinned there
  (`position: fixed`) over the map rather than being a grid track of their own
  (`justify-content: space-between` across the line is the whole of the geometry). The strip
  between them
  is map, so it takes no taps (`pointer-events: none` on the column, `auto` on the buttons) or it
  would swallow every touch on the districts under it. **Makaleler is parked**, not deleted: the
  shelves, their reader and `openLibraryShelvesSheet` are untouched behind a `hidden` on its box,
  the way Kahvehane's comments are parked behind `COMMENTS_ENABLED` — removing the attribute is
  the whole of bringing it back (`.lib-box[hidden]` exists because the author `display: flex`
  would otherwise beat the UA stylesheet)
- **A story is entered in both languages** (`db/breaking_news_v2_bilingual.sql`): the Turkish
  `title`/`body` stay required and are what every reader sees by default, and an optional
  `title_en`/`body_en` is used only where the reader's `language_pref` is English *and* that half
  was actually written — so a story translated by halves still reads in Turkish rather than going
  blank. `breaking_news_updates` carries the same pair, because a gelişme is part of the same story
  and a Zaman Akışı that reverts to Turkish half way down is worse than one nobody translated. One
  helper on each page that prints a story (`newsText(row, field)` in kutuphane.html and
  project.html) makes that choice; Kütüphane rebuilds the feed and the open page when the language
  changes. Both halves are entered from admin.html's Haberler tab (post form, edit form, and each
  gelişme's own form), and a story with no English half is labelled "EN yok" in the list.
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
- Touching a country also **swaps the seat** the profile bar names (at this page's left end) to
  that country's leader — see the seat card's own section under Site-wide defaults. Deselecting (tapping the sea, or closing the
  country's page) puts the Cumhurbaşkanı back; `resetMapLabel()` is the one place that knows what
  "nothing is selected" means, so nothing else may clear the selection by hand
- **Touching a country opens a story, not a country** (`country_stories`, see its own section
  below). Countries that share one are lit together the moment one of them is touched, and open
  one page carrying all of their entries. What opens is a **news page, not a chapter**: the
  entries are the same `.article.openable` cards the Dünya feed prints, and opening one gives
  the same `.article` a story gives — kicker (the country the entry is filed under), headline,
  body, its Zaman Akışı, source. There is deliberately no second page type here; a story reads
  the way a news item reads. The one thing that is this page's own is its head: the hand-drawn
  arrow (`assets/back.png`, the same one the game pages use) alone in the corner, with the
  story's name centred on the top line and its one-line blurb under it — no worded back button,
  because the reader arrived by touching the drawing. `arrowHeadHTML()` builds it, and an
  entry's own page passes no title, so the arrow stands alone over the article exactly as it
  does on a Dünya story's page
- An entry can carry a **Zaman Akışı** (`country_entry_events`) — a chain of dated key moments,
  the way a `breaking_news` story grows `breaking_news_updates`, reusing that timeline's own
  `.timeline-*` markup and printed **newest first** just like it. The only difference is the
  stamp: a moment carries its date rather than its age, because these chains reach back to 1917
  and "109 yıl önce" tells a reader nothing. Curated from admin.html's Ülkeler tab;
  `db/seed/country_entries_seed.sql` and `db/seed/country_stories_seed.sql` hold the starting set
  (Rusya–Ukrayna, Putin Rusyası, Filistin–İsrail, Lübnan, Suriye, İran–İsrail, Karabağ, the
  closed Türkiye–Ermenistan border, Kıbrıs, the Ege, and Türkiye's own decade)

### The map is grouped into stories — `country_stories`

Nobody touches Ukrayna to read about Ukrayna. They touch it because there is a war there, and
that war is also Rusya. So the countries on Kütüphane's phone map are grouped into **stories**
(`db/country_stories.sql`): touching any member lights **all** of them and opens one page
carrying every member's entries. Five of them, and they are the reason the map is worth
touching at all:

| Story | Countries |
|---|---|
| Rusya–Ukrayna Savaşı | Ukrayna, Rusya |
| İsrail Cephesi | Filistin, Lübnan, Suriye, İran |
| Ermenistan–Azerbaycan | Ermenistan, Azerbaycan |
| Yunanistan ve Kıbrıs | Yunanistan, Kıbrıs |
| Türkiye | Türkiye, Ankara |

Four things about it:

- **An entry never moves; the reader's route to it does.** There is no content table here — a
  story's pages are the ordinary `country_entries` of its members, gathered into one list. Each
  card is kickered with the country it is filed under (FİLİSTİN, LÜBNAN, SURİYE, İRAN down one
  page under "İsrail Cephesi"), which is what makes the grouping legible rather than a merge.
- **A country belongs to at most one story**, enforced by `country_story_countries.country`
  being the primary key: the map must answer "what lights with this?" with one row, not with a
  set of candidates. A country in no story is unchanged — it lights alone, under its own name.
- **Being in a story is about what lights, not about what opens.** Ankara still opens the TBMM
  sheet (it is the only city drawn and the only route to the meclis from the map); Türkiye
  lights with it so the reader sees whose parliament they are opening. What a shape opens is
  decided in the map's click handler, and only there.
- **The groups are fetched on `mount()`, not on the first tap.** A tap has to light the whole
  story in the same frame it tints the shape it was aimed at, so it cannot wait for a round
  trip. Before the fetch lands — roughly the first moment of the page — a tap behaves the way it
  did before stories existed, which degrades legibly. `paintGroup()` in `initLibraryMap` is the
  only place `active` / `hover-active` are ever set, so neither can end up lit on half a story.

Which countries belong to which is structural and does not change with the news, so the admin
portal shows it read-only: picking a country in the Ülkeler tab prints the story its entry will
appear in, and every row in the list carries its story name. Editing the grouping is a
migration.

### OLAYLAR — the world events themselves (`world_events`)

The three things Kütüphane keeps about the world are easy to confuse, so: a **story in the feed**
is what happened (72 hours, then gone); a **seri** is a label laid over several such stories so a
developing thing stays traceable through its earlier posts; an **OLAY** is the thing all of them
are about. Rusya–Ukrayna Savaşı. Gazze. İran ve ABD. It is there on a day nobody posted, it
reaches back to 2014 when the newest story is from this morning, and a reader opens it to find out
what this whole thing *is* rather than what happened since Tuesday. Opened from the **middle box**
under the profile bar — which is a **switch**, not a door: it inks itself and stays inked, and
pressing it again puts Kütüphane back.

**It is a PINBOARD, and that is the one place on this page that is not printed paper.** Everything
else in Kütüphane is a newspaper — kicker, headline, column, rule — and that is right for the news,
which is a thing you *read*. An olay is a thing you *work out*: who is in it, what it touches,
which other olay keeps naming the same country. So each olay is **a piece of paper pinned to the
map**, with a hand-drawn line running from the paper to the place it is about, and the reader's eye
does the joining. Concretely:

- **The drawing is made in the map's own frame, and that is the whole trick.** An olay's PNG
  (`assets/olaylar/<id>.png`, see that folder's README) is **1080×1920 and transparent** — the size
  of `assets/map/kutuphane-map-mobile.png` and the viewBox of the traced country overlay — so the
  board can lay it straight back over the map at the same `preserveAspectRatio="xMidYMin meet"`
  and every stroke lands on the coastline it was drawn against. It is not a picture on a card; it
  is a sheet of tracing paper over the world. Change the size on either side and every drawing
  slides off. Dropped in by filename, with nothing to enter anywhere; `world_events.image_url` is
  only for a copy kept elsewhere.
- **The string is a stroke somebody drew, not a line the page computed.** An earlier version tied
  cards together by shared party and drew a sagging quadratic between them; the map made that
  redundant and worse — a hand-drawn line from Yunanistan through Kıbrıs to İsrail says the thing
  the computed one was only gesturing at. Each drawing arrives by being **wiped** across the map
  (a clip rect animated from no width), because a string is run rather than faded up. The rect
  carries its full width as an attribute too, so a browser that will not animate SVG geometry from
  CSS simply shows the finished drawing.
- **The paper is the only thing that takes a press**, and where it hangs is the author's own
  decision (`paper_x` / `paper_y`, `db/world_events_v3_paper.sql`), picked by clicking a mini map in
  the admin portal with the olay's own drawing laid over it. It has to be said rather than worked
  out: the line ends where the paper goes, and a stroke ending in empty sea looks exactly like a
  stroke ending anywhere else. The coordinate marks the **pin** — the paper hangs down from it
  (`transform-origin: 50% 0`), so a point picked at the end of a stroke means "the string is tied
  here". Two fallbacks, both a guess and both better than an olay nobody can press: under the
  drawing's own ink (`measureOlayInk` puts the PNG on a canvas at 1/8 scale and finds the first and
  last non-transparent pixel), and failing that over the ticked countries, off the map's own traced
  shapes (`olayCountryAnchor`). A tainted canvas (a page opened from `file://`) falls back the same
  way rather than throwing.
- **The papers are HTML, not SVG**, and placed through the board SVG's own `getScreenCTM()`. They
  hold two lines of type at a size that does not change with the screen, where anything inside the
  map's 1080-wide frame would be scaled down with the map — and taking the matrix off the browser
  beats a second copy of the `preserveAspectRatio` arithmetic that could disagree with it. They are
  re-placed on resize (`placeOlayPapers`), and two that would overlap slide apart.
- **Pulling a thread.** Reaching for a paper (hover, or the press on a phone) lights its drawing and
  its countries on the map, and drops every other drawing and paper back — the same move the map
  makes when a country is touched and its whole story lights. A quiet paper goes muted in the ink,
  never translucent: a see-through card over a map is mush.
- **Six drawings, and nothing scrolls** (`OLAY_BOARD_MAX`). The seventh olay is not behind a page —
  it is simply not on the board, and admin.html's list says `PANODA` / `PANODA DEĞİL` on every row
  so that is never a surprise. The real limit is the map: a world with a dozen strings across it is
  a mess rather than a board, so this is a number to lower when it starts looking like one, never a
  scroller to add.
- **The map IS the board, and this is not a sheet at all** (`#olaylar-layer`). Nothing rises from
  the bottom and nothing is opened: pressing the box **inks it** (`.lib-box-on` — it stays held
  down because it is the way back out), everything else on the page goes — the news column, the
  reading area, the other two library doors — and up to six olaylar are pinned **over the drawing
  of the world they happen in**, with the string run between them across it. It is the one
  background this page already had and the only one that means anything; the cork it was first
  drawn on said nothing. The exception to THE sheet is the same argument the news page makes: a
  sheet would cover the very thing this content is about.
  - The layer sits at z-index 5 — above the columns and the map overlay, below the profile bar and
    the tab bar, so the two bars stay in charge and the Olaylar box stays pressable.
  - A wash quiets the map (`.olay-scrim`) and its z-index is the whole trick: **1**, which is over
    the map photo (`.map-panel`, −1) and *under* the traced country shapes (`.map-svg-world`, 2).
    So the drawing is quieted while **a lit country burns through it at full strength**.
  - Which is what reaching for a pin does: it lights that olay's countries on the map underneath —
    the same breathing highlight a Dünya story lights — and an open dossier holds them lit. The
    shapes are drawn but take no taps while the board is up (`body.olaylar-on .country`).
  - It lives **inside `#ist-content`**, so a swipe to another page takes it away rather than
    leaving it hanging over Hane; the `body.olaylar-on` rules live in this page's own stylesheet,
    which the router disables on the way out, and `mount()` clears the class on the way back in.
  - **Desktop carries its own copy of the world map** inside the board (`.olay-basemap`), because
    the map behind this page is İstanbul's there, not the world's. On a phone it is hidden and the
    page's own map shows through.

One olay opens as the **dossier taken off the board** — the layer's content swaps in place, still
no second surface — and keeps the board's language rather than reverting to the newspaper column:
paper lying on the map, led by a **crop of the map around its own strokes** (the drawing is a
mostly-empty 9:16 overlay; printed whole it is a tall blank rectangle, so `paintOlayPageMap` crops
to the ink and puts the map back underneath), a stamp saying
whether this is still going, the parties pinned along one line (the same words the threads are
labelled with, met again), and its **chapters** run down a piece of string. This page is the one
thing here that scrolls: a chain of chapters has to.

**The chapters (`world_event_moments`) read OLDEST FIRST, and that is a deliberate reversal of
every other Zaman Akışı on the site.** A country entry's chain and a news story's gelişmeler are
feeds — the newest thing is the point, so they print newest first. An olay is not a feed, it is a
**story with a shape**: Gazze's 2023 is not where the thing began, it is the newest chapter of
something that reaches back through 1948, 1967 and 2007 — and a reader who only sees the last two
years is missing the chapters that explain them. So scrolling an olay's chapters moves toward the
present, the way turning pages does in an actual book (`worldEventChapters` sorts ascending; every
other Zaman Akışı on the site still sorts descending — do not "fix" this to match them). Each
chapter is dated, titled, can carry its own lead photo pinned above its text
(`world_event_moments.image_url`, `db/world_events_v5_chapters.sql` — styled like a note pinned to
the board itself, tilt and a red pin dot included) and its body can carry further `[[img::URL]]`
images inline, the same convention `library_articles` chapters use
(`db/library_articles_v7_inline_images.sql`) — deliberately the same object Makaleler's own
chapters are, because that is exactly what these are meant to read like.

**A rail runs down the chapters, and it is read literally as a piece of string with a bead sliding
down it** (`.olay-chapters-fill`, `wireOlayChapters`) — the board's own language, carried into the
page that came off the board. A pale track runs the full list; a coloured fill (the olay's own
colour, see below) grows from the top as the reader scrolls, continuously, so it reads as being
read rather than jumping. The **counter** ("3 / 8") and each chapter's node move chapter-to-chapter
instead, off a reading line a little way down from the top of the scroller
(`OLAY_READ_LINE`) — continuous position for the string, one whole chapter at a time for the
count. Reaching the physical bottom of the scroller counts every remaining chapter as reached even
if the reading line never physically crosses their headings, the same way finishing anything else
on the site by reaching its end counts as done.

**The app remembers where the reader got to, monotonically, per member** (`olayReadProgress` /
`olayWriteProgress`, `localStorage` keyed `olay_progress_<uid>_<eventId>` — same shape as
`lib_chapter_completed_<uid>` for Makaleler). Scrolling back up to reread the beginning never
erases it: only a chapter further than the one already stored is written. Reopening the dossier
later scrolls straight to the furthest chapter reached (only when that is past the first chapter,
so a first-ever open is never yanked anywhere), and the **board itself says so before the paper is
even pressed** — a paper whose olay has been started shows "3/8" beside its stamp
(`paintOlayPapers`), the same idea as the petek's `hive_member_status` printing how many stories or
games a neighbour has left: a fact about the reader, printed where they will see it before they ask.

Four things about the data:

- **It is not `country_stories`, and must not be folded into it.** That grouping belongs to the
  *map*: one story per country (the primary key on `country_story_countries` enforces it) and only
  for the 28 shapes that were drawn, because its whole job is answering "what lights when this is
  touched?" with exactly one row. An olay is not bound to the map — ABD is a party to one and is
  nowhere on the artwork, and İran is in more than one at once.
- **Who is in it is plain text** (`parties`), *not* derived from the countries ticked — a field
  that can only name drawn shapes would be lying by omission the moment ABD or Hamas is a party.
  It does double duty: it is what the board's **strings** are computed from and what they are
  labelled with, so writing it well is writing the board. The ticked countries
  (`world_event_countries`, a composite key, so a country may be in several olaylar) are folded in
  behind it, which is what keeps an olay whose parties line was left blank strung up anyway.
- **Whether it is still going is the one fact the list carries that a news list does not**
  (`status`, printed where a card prints its age: "2014 — sürüyor", "2003–2011"). An `ended_on` is
  cleared server-side of the form when the status is `ongoing`, so the list can never print
  "2014–2022 · sürüyor".
- **Ongoing olaylar are ordered by `sort_order`, not by what moved last.** A war does not stop
  being the biggest thing on the page because something smaller had a development this morning —
  and with only six places on the board, that order decides what exists.
- **Each olay carries its own colour** (`color`, `db/world_events_v4_color.sql`, a hex string,
  admin-editable with a plain `<input type="color">`). The board is the one surface on the site
  where the single house red gives way to several — four to six olaylar can be pinned to the same
  map at once, and their papers, pins and chapter rails have to stay tellable apart. Null (the
  common case until an admin picks one) falls back to that same red (`worldEventColor`). Pick it to
  match the drawing's own ink — `rusya-ukrayna-savasi`'s is the blue actually drawn in
  `assets/olaylar/rusya-ukrayna-savasi.png`, not an arbitrary blue.

Curated from admin.html's **Olaylar** tab (form on the left, the list with each card's own timeline
editor on the right — the same shape the Ülkeler tab has, because it is the same kind of object: a
page whose value is that somebody maintains its chain). `db/world_events_seed.sql` holds a starting
set — Rusya–Ukrayna, Gazze, İran ve ABD, Suriye, Doğu Akdeniz — deliberately thin, only the dates
nobody argues about, to be verified and extended from the portal. Four of the five have a drawing
on the board: `dogu-akdeniz.png` (Yunanistan, Kıbrıs and İsrail, and the line run between them),
`rusya-ukrayna-savasi.png`, `gazze.png` (one stroke out of Gazze south-west across Sina, its paper
pinned at the far end in the empty desert) and `iran-abd.png` (six strokes fanning between İran and
İsrail, its paper at the İran end of the fan). Suriye is the one still without one — its paper
hangs over its ticked countries in the site's own red until somebody draws it.
`db/world_events_gazze_iran_papers.sql` sets those last two papers and colours on a database the
seed has already been run against, without rewriting anything else. `db/world_events_v2_board.sql` adds the
`image_url` override the pinned drawings can use, and `db/world_events_v3_paper.sql` the two
coordinates that say where each paper hangs.

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
- **Closing and reopening inside the 0.55s slide is one object's problem, not each page's.**
  `IstSheet.close` cannot hide the sheet at once — it has to stay on screen while it slides down —
  so it schedules the hide. `IstSheet.open` cancels whatever the last close still had pending;
  without that, the old timer landed on the *new* opening and set `hidden` on a sheet that had just
  been unhidden, while `.open` stayed on it. On a phone that emptied the whole page: sheet.css
  hides both columns while `.ist-sheet-overlay.open` exists anywhere in the body, so the sheet was
  invisible *and* everything behind it stayed hidden. Nothing threw. Never re-add a bare
  `setTimeout` re-hide in a page's own close.
- **A sheet that fetches its content must not ask `.open` whether the reader is still there.**
  `IstSheet.open` adds that class on the *next animation frame*, while a fetch answered from cache
  resolves on the microtask before that frame runs — so the guard runs while the class is still
  absent, the render is skipped, and the sheet sits on its spinner for good. It only ever bites the
  **second** opening of anything cached: the first really did go to the network and landed long
  after the class. Take a token instead (`sheetOpenToken` / `sheetOpenIsCurrent` in kutuphane.html):
  opening takes one, closing and the next opening burn it, so the question asked is "is this still
  the open I started" rather than "is something open".
- **The tint quiets everything but the city.** A sheet that is a destination rather than something
  read beside the page opts into a dim backdrop (`.ist-sheet-dim` — the Kahve Endeksi, the Skor
  Tahtası, an event's page). On a phone that wash stops at `--map-hero-end` on any page with a map
  (`body:has(.map-panel)`): these sheets come to rest *under* the map precisely so the district or
  country they are about stays visible, and a wash laid over it takes back exactly what the resting
  position had just given. But the drawing must not stay at full strength either, or the page never
  reads as having gone quiet — so **the tint over the map is painted by the traced overlay itself**
  (`IstSheet.lightTheMap`): one path inside `svg.map-svg`. Inside that svg it is registered with the
  drawing by construction — same viewBox, same parallax drift, same pinch-zoom — which is the whole
  reason it is built in there rather than layered over the top. **One `fill-rule: evenodd` path, not
  a masked rect**: the obvious spelling is a `<rect>` with the districts in a `<mask>`, and it is the
  expensive one — a mask makes the engine allocate and rasterise a second surface the size of the
  masked box, and on a phone that arrived a beat after the backdrop it was supposed to be moving
  with, so the map was visibly the last thing to go quiet. An outer rectangle with every district as
  a subpath inside it draws the same picture as one ordinary fill. Two more details that fail
  silently: the subpaths are **built from the shapes' own geometry**, never `<use>`d (a use-instance
  keeps the original's styles, and `.neighborhood` is `fill: transparent`, so every hole came out
  invisible); and what is punched out is the **whole city**
  (`.neighborhood, .country, .map-unaccommodated`) — the districts this app doesn't serve are still
  İstanbul, and leaving them dark read as half the city being broken. What stays quiet is the sea
  and `.map-istanbul-disi`, the land beyond the city. The rect's resting state (`fill`, `opacity: 0`)
  is declared outside the phone media query, since a rect with no fill of its own paints solid black
  and it is built on any screen; only the switch that turns it on is phone-only. And its resting
  opacity is **committed with a forced style read the moment it is built** — a freshly-inserted
  element has no computed style until the next style pass, and `.open` is added inside a
  `requestAnimationFrame`, which runs *before* that pass: without the read the rect's first
  resolved opacity is already 1, nothing is left for a transition to interpolate, and the map snaps
  to dark while the band below it fades over the full 0.55s. Two tints, one instant and one
  gradual, is exactly the desync that read is there to stop. It is also built eagerly on load, so
  the common case is that a sheet opening finds it long settled. And **which of the two tints is on
  is decided in one place** — `IstSheet.syncDim` toggles `html.ist-dim-on` in the same frame the
  backdrop's own class lands. It was `body:has(.ist-sheet-dim.open)`, and a `:has()` spanning the
  whole body is re-evaluated on the engine's own schedule: when it landed a frame or two late, the
  map lagged the band. Two tints meant to read as one movement cannot be driven by two different
  mechanisms. Anything that drops `.open` by hand instead of through `IstSheet.close` calls
  `syncDim()` itself (see `snapEventPageShut`). Hane is unaffected
  — its hero is the petek, which is the page itself rather than scenery behind one.
- **Phones:** the sheet's side gaps are the same `--screen-inset` (frames.css) the profile bar's
  row is padded to — everything stacked over the same map lines up, always.
  - A sheet opened **from the profile bar** (your profile, a member's) rests under that bar,
    via `--ist-sheet-top` (`IstSheet.position` measures it live).
  - A sheet opened **over a page's hero** — a news item, an event, an article, the meclis,
    later a country — carries `ist-sheet-pull` and is
    *dragged*: it comes to rest half-way down, under
    the map, so you still see what you tapped; drag it up and it stops at the profile bar;
    past that the reading continues inside it; drag it back down and it closes. One
    implementation, `IstSheet.pull(overlay, { onDismiss })` — attach it once and
    `IstSheet.open/close` drive it from there. Touch only (`pointer: coarse`); a narrow desktop
    window keeps the ordinary sheet.
  - Two surfaces are exceptions, and both for the same reason: they arrive out of a specific
    object already on the screen rather than from off it, so they **grow out of that object**
    instead of sliding: **a news story on Kütüphane** grows out of the card it was tapped on,
    into the band that card lies in (see Kütüphane's own section), and **an event on Kahvehane**
    does the same. They are still THE sheet — same markup, same `IstSheet.open/close` — only the
    way they arrive differs, and that arrival is one implementation as well:
    `IstSheet.grow({ page, inner, origin, dir })`. (The PETEK page used to be a third; it is a
    page of its own now, not a sheet at all.)
  - **The grow draws its own frame, and that is the whole reason it is shared.** The move is one
    `clip-path` inset animated from the card's box out to the page's four edges — the page is
    already sitting where it will end up, and what opens is the *window* onto it. But a clip-path
    clips the element's **border** along with everything else, so for the whole of the animation
    the page was bordered on whichever sides the clip happened to rest on and a raw cut edge on
    the other three. So the frame is drawn by a box of its own, animated over the same rect on the
    same curve, wearing the border width and colour it reads off the page — and it is a **sibling**
    of the page, never a child, since a child would be clipped by the very clip-path it is there to
    dress. It is dropped the moment the page stands at full size, where the page's own border takes
    over in exactly the place it left off.
- **Chrome:** background/border come from `frames.css`'s `.ist-sheet` rule (2px ink border, no
  bottom border, no shadow).

### The phone's hero line — `--map-hero-end`

On a phone all three carousel pages are one screen: a square hero at the top — the map on
Kahvehane and Kütüphane, the petek on Hane — everything else below it. **Everything below starts on the same line** — Kahvehane's events and game tiles,
Kütüphane's news column — and each map's caption sits
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
on all three pages that carry one — Hane's events, Kütüphane's news feed, Kahvehane's deck of
the day's games — and where a page has two columns, they end on the same line. The Kahve Endeksi
is the one exception, and deliberately: it is a ranking, not a feed, so it reads top-down inside
its sheet — the cheapest cup belongs at the top of the list.

Kütüphane's news and Kahvehane's games are the stacks that are a **deck** rather than a list — same bottom-aligned
box, but the cards are laid on top of each other instead of above each other (see its own
section). Where a page's stack is a list, one implementation note, because it fails silently: the
space is pushed down with an **auto top margin on the innermost box** (the feed itself), never
`justify-content: flex-end`. A stack that
outgrows the screen resolves its auto margin to zero and simply scrolls, where flex-end would
push the top of the stack out of the scroller and out of reach. The margin also has to sit on a
box that does *not* grow — every wrapper between a column and its feed carries `flex: 1`, and
flex hands the free space to a growing item before any margin sees it, so an auto margin one
level too high does nothing at all.

### The member's own district is painted into the map — `home-map.js`

The Istanbul map behind Kahvehane is the same drawing for everyone *except* the one
district the member lives in, and that district is picked out **in the artwork**, not by a wash laid
over it. Each district gets its own hand-painted copy of the map at
`assets/map/home/istanbul-map-<id>.png` — the
same 5046×2300 frame as `assets/map/istanbul-map.png`, so every traced hit-region still lands where
it did — and `home-map.js` puts the copy belonging to the viewer in place of the base map.

The older treatment (the red `.neighborhood.home` tint through the traced polygon) is the fallback,
not the plan: a district with no painted file keeps it, so the set can be drawn one district at a
time. On a district that *is* painted, `.map-panel.ist-home-painted` neutralises that tint and the
polygon behaves like any other — the drawing alone says "this one is yours".

Three things about it: the swap waits for the painted map to decode (an `<img>` whose `src` changes
to something unfetched goes blank, which reads as the city flickering out); the district is
remembered in `localStorage`, so a reload has the right map up before the profiles round-trip
confirms it; and the swap is aimed at images whose src *is* `istanbul-map.png`, because Kütüphane's
Turkey map wears the same `.map-photo` class in the same shared document. Adding a district is a
file drop plus one id in `PAINTED` — see `assets/map/home/README.md`.

### The map is scenery, and it drifts — `map-parallax.js`

The map is the one thing on the two pages that carry one that is *scenery* rather than content
(Hane's hero is the petek, which is the page itself and does not drift):
everything else — the two bars, the columns, every sheet — is printed **on** the screen, while the
map is what the screen is a window **onto**. On a phone that is literal: tilt the device and the
drawing behind the window shifts against you, the way the view through a real window does. Nothing
else moves — not the profile bar, not the tab bar, not the feeds, not the caption over the map, not
a sheet resting on the hero line. One implementation for both map pages; each page just loads the
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

A phone shows the city between two fixed charcoal bars: **who is here** at the top (the profile
bar) and **where you can go** at the bottom (Kütüphane / Hane / Kahvehane). The top bar carries two
people, facing outward from the middle: **you** (your name over your district) and **whoever holds
power over what the page is showing** — the seat card, see its own section below.

**Which end each of them stands at is the page, and it moves with the swipe.** Kütüphane seats the
politician at the left and you at the right; Hane names no seat at all and stands you alone in the
middle — until you press somebody on the petek, which is the one thing that puts another name in
your place there (see the petek's own section); Kahvehane mirrors Kütüphane — you at the left, the
seat at the right. So swiping from
Kütüphane to Hane walks your own name from the right edge into the middle, and swiping on to
Kahvehane walks it out to the left: the bar makes the same move the pages under it make, and the
middle page is the one where you are alone in the middle of it (see "Always in the middle"). One
implementation, `IstProfileCard.setBarLayout(page)` — three classes on the row, and the slide is a
FLIP it runs itself, because a flex row changing ends has nothing CSS can transition. It is applied
by `router.js` at the exact moment a virtual navigation swaps the content, so the names travel
*with* the page rather than jumping into place after it settles; that also means the bar's row is
never rebuilt on a navigation (it would take the transform with it — see `setPage`).

It is **two names in type and no portraits**: a face here would spend most of the row saying
twice what the line of type already says, and a face is what the sheet each end opens leads with
anyway. Each name is pressed as one block: yours opens your profile, theirs opens theirs. There is
no gear on this bar either — pressing a person is already the gesture, and the desktop identity
card's own `.edit-btn` is a different surface (a card in a page, with nothing else to press). Both run full-bleed edge to edge, both add the device's own
inset on top of their height (notch at the top, home indicator at the bottom), both print their
contents on `--screen-inset`, and neither moves while the three pages swipe underneath. The top
bar stands taller (`--navbar-h-top`) than the bottom one (`--navbar-h`) because it carries two lines
of type against the tab bar's one word. Heights and colors are the
`--navbar-h` / `--navbar-h-top` / `--navbar-ink*` tokens in frames.css — the colors deliberately
palette-independent between light and dark, with one exception: the earth (kahverengi) palette
overrides `--navbar-ink` to its own dark brown `--ink` instead of charcoal, via
`:root[data-palette="earth"]`, mirroring the same specificity trick the mono block uses. The top bar is one
implementation in profile-card.css ("THE TOP BAR"); the bottom bar's colors live in frames.css
("MOBILE FIXED BOTTOM NAV") while each page still positions its own `<header>`. Never write
either bar's height as a number — the same value also reserves the space each page leaves at the
bottom so its last row of cards clears the tab bar, and one copy left behind is how the two bars
end up different heights. The game pages hide the bottom bar outright for their fullscreen board.

### The two bars are omnipresent — nothing may pass in front of them

The profile bar and the tab bar are the phone's furniture: who is here, and where you can go. No
card, column or map the page draws may ever be painted over either of them. Stated once in
frames.css ("THE TWO BARS ARE OMNIPRESENT"), never per page.

It needs a rule because the tab bar's own `z-index: 100` was a **lie**. The bar lives inside
`.section-rule`, which is `position: absolute` with `z-index: 1` — a stacking context — so the 100
was scoped *inside* it and the bar actually competed against the page at 1. Kahvehane's games
column is also 1 and comes later in the DOM, so the two were tied and document order decided.
Nothing ever overlapped, so nothing revealed it — until the zoom scaled that column and it grew
over the bar and won.

Two things about the fix, both of which fail silently:

- **`.section-rule` must not create a stacking context on a phone.** It is a zero-sized nothing
  there whose only job is to hold the fixed header; `z-index: auto` lets the bar compete at the
  root, where its number means what it says.
- **The rules are `!important`, and not for tidiness.** A virtually-navigated page has its
  `<style data-page>` appended to `<head>` at navigation time, so it lands *after* frames.css and
  beats it at equal specificity. Without it the bars held on every real page load and were climbed
  over by the arriving page on every swipe — the harder bug to see, because it exists only
  mid-transition.

The bars sit at 400/401, deliberately still below the 500 overlay layer: THE sheet is a surface
that rises *over* the page and comes to rest under the top bar by its own arithmetic, which is a
different thing from a card climbing over the furniture.

### Two tabs, and a zoom stack inside one of them — `router.js` (the parts bin)

> **These four pages are no longer the app.** `project.html` is (see its own section): the flip
> book is the only page a member reaches, and `index.html` sends them there. What follows still
> describes `router.js` accurately, and the four pages still carry it and still work when opened
> directly — that is the point of keeping them, since almost every feature the app has is written
> inline in them and gets lifted into a lane of slide 12 one at a time. Nothing links to them, so
> nothing here is a route a member can take. The one live consequence: Proje prefetches nothing,
> because it can reach nothing.

The bottom bar carries **two** tabs: **İstanbulite** and **Hane**. İstanbulite is not one page
but three, stacked by **zoom** rather than laid side by side — the same city at three distances:

| Slug | What it is | Where in the stack |
|---|---|---|
| `kutuphane` | Türkiye — the national layer | furthest out |
| `kahvehane` | İstanbul — the district map, the games, the events | where the reader lands |
| `mahalle`   | the reader's own ilçe and its mahalles | furthest in |

**The grammar is: the tab is TAPPED, the depth is swiped.** A swipe **down** or a **pinch out**
goes *in* (toward the mahalle), a swipe **up** or a **pinch in** goes *out* (toward Türkiye).
Down-is-in is the petek's own convention — "a pull up is a scroll down, and down the levels is
outward" — so one gesture means one thing everywhere in the app.

**Nothing horizontal is a navigation.** A sideways swipe used to walk İstanbulite → Proje → Hane,
and it was the wrong gesture for the thing: the bottom bar names all three tabs, and a tab is a
place you *choose* rather than one you drift into on the way past. It also collided with
everything that has since learnt to read a horizontal throw of its own — Kütüphane's news deck,
Kahvehane's two decks, Proje's own page — so a reader's flick was answered by whichever listener
saw it first. router.js now drops a horizontal gesture the moment it claims that axis, without
`preventDefault`, so whatever the finger started over is free to answer it. What is left to catch
an unconsumed sideways drag is the **browser**, whose horizontal overscroll is a back/forward
navigation — which on a page whose whole job is to stand still is the page leaving for no reason
the reader can name. So `html, body { overscroll-behavior-x: contain }` in frames.css, stated once.
Vertical is deliberately not contained: it is the zoom, and pull-to-refresh is a real gesture.

Five things about it:

- **Coming back to a tab returns you to your own distance.** `lastZoom` in router.js remembers
  which level the reader was standing on, and both the swipe back from Hane and the İstanbulite
  tab itself aim at that rather than dropping everyone at İstanbul. The tab's `href` is
  re-pointed to match (`paintNav`), so the link and the gesture can never disagree.
- **The zoom is not a slide, and it moves everything.** The horizontal transition moves the two
  columns and deliberately leaves the map still; a zoom moves **every child of `#ist-content`**,
  the map included, because the map *is* the zoom. `#ist-content` is `display: contents` and so
  has no box of its own to transform — its children are the page's real grid items, and moving
  all of them together is the same picture. Going in, what is leaving grows past the screen and
  the arriving level opens out of the middle of it; going out, the reverse.
- **It is stated once, in frames.css** (`ist-zooming-in` / `ist-zooming-out` on the body,
  `ist-arriving-in` / `ist-arriving-out` on the root), never in a level's own
  `<style data-page>` — a fourth level must not be able to arrive carrying a fifth version of the
  transition. The duration is `--ist-zoom-dur`, and `router.js` reads it back to know how long to
  wait, so the wait and the animation are one number. `prefers-reduced-motion` sets it to `0ms`,
  which the router reads as "swap at once".
- **The drag follows the finger, and the release carries on from where it left off.** A vertical
  drag scales `#ist-content`'s children live (`paintZoom`); on release it either continues to
  exactly the pose the exit class would have set (`flingZoom`, so nothing jumps at the handover)
  or springs back. The inline styles die with the nodes when the content is swapped.
- **A drag that begins over something which can genuinely scroll belongs to that thing**
  (`overScroller` walks up looking for a real scroller). Mahalle's own list scrolls; Kütüphane's
  news deck and Kahvehane's two decks do not, so a vertical swipe over them zooms. Hane is not in
  the stack at all, so its vertical pull still belongs to the petek.

### `project.html` — the flip book, which is the app

**It started as a rig and it is the app now.** `index.html` sends a signed-in member straight
here, and there is nowhere else to go: the three carousel pages are no longer destinations, the
bottom bar is not a tab bar, and every depth and every screen the reader can reach is inside this
one page. Twenty-four drawn frames scrubbed by the finger, three of them stops, and the middle
stop is three screens side by side.

**The four pages are demolished as PAGES, not as things.** `kutuphane.html`, `kahvehane.html`,
`anahane.html` and `mahalle.html` are still on disk and still work if opened directly — they have
to be, because nearly every feature the app has is written inline in them (the news deck, the olay
board, the coffee index, the events deck, the games hub, the TBMM chart, the politician cards).
They are a **parts bin** now: each thing gets lifted into a lane of slide 12 as its turn comes,
the way Etkinlikler, Sözcel, Haberler, Olaylar and the petek already have been. Nothing links to
them any more — not from here, not from the game pages, not from `index.html`. Deleting the files
before their contents are lifted would be demolishing the things, which is the one thing this is
not.

Twenty-four numbered frames (`assets/project/`, generated by `scripts/make-project-frames.py`) scrubbed by the finger,
with no map, no data, no page swap and none of the shared transition machinery behind them. **The
book can only come to rest on a STOP** (`STOPS`) — let go anywhere between two of them and it runs
to whichever of those two is nearer, because there is no stopping in mid-book and nothing to press
there.

**There are three stops — 1, 12 and 24 — and the two runs between them are the same kind of
thing.** A stop is where the drawing is a real screen with real things on it; 1 → 12 is one
journey and 12 → 24 is the next, and a stop in the middle of the book is not a landing the gesture
has to be told about. The release question is **local**: `bracket(at)` returns the two stops the
finger was let go between, and everything after that is decided against those two rather than
against the ends of the book — which is why the whole of "add a stop" is adding a number to
`STOPS`.

**A throw decides by direction, not by distance** (`FLICK`, the app's own 0.55 px/ms), and it
commits to the next stop *that way* rather than to an end of the book — which is what keeps a long
book crossable at all: past that speed the release goes whichever way the thumb was going, and only
a slow release falls back to whichever of the two bracketing stops is nearer. And **the thumb distance
is stated per page** (`TRAVEL_PER_SLIDE`), never per book — so adding slides makes the book longer
rather than making every page flip faster. With a fixed whole-book distance, every slide added
quietly halved the travel per page and undid the lag tuning without touching a single one of its
numbers.

It began as a rig to separate two questions that kept getting confused. If the flip is not smooth
here, it is the flip book's fault. If it is smooth here — and it is: 75 frames under the finger at
17ms each, none dropped, on a 4×-throttled CPU — then whatever made a real journey rough is
something else. That question is settled, so the rig's own instruments are gone: the slide
read-out and the "aşağı kaydır" hint were both scaffolding, and scaffolding left up on a shipped
page is furniture nobody asked for. The numbered placeholder frames still carry their travelling
dot and corner ticks, which is where the measurement lives now.

**The bottom bar is a compass, not a tab bar.** Three marks — Kütüphane, the İstanbulite wordmark,
Kahvehane — and none of them is a link; the `<nav>` takes no pointer events at all. Nothing here
is pressed, because the reader moves the app with their finger and the bar's whole job is to say
where that has put them. A tab bar answers "where can I go"; this answers "where am I", which is
the only question left once the swipe is the navigation.

It lights **continuously**, off the same `lanePresence` the wash and the hexagons run on
(`--fb-nav-0/1/2`, written by `paintNav`), so the middle mark comes up as the reader walks toward
Hane and goes down as they walk off it — a bar that snapped between three states would be
reporting the result of a gesture, and this one is part of it. Off slide 12 the lane still means
which of the two runs the reader is on, so Kütüphane stays lit all the way out to Türkiye and
Kahvehane all the way in. One thing is deliberately **not** on that number: the font weight. A
fractional `font-weight` re-measures the type every frame and the bar would jitter its own words
under the finger, so the ink is continuous and the weight steps once, on the lane the reader
lands on.

**One thing on that bar IS pressed, and it is the logo** — bigger than the two words, resting
below the bar's bottom edge because everything else there is printed *on* the bar and this is the
one thing that comes off it. It opens **the app map**, and it is a switch rather than a door: it
stays lit while the map is up, because it is also the way back out (the same move Kütüphane's
Olaylar box makes). `nav` still takes no pointer events at all — only this one mark opts back in,
so the drawing under the bar's paper goes on answering a finger that lands beside it.

### The app map — what the logo opens (`#fb-map`)

The compass says **where you are**. The map says where you are *in relation to everywhere else*:
the app's five windows drawn in the shape they actually stand in — the three lanes across the
middle, Türkiye hanging off Kütüphane and the ilçe off Kahvehane, because those are the depths
those two lanes can reach and nobody else can. The window the reader is standing in is **red**, and
it is the only red on the layer, so it cannot be read as anything else. It is also not pressable:
you are already there.

- **A window is a `(lane, slide)` pair and nothing else.** There is no second table of places in
  `MAP_WINDOWS` — only the five the book and the lane strip already have between them, so the map
  cannot drift from the app it is a map of.
- **Pressing a window WALKS there. It never jumps** (`travelTo`). The layer closes and then the app
  moves one transition at a time, through every screen in between: back to slide 12 first (the
  lanes can only be walked from the middle depth), then one lane at a time, then out to the
  target's own depth. So Türkiye to the ilçe is four moves and passes through Hane — you cannot get
  from the reading to the doing without walking past the people. A map that teleported would be
  the shortcut past everything, which is the one thing the whole arrangement exists to prevent.
  `runTo` and `runLane` each take a `done` callback for exactly this, and every comparison against
  a stop is a tolerance rather than `!==`: `at` is a float, and a walk left one imperceptible step
  short never clears `traveling`, which locks the map for the session.
- **It is the one surface on the site that dims the two bars**, and that is a deliberate exception
  to "THE TWO BARS ARE OMNIPRESENT" (frames.css) rather than an oversight. Everywhere else the bars
  answer "where can I go" and nothing may pass in front of them; here the whole screen *is* that
  answer, so the furniture is part of what goes quiet. Two mechanical notes, both of which fail
  silently: the wash is **one number** (`--fb-map-dim`) used over the page and again *inside* the
  bottom bar, because the two have to read as a single thing going quiet rather than as two
  surfaces dimmed by eye; and the rule that lets the bottom bar through the layer is
  `z-index: 610 !important`, because the omnipresence rule is itself `!important` and a plain 610
  loses to it — the logo then goes dark under the very wash it is supposed to be standing above.
- **The squares are how far into each window's content the reader has got** — Haberler as
  `dealt/total` read from the deck's own `dunya_dealt_<uid>` store (both its shapes, stamped and
  the legacy stampless array), Olaylar as `started/ongoing`, Oyunlar as `played/on today`, and
  Etkinlikler as a count rather than a fraction, because an evening is not content to get through.
  Every one is best-effort and independent: a query that fails leaves its own square a dash rather
  than taking the map down. A square whose content is parked (Fikirler, Bilgi, Kahve, Yorumlar)
  prints a dash too — the shape of a screen must not change on the day its numbers arrive.
- **The middle window is the reader's OWN hexagon, cloned out of the petek.** Hane's window is the
  reader's profile, and that already exists at the petek's middle depth — so the cell is
  `cloneNode`d rather than redrawn, and the ring, the mask, the avatar and the badges stay the
  petek's own with no second version to keep in step. Two things the clone must be stripped of:
  every `id` in it (`#po-avatar-preview` is what the four avatar carousels replace on an arrow
  press, and the claim field is what a code is typed into — a second copy carrying them steals
  both), and its place, since in the petek it is absolutely positioned on the plane by `calc()`
  against the packing's own step.
- **Standing on Hane, opening the map is the people leaving and the reader staying put.** The whole
  petek fades out under the wash — the reader's own cell with it — and the cloned window is
  **pinned over the rect the real cell was measured at**, so nothing about where the reader's
  hexagon is changes by a pixel. It has to be `position: fixed` for that: every other window is
  placed inside the grid, which is inset by both bars, so a viewport-measured rect left in that
  frame lands exactly the grid's own inset away from the hexagon it is supposed to be standing on.
  Off Hane there is nothing to pin to and the same clone simply stands in the middle of the row;
  a petek that has never been mounted (the reader has not reached slide 12 yet) falls back to a
  drawn figure.
- **Red for "you are here" is the RING going red**, not a box drawn around the hexagon — which is
  what red on a hexagon already means everywhere else in the petek.
- **A map PNG inside a window has to be out of flow.** The windows are sized by `aspect-ratio`, and
  an `<img>` left in flow reports its intrinsic height (1080×2420 for Türkiye's) into a box whose
  height was supposed to come from that ratio. The two argue, intrinsic wins, and every window
  comes out half again too tall and overlapping the one below it.

**Its two ends are the real maps**, so the rig is also the place the shape question gets settled.
`OVERRIDE` in project.html swaps any frame for a picture; today the first two stops are the real
maps — frame 1 `kutuphane-map-mobile.png`, frame 12 `istanbul-map-mobile.png` — with frames 2–11
the drawn run between them (frame 7 is still a numbered placeholder). The second run, 13–24, is
numbered placeholders waiting to be drawn, and its far stop has no cast yet. One `FIT` constant switches
every frame between `cover` and `contain` together; they are never fitted individually, or no two
frames would be registered with each other, which is the one property the code owes the drawings.

**Every frame must be the same pixel size, or the book is not registered with itself.** The
in-betweens and the İstanbul end are 1080×1920 (9:16); the Türkiye end is still 1080×2420, and the
difference is visible at the 1→2 turn. On a 390×844 phone `cover` paints a 9:16 frame 475 css px
wide for a 390 px screen — **9% is lost off each side, so only the middle 82% is safe to draw in**
— while the 1080×2420 map paints exactly 390 wide and loses nothing sideways. Two frames cropped
differently is a jump, however well they are drawn.

The vertical gesture on this tab belongs to the page, not to the carousel — `verticalTarget()` in
router.js returns nothing here, because this tab *is* a flip book and the zoom stack must keep its
hands off it. The **horizontal** one is the petek's, below; nothing anywhere on the site navigates
on a sideways swipe any more, which is what left the axis free for it.

**Slide 12 is three screens, not one** (`LANES`, `lanePresence`, `runLane`). The book's stops are
its *depth*; slide 12 also has a sideways axis, and it is the app's own carousel laid on the one
slide that is the city:

| | Lane 0 | Lane 1 | Lane 2 |
|---|---|---|---|
| | **Kütüphane** | **Hane** | **Kahvehane** |
| what stands there | Haberler + Olaylar | the petek | Etkinlikler + Sözcel |
| where the book may go | up, to slide 1 | nowhere | down, to slide 24 |

Left to right on the screen, exactly as the three tabs stand. A pull right walks the strip right,
so the reader moves *left* along it — Kahvehane, Hane, Kütüphane — and a pull left walks back. Each
lane has its own cast and they never trade places: the buttons that left to the right are
Kahvehane's and stay gone; the ones that arrive from the left are Kütüphane's.

**The lane decides which way the book may move, and that is the point of the divergence rather
than a rule bolted onto it.** Standing on Kütüphane you are facing *out*, so the only depth you can
reach is slide 1 — Türkiye. Standing on Kahvehane you are facing *in*, so the only one is slide 24.
Standing on Hane the vertical gesture is not the book's at all: it is the petek's own depth pull.
**So there is no way from Türkiye to the innermost slide that does not pass through Hane** — the
mall stairway in the smallest form it has had here: you cannot get from the reading to the doing
without walking past the people. The vertical drag is clamped to the lane's own run rather than
springing back from it, because paper that simply does not move says "not this way" more plainly.

Seven things about it:

- **It is not a page and not a sheet.** Nothing navigates and nothing rises from the bottom: the
  drawing underneath stays exactly where it is. That is the same argument the news page and the
  olay board make — slide 12 is the one screen all three lanes are *about*, and a surface that
  covered it would take back the very thing being answered.
- **One number drives all of it**, and it is *how present a lane is*: 1 standing on it, 0 a lane
  away either side, the linear middle in between (`lanePresence`). The middle lane's presence is
  written to `--fb-petek-p`; the wash is that number and the hexagons are `(p − 0.35) / 0.65` of
  it, so the page goes quiet *before* the new thing appears rather than the two crossing — and the
  same wash and fade run whether the reader arrived from Kahvehane or from Kütüphane.
- **An actor needs no lane table at all.** It is pushed a lane's width in whichever direction the
  reader walked away from it (`paintCast`, one line), on top of whatever pose the *book* has it in.
  That is the whole of what makes the two casts diverge without either knowing the other exists,
  and it is why the lateral term is never a second pose table: a different gesture happening at the
  same time is not a different place in the book.
- **The strip moves at most one lane per gesture.** It is a carousel of three screens, not a scrub
  through twenty-four, and a swipe that crossed two of them walked the reader straight past Hane —
  the one screen the arrangement exists to put in the middle. The release brackets the lane the
  reader is **committed to** and the one next to it in the direction pulled, never `floor()` of
  where the drawing ended up, which at a whole number brackets the wrong pair and overshoots in one
  direction only.
- **It belongs to slide 12, exactly as the cast does.** `atLaneStop` is about where the *book* is,
  not about whether a finger is down — asking `!drag` there made the very gesture it gates
  impossible, since `armCast` runs on pointerdown and cleared the flag a frame before the drag
  read it.
- **The petek is built on arrival, never on the pull.** Mounting is a round trip to `hive_map()`,
  and a reveal that waits on the network has a blank beat in it. Every arrival on slide 12
  re-mounts (somebody else's attachment may have carried the petek somewhere) — but never while it
  is standing, which would pull the drawing out from under the reader. **An EMPTY petek is the exception**,
  and it has to be: `ensurePetek` answers whether it actually settled the arrival and `petekBuilt`
  latches on that answer, never on having made the call. Arriving on Hane through the app map walks
  the book first and the lane second, and `framePos` lags `at` — so `atLaneStop` comes true a beat
  later, by which time the lane is already Hane, and a latch set before the call spent that
  arrival's one chance to mount on a call that declined. The reader landed on a blank Hane.
- **A press inside a standing petek is the petek's**, and is deliberately not *captured*: capture
  would re-target every following event at the book's own box and kill the petek's handlers
  outright. Only a horizontal drag is the book's, and horizontal is exactly what
  `wireHiveGestures` hands back. Leaving the tab calls `unmountHivePage()` — the depth classes on
  `<html>` and the module's `_hive` both outlive the swapped content, and left behind they are the
  last word on a page that is gone.

The reader **starts on Hane, slide 12** (`START_SLIDE` / `START_LANE`) — the middle stop and the
middle lane. It is the app's own rule applied to the book: you always enter in the middle and swipe
out from there, so the petek is the door and Türkiye is one pull away rather than the doorstep. The
lane and the depth have to agree, or the first pull down would be one the lane forbids — and for the
same reason `goto()` sets the lane from the slide it is given. The entry frame is also the one
fetched **alone** ahead of the rest, since that is the drawing that has to be up before anything
else has arrived.

**The three games are still pages of their own, but the book never actually leaves for one.**
`sozcel.html`, `tumcel.html` and `bulmaca.html` are real, otherwise-unmodified pages — fullscreen
boards, which is why they were never carousel pages — but the Sözcel tile opens its page inside an
iframe (`#fb-game-overlay` / `#fb-game-frame`) laid over the book rather than navigating to it: no
reload, no lost place in the flip. This is the same trick `kahvehane.html`'s own (now parked) game
deck used, and the game pages already carry both halves of it unchanged — `window.self !== window.top`
hides their own nav/columns behind `body.embedded-game` and turns their back arrow into a
`postMessage('ist-close-game-overlay', …)` instead of a navigation, which `wireGameOverlay()` in
project.html listens for to close the layer. A page opened this way is torn down on close
(`frame.src = 'about:blank'`) rather than kept alive behind the layer, so the next open is a fresh
start.

**It stands in the exact room the map and the band already fill on every other page, not edge to
edge.** The two bars stay up throughout (see "THE TWO BARS ARE OMNIPRESENT"): the overlay's own
top is `--map-hero-top` and its bottom clears `--navbar-h`, the same two measurements every other
page's map and band are built from — not a guessed fraction of the screen, the same box. Its
z-index sits *under* the bars' own 400/401 (frames.css), the one place on the site content
deliberately stacks below them rather than stopping flush against them: the profile bar's real
height is taller than `--map-hero-top` by design (it already floats over the top sliver of the
map on every page), so the overlay's own top edge sits a little way under it — and that sliver is
what lets the entrance curtains read as sliding out from *behind* the bars rather than over them.

**The opening is two paper pages, not a fade.** The iframe loads at its true, untouched full size
the whole time (`sozcel.html`'s own `layoutGame()` must never measure a transformed box), and two
decorative curtains cover it, each sized to one of those same two regions: one the height of the
map's own square, descending from above to where the word board sits; one the rest of the room
down to the tab bar, rising from below to where the keyboard sits — the same 0.55s curve as THE
sheet's own slide (`sheet.css`), so this reads as the same object opening a different way rather
than a second transition language. They only lift once BOTH that slide has finished and the iframe
has actually fired `load`, so a slow load is never uncovered early and a fast one is never rushed.

**Leaving reverses it, rather than snapping.** The back arrow's `postMessage` used to hide the
layer outright — `hidden = true` in the same tick, the game gone and the book back in one frame,
the one surface on the site that closed with no motion at all (every other one, THE sheet included,
drops its open state and only hides once its own transition has actually finished). Pressing it now
brings the curtains back over the game first — the same fade `.gone` already does in reverse, 0.3s —
and only once they've met does the layer come down (`closeGameOverlay()`). A teardown of the page
itself (`unmount()`, leaving project.html) has nothing left to animate in front of and skips straight
to hidden (`closeGameOverlay(true)`).

Visiting one of the three directly still works exactly as before — the
`<a href="project.html">` fallback is what fires when there is no parent to postMessage — and
their own bottom-bar link and back arrow still point at `project.html` for that case. Tümcel and
Bulmaca are not tiles yet (see "What of this is already standing in `project.html`" above), but
carry the same embed support already, ready for whenever they are wired in the same way.

**The first frame is fetched alone, and that is the whole of why the page feels quick.** Every frame
has to be decoded before the book can reach it — an `<img>` whose bytes are not ready paints
nothing, and a blank page mid-flip is worse than a wait at the start — but waiting for the whole
book means staring at the word "loading" while ~4 MB of drawings arrive. Starting every download at
once shares the connection between all of them and the first page arrives no sooner than the last:
measured on the twelve-frame book over a 4 Mbps link, 7.9s for both. Fetching frame 1 by itself
puts it on screen at **2.1s** (the page itself is ready at 1.8s, so the frame costs 0.3s), and the
rest have the rest of the wait to arrive in — all fetched at once, then decoded one at a time, because simultaneous decodes of a
1080×1920 image allocate ~8 MB of surface each, and the book is twenty-four of them. `fetchPriority` alone does not do this: it
reorders a queue, it does not empty one. The gesture arms only when every frame is in, so the book
is never asked for a page it does not have; until then the reader sees the first drawing and a
count, never a spinner.

**The cast is the point of the rig now.** A stop carries real things — buttons, panels, the page's
own furniture — and `CAST` in project.html is where each one is declared: an element, the stop it
belongs to (`live`), and a pose per slide. Three rules make them work:

- **An actor's shape is a word, not a stylesheet.** The drawing gives the app exactly two
  buttons — a wide **row** in the left column and a small **square** in the right one — so an
  actor declares `shape: 'row' | 'sq'` beside its `live` and `lane`, and `.fb-row` / `.fb-sq`
  state the geometry once for both lanes. An actor's own class (`fb-events`, `fb-sozcel`) says
  what it is OF and never how big it is. A square is genuinely square (`aspect-ratio: 1`),
  which is why its side is derived from the line's one split (`--fb-row-w`) rather than
  written down twice. A lane that restated the geometry would land its cards a few pixels off
  the lane before it, and the walk between them would read as the page reflowing.
- **An actor belongs to one stop and one lane, not to the book.** It is alive only while the book
  is *resting* on that stop and the reader is standing on that lane — not mid-drag, not
  mid-run-out, not on a different stop, and not a lane along (`armCast`). Events and Sözcel are
  slide 12's *and* Kahvehane's, so they are as inert on slide 24 as they are on slide 1, and as
  inert on Kütüphane as they are on either. And **a press that lands on a live actor is that actor's, not the book's** — the drag
  handler must bail out on one. Without that the book swallows its own buttons: it takes pointer
  capture on the way down, which re-targets the eventual click at the capturing element, so the card
  never hears it. It looks exactly like a dead button and nothing throws.
- **An actor carries real data.** `load(el)` is called once per mount, after the element exists and
  awaited by nothing — the book must never wait on the network. The events actor runs the same query
  Kahvehane's deck does, and says three different things: the next evening, a city with nothing on,
  and a fetch that failed.
- **An actor on a middle stop is parked off-screen on both sides of it.** It comes in over the run
  that arrives at its stop and leaves again over the run that departs it, so it belongs to that
  screen coming and going — events slides in from the left across slides 8–12 and back out to the
  left across 12–16, Sözcel mirrors it on the right. The poses are simply symmetric about the
  actor's own slide; nothing in the code knows a stop is in the middle, and leaving a screen is
  arriving at it played backwards.
- **They never appear or disappear.** Every slide gives each of them a place and they travel between
  those places with the finger. A pose is `{x, y, scale, opacity, rot}` where x and y are **percent
  of the actor's own size** — the units a CSS translate uses — so "parked off the left edge" is just
  `x: -160` whatever the screen is, and `{}` means exactly where its CSS puts it. The table is
  sparse: write the slides that matter, the rest interpolates, and it holds before the first pose and
  after the last.

The actors move **continuously** while the frame index jumps whole numbers — a flip book flips, but
type sliding in whole-pixel steps shimmers.

**And it all trails the finger — at two different rates.** The drawings ease toward the book's
position and each actor toward its own, through one `ease()` so they cannot drift apart in how they
feel. But the rate depends on whether a finger is on the glass: **tight while held** (`FRAME_LAG`,
an actor's `lag`) and **heavy once let go** (`FRAME_LAG_FREE`, `lagFree`). A big trail under your
own thumb reads as the app struggling rather than as weight; after release there is nothing to keep
up with, and the slower catch-up is what makes the settle feel heavy rather than mechanical. Higher
is tighter — it is the fraction of the remaining gap closed per 60Hz frame — so the held number is
the big one. Measured: **0.16 of a slide under the finger, and ~610ms to settle after release**
(0.69 and ~440ms when both phases shared one rate). The rate can change mid-flight without a jump,
because it governs how fast the gap closes and never where anything is. The position is continuous either way — what stays
whole-numbered is only which drawing that lands on, because blending two of them makes a third
nobody drew. `FRAME_LAG: 0` puts the paper back under the finger while the furniture still trails. `lag` is per actor (the fraction of the remaining distance
covered per 60Hz frame; 0.16 reads as weight rather than as lag), applied per elapsed time so a
120Hz screen feels the same rather than catching up twice as fast. Measured on a fast drag the card
trails the book by a steady ~0.65 of a slide.

Two things the lag makes load-bearing. An actor is live once it is **near** its own slide
(`LIVE_EPS`, about six pixels of drift), not once it has arrived: an exponential ease never quite
arrives, and waiting for the last thousandth left the card unpressable for 771ms after it had
visibly stopped — 430ms with the tolerance. The same test covers the drawings, since a book whose
paper is still catching up is visibly mid-flip whatever its target says. And a **programmatic** move must snap rather than
travel (`show(p, true)`), or a page that mounts at a given slide slides its whole cast in from
wherever the last one left them.

**Its own script must not touch the DOM at the top level, and that is a rule for every page.**
router.js runs a page's script at idle, before the reader asks for it, which happens while a
different page's DOM is on screen — so a top-level `getElementById` finds nothing and throws, and a
script that throws half way has already declared its `const`s and can never be run again. Everything
that touches the DOM waits for `mount()`; the router now also refuses to execute any page's script
twice, for the same reason.

### What each screen carries — one template, and the tiles are the difference

Every screen in the app is the same object: **the maps at the top, and two columns of tiles under
them** — a column of wide rows on the left and a column of small squares on the right. The whole of
what makes one screen different from another is what stands in those two columns. That is the
layout answer this app has been circling: a screen is not designed, it is *cast*, and adding a
feature is adding a tile rather than inventing a page.

**Hane is the one exception, and it is the exception on purpose.** Its hero is the petek, full
bleed, and it carries no tiles at all — the middle page is the people and nothing else.

```
        (up / out)                                        (down / in)
      Türkiye — slide 1                                the ilçe — slide 24
      Hikâyeler · Bilgi                                 Kahve · Yorumlar
              │                                              │
        ┌─────┴──────┐        ┌──────────┐        ┌──────────┴───┐
        │ KÜTÜPHANE  │ ────── │   HANE   │ ────── │  KAHVEHANE   │
        │ Haberler   │        │ the petek│        │ Etkinlikler  │
        │ Fikirler   │        │  alone   │        │ Oyunlar      │
        └────────────┘        └────┬─────┘        └──────────────┘
                                   │
                    ▲ up / out — the whole petek: what İstanbul thinks
                    ▼ down / in — Sen: your own hexagon, and what is yours to change
```

| Screen | The map(s) on top | Left column (wide rows) | Right column (squares) |
|---|---|---|---|
| Türkiye (slide 1) | Türkiye | **Hikâyeler** — the stories the map is grouped into | **Bilgi** |
| Kütüphane (lane 0) | İstanbul · the ilçe | **Haberler** | **Fikirler** |
| Hane (lane 1) | none — the petek, full bleed | — | — |
| Kahvehane (lane 2) | İstanbul · the ilçe | **Etkinlikler** (RSVP goes to Hane) | **Oyunlar** — Sözcel, Tümcel, Bulmaca |
| the ilçe (slide 24) | the ilçe, with the member's own picked out | **Kahve** — the Kahve Endeksi's rows | **Yorumlar** |

Six things about it:

- **Both distances are on screen from wherever you are standing.** The two side lanes carry
  İstanbul *and* the reader's own ilçe side by side, so the zoom the reader is not currently at is
  never out of sight — the depth stop each lane can reach is already showing at the top of the
  screen they are standing on. It is the mall stairway drawn rather than argued, and it is "always
  in the middle" applied to the drawing itself.
- **The left column is a feed and the right column is a set.** Left are the things that arrive and
  are taken one at a time — the news, the evenings, the cheapest cups; right is a small fixed
  number of the same kind of thing, which is why Oyunlar is exactly three squares and Sözcel is one
  of them. Never mix the two: a set that grows belongs on the left.
- **Hane's vertical axis is the petek's own three depths, and there is nothing new above or below
  it.** Up/out is level 2 (the whole petek), the reader arrives at level 1 (Yanındakiler), down/in
  is level 0 (Sen — the hexagon with the avatar arrows on it and name, district and the three
  preferences under it). It reads the same way the book does — up is out, down is in — which is
  what makes the two axes one grammar: **the outermost thing on this side is the whole city, and
  the innermost thing is you.** See the petek's own section for how the pull works.
- **The daily opinions are the loop between the two sides.** The questions in the joints of the
  game sequence take a daily opinion from İstanbulites (`daily_questions`, see the schema); the
  city rates them; the result is shown back **the next day, at the petek's outermost depth** —
  which is exactly the depth where the reader is standing far enough out to be looking at everybody
  rather than at their own neighbours. It is the app's own formula in one move: people → their
  ideas → our opinions on those ideas.
- **Two columns, not a menu.** A screen with six unrelated tiles is a launcher, and a launcher is a
  shortcut past everything — the one thing the arrangement exists to prevent.
- **Fikirler is decided in shape and not in content.** The tile has its place on Kütüphane; what
  fills it is parked until it is worth building, the way Makaleler and the neighbourhood comments
  are parked rather than deleted. Bilgi is in the same state at the Türkiye stop.

**What of this is already standing in `project.html`:** Etkinlikler and Sözcel on Kahvehane,
Haberler and Olaylar on Kütüphane, the petek and its three depths on Hane, and the Türkiye map as
slide 1's drawing. **What is still in the parts bin:** the second map on the two lane screens,
Kahve and Yorumlar, Tümcel and Bulmaca beside Sözcel, Hikâyeler and Bilgi at the Türkiye stop, and
slide 24 — which has neither a drawing of its own nor a cast.

### The flip book — `flip.js` + `flip-steps.js`

A depth journey is a flip book: a dozen drawn steps scrubbed by the finger, with every element on
screen having a defined place at each one. Release and it runs to whichever end is nearer. There is
**no stopping in between and nothing to press there**, and that is not a limitation — it is the
whole reason this is cheap.

**It does not move the page; it replaces the screen.** The obvious reading is "animate the real page
from one level to the next", and it is the expensive one: the two levels are different DOM styled by
stylesheets that cannot both be live, so the page has to be rebuilt somewhere in the middle of the
gesture — a single ~111ms task, and a frozen main thread is what "not smooth" actually is. Instead a
layer of its own owns the screen for the length of the journey (the drawings, plus a few actors
posed over them), it costs nothing but transforms and opacity, and the real page underneath is
swapped **while the reader is looking at a drawing**. Measured on a 4× CPU: 60 frames under the
finger, every one 17ms, none dropped.

- **An actor is a clone parked on its own element's box**, so step 0 lines up with the page
  underneath by construction rather than by anyone's arithmetic. The real element is hidden
  (`visibility`, never `display` — the page must not re-lay-out mid-gesture) and put back on reveal.
- **Poses are relative to where the element really sits**, so `{x:0, y:0, scale:1, opacity:1}` means
  "exactly where it lives". A sparse table is enough: give a pose at step 0 and step 6 and it
  travels evenly between them, holding after the last one you wrote.
- **The frame is whole-numbered, the actors are continuous.** A flip book flips — interpolating two
  drawings makes a third nobody drew — but type moving in whole-pixel jumps shimmers.
- **A journey and its reverse are one table**, counted from the other end, so there is never a
  second one to keep in sync.
- **The step count should match the number of drawings.** They are the same journey seen two ways:
  the drawings are the map, the step table is everything printed over it.

The one rule the artwork owes: **step 0 has to look like the level being left and the last step like
the one being arrived at**, because those are the two frames that hand over to a real page.

### The zoom is DRAWN, not computed — `map-frames.js`

Where a depth journey has drawings, the scale transform gives way to **a strip of frames,
played**. The maps here are hand-painted: a mathematical zoom of one can only get bigger, and it
has to choose between pixelating (raster) and losing the hand (traced to vector). A drawn journey
has neither problem and gains what neither can offer — control of every in-between. `map-frames.js`
is only the projector; it knows nothing about what is on the frames.

- **The frame count is a style decision the code never encodes.** Eight frames over the transition
  is ~21fps and reads as hand animation on twos; twenty is ~52fps and reads as video. Drop in
  however many are drawn and set `count` in `JOURNEYS`. See `assets/map/zoom/README.md` for what to
  draw and what it costs.
- **A drag SCRUBS the strip**, it does not play it: progress maps onto frame index, so dragging
  slowly flips through the drawings one at a time — the reader actually sees each one, which the
  continuous scale could never show them. On release the remainder runs out at a fixed rate, or
  backwards if the gesture was abandoned.
- **Playing is a change of opacity and nothing else.** Every frame is its own node, decoded before
  the gesture can begin (`warm`, at idle, beside the page prefetch). Never a `src` swap — an `<img>`
  whose `src` changes goes blank until the new bytes decode, the same trap `home-map.js` documents
  as "the city flickering out", and here it would land mid-drag.
- **A journey whose frames are not decoded yet refuses**, and the scale transform runs instead.
  That fallback is the ordinary path, not a degraded one: İstanbul ↔ mahalle is deliberately
  undrawn, because a geographic zoom into the reader's own district would need one journey per
  district (25 of them) and the mahalle level has no map to arrive at anyway.
- **The traced hit-region overlay is hidden for the length of the journey** and restored at the far
  end. It cannot follow hand-drawn frames — nobody is re-tracing the districts per frame — and taps
  mid-zoom mean nothing.
- **The last frame is handed over, not cut to.** It stands over the arriving page's own map and
  fades (`settle`, called from `navigateTo` once `mount()` has run), so the strip and the real map
  have to agree on the final image. They do; break that and the handover becomes a visible cut.

**The swap is chunked, because one task is what jank actually is.** Everything `navigateTo` does
after its await — unmount, stylesheet, `innerHTML`, overlays, script, `mount()`, `setBarLayout` —
used to run inside the single callback that resolved that wait. Measured on a 4×-throttled CPU
(roughly a real phone) that is one **111ms `TimerFire`**: a clean 17ms cadence, then nine frames in
a row where nothing can paint, then clean again. No easing, no drawing and no fade fixes a frozen
main thread. The work is necessary; doing it in one uninterruptible block is not — so the phases
are separated by `yieldFrame()` (rAF, then a task, so a frame genuinely gets through). Total CPU is
unchanged; what changes is that the strip keeps moving over the top of it. After: **no long tasks
at all, worst frame 33–50ms** instead of 150.

**And the release carries one number, not three.** A finger let go at 80% has 20% of the journey
left, and the strip's playout, the outgoing page's fade and how long the swap holds off must all
agree on that or the page is cut instead of faded — the wait used to be a flat full duration, which
on a drag taken most of the way was a third of a second of nothing. `rest` is that number, floored
at 35% of the duration so there is always room for a real crossfade.

**The frames replace the MAP, not the screen** — the strip sits at `z-index: 0`, above the map
(which is −1 on Kütüphane and inside `main` at 0 on Kahvehane) and below every column (6/3, 1/1,
2/1 across the pages). That placement is the whole difference between a zoom and a reload: the
page's own furniture goes on floating over the drawings exactly as it floats over the real map
today. A strip painted over the columns blanks the entire screen for the length of the journey,
which is what a reload looks like however good the drawings are.

**And the page does not dissolve under the finger.** The drag scales and does not fade at all — a
zoom moves the page toward you, it does not erase it, and an abandoned gesture should not mean
watching the page come back. The crossfade belongs to the commit, where it happens in the last 30%
and the arriving page is in within its first 30%, so the strip is lifted off a page that is already
solid. Measured, Kütüphane → Kahvehane: the columns hold at opacity 1 for the whole drag and the
first 240ms of the commit, there is a single ~80ms beat of map-only at the deepest point, and the
arriving page is complete at +440ms while the strip does not begin to lift until +480ms. Before
this the content was at 0.10 before the finger even left the glass and flat 0 for ~480ms, which is
exactly what reads as a page reloading.

**The strip owns the screen, not the map's box.** Every frame is drawn on one 9:16 canvas
(1080×1920) and laid over the whole viewport with `object-fit: cover`, so all of them are cropped
identically on any phone and nothing shifts between one and the next — which is the only thing the
code owes the drawings. Measuring onto `.map-panel` would be the obvious choice and the wrong one:
the two levels do not share that box. On a 390×844 phone Kütüphane's is 390×896 at y=−52 —
full-bleed, the whole screen — while Kahvehane's is a 390×390 square hero at y=26. (This section
used to claim both were squares. They are not.) So the reconciliation lands in the artwork instead:
the last frame has to show the city sitting in its square hero exactly where that page puts it,
because the strip fades out over the real map. What the frames before it do with that square is a
drawing decision, not a code one.

### `mahalle.html` — the innermost level

The reader's own ilçe, and the mahalles inside it, with theirs picked out. Deliberately the
smallest true thing: **there is no mahalle map**, because there is no mahalle geometry —
`public.mahalles` carries `id`, `ilce_id` and `name_tr` and no polygon (`db/mahalles.sql`), so a
drawing of this level would have to be invented rather than traced. Everything else this level
should eventually hold hangs off that decision, so it waits for it. The page does not scroll; one
list scrolls inside it, bottom-aligned like every other stack on a phone.

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

### The petek — which is Hane itself (`IstProfileCard.mountHivePage`)

The petek (`hiveGridHTML`) is **one shared honeycomb**, drawn from where the reader is standing in
it: their own cover frame in the middle, everybody else on their map placed exactly where they
actually are around it, and — at its outermost depth — a "+" on each free side of their own
hexagon. It is not six slots of your own — see the schema section above for what that means and why.

**It is the middle page**, not something opened over one. It was a page of your profile, then a
sheet grown out of a PETEK button over Hane's map; the map is gone and the honeycomb is simply
what Hane *is*. **A mount starts from the map the last one ended with** (`_hiveMap`): every entry
re-fetches it, but the fetch takes a beat, and a grid drawn from nothing in the meantime is the
reader alone in six empty sides — a shape several times the size of the real one, since the fit
quite correctly fills the window with whatever it was handed — which then visibly collapses into
itself when the map lands. A first load has no last time to start from, so there the drawing is
held back until the map arrives (`.ist-hive-waiting`): blank paper for a beat is not a lie, a wrong
drawing is. Nothing opens and nothing closes: you arrive on the middle page and you are
standing in the grid, which is the shortest possible distance between a reader and the one object
this app is about. Anahane mounts it into a node it owns (`#hive-page`) via
`IstProfileCard.mountHivePage({ sb, I18N, mountId })` on every entry — including a virtual one,
which swaps `#ist-content` and takes the previous mount with it — and every mount re-fetches
`hive_map()`, because somebody else's attachment may have carried this whole petek somewhere since
it was last drawn.

**The petek has three depths, and the reader pulls up and down through them**
(`HIVE_LEVELS` in profile-card.js). It is one drawing zoomed, not three pages: what changes is how
far out the reader is standing in the same honeycomb, which is the whole difference between a level
and a tab. A level is simply the **ring** — hex distance from the reader — a cell is allowed to
stand at, so changing level is one comparison per cell and never a re-render: the cells further out
fade, the plane rescales about the reader, and both transitions are the stylesheet's.

| Level | What is drawn | Names | The seats |
|---|---|---|---|
| 0 — Sen | your own hexagon alone, large, with what is yours to change under it | — | inert |
| 1 — Yanındakiler | you and the six places touching you; an empty one stays empty | printed | inert |
| 2 — Petek | all of it: their neighbours, the field around it, everything | none | live |

Four things about it:

- **The exchange belongs to the outermost level alone.** Offering a seat and taking one are how the
  petek is *built*, and building it is a thing you do to the whole shape — so the "+" appears, and
  the hexagons answer a press, only where the whole shape is on screen. Below that level the seats
  are drawing: the cells are `disabled`, not merely stripped of their "+", because a hexagon that
  answers a press by doing nothing is worse than one that plainly does not answer. Stepping away
  from that level folds any open seat back rather than leaving a live code burning on a hexagon
  nobody can see.
- **Names are the middle level's, and only ring 1 is ever named.** Level 0 has nobody else on it
  and level 2 hides names outright (at the size the whole shape is drawn at, the names would be the
  only thing on the page, and the shape is what that level is for) — so the middle level is the only
  depth that prints one, and at that depth everything past the first ring is not drawn. A neighbour
  can therefore never go unnamed because of somebody the reader cannot currently see, which is
  exactly what the old "is the cell outside them free?" rule did once levels existed.
- **The reader arrives at the middle depth, every time**, including after a swipe away and back —
  the same rule the three carousel pages follow (see "Always in the middle").
- **The pull is the gesture; the rail is how anyone finds out.** Drag and level-change are one
  handler: the drawing follows the finger while there is drawing left to reach, and once the finger
  runs *past* the end of it — or there was never anywhere to go, which is every level but the
  outermost — the same pull changes the level. A pull up is a scroll down, and down the levels is
  outward. Three marks down the outer edge say how many depths there are and which one you are
  standing at, and each takes a press. Horizontal pulls are left to the carousel underneath
  (`router.js` already ignores anything vertical-dominant).

**Level 0 is where the reader is personalized, and it carries the controls rather than a way to
reach them.** There is no Kişiselleştir button and nothing rises over the page: the avatar arrows
stand on the reader's own hexagon (`hiveAvatarPickerHTML` — the profile sheet's own markup, ids and
four `wire*Carousel` functions, reused unchanged), and their name, district, member-since and three
preferences (dil, renk, görünüm) are printed under it. **Every control commits itself**, the way the
avatar arrows already did — so there is no Kaydet here either, and nothing to confirm. What is *not*
here is the account (email, kefil, referral code, Çıkış Yap): that is not personalization, and it
stays on Kütüphane's profile page. Two mechanical notes: the arrow block is a node of its own
standing on the me cell's coordinates, because the me cell is a `<button>` and a button inside a
button is not something the parser keeps; and it is `display: none` away from level 0 rather than
faded, both to keep the arrows out of the tab order and so `fitHive` can tell they are not on the
paper. The whole block is laid *over* the foot of the window rather than taking room from it, so the
window never changes size between depths; `fitHive` reserves the height it measures and centres the
reader in what is left.

**The petek takes the band, and the events take what is left.** On a phone Hane's hero is not the
map's square: the other two pages' hero is a drawing of a fixed size and gets a square, while this
one is a shape that grows with the reader standing in the middle of it. Pinned to the map's square,
the middle of the drawing sat in the middle of a box in the top third of the screen with dead paper
under it on any night with nothing on. So row 1 is `minmax(0, 1fr)` — whatever the events leave.

**And the events do not take room from it at all: they are laid OVER its foot** (`--hane-events-h`
on `#main-site`, `grid-area: hero` + `align-self: end` on `.col-left`). The petek gets the whole
band between the two bars — and the drawing is **fitted** to clear the strip's *opened* height and
**stands** centred in what its *resting* height leaves (`--ist-hive-reserve` /
`--ist-hive-reserve-rest`, handed to `fitHive` as Hane's own two strip heights, so there is one set
of numbers and not two that can drift). Two different jobs: the fit is the promise that **a card
opening can never come up over the people**, on any screen; the resting centre is where the petek
actually stands, which is nearly all the time. Where centring it that low would put its foot under
an open card, `fitHive` lifts it exactly that far and no further. It is the same move level 0's own
block makes inside the drawing. A column with a grid row of its own made the reader's
position a function of how tall it was: it stood the drawing above the middle of the screen by half
the strip, and every kept card, every empty night, every card opened moved them again.

**One evening fills the strip, and the next is a slide to the side** (`#events-panel`,
`wireEventStripSwipe`). The strip is one card tall, so a stack in it could only ever be a scroller
showing a card and a half — a list you read half of. It is a row of whole cards instead, snapped by
the platform's own scroll-snap rather than a drag handler of this page's, and with more than one in
it each card gives up a strip of its width so the next one shows at the edge (there is no room in a
90px band for dots, and a carousel nobody knows is a carousel is a list with one item in it). The
one thing it needs from JS is a `stopPropagation`: the three-page carousel listens for exactly this
gesture on the document, so a slide here would otherwise deal the reader to Kütüphane instead of to
their next evening — and only while there is genuinely something to slide to, or a single card would
leave a dead band across the bottom of the screen that the page carousel can't be reached from.

**The strip is one card tall, and opening a card grows it upward** (`.col-left.events-open`,
`--hane-events-open-h`). Because it is laid over the window rather than standing in a row, that
growth changes nothing about the layout: the card rises over the foot of the drawing and folds back
down, and the reader does not move a pixel. Two things this makes load-bearing — the cards and the
grown page must be **opaque** (`--paper-card` is deliberately translucent on this page, from the
days these floated over a map photo, so both composite it onto `--paper`), and a busy night scrolls
inside the strip rather than growing it.

**The frames are a five-step tone ladder, and the step is distance from the reader**
(`--ist-hive-ring-*` on `.ist-hive-page`): you are the darkest thing on the page, then the members
you hold, then members on the same petek you are not attached to, then the free sides you can offer,
then the field of places nobody stands in yet. All five are the ring of the same drawn hexagon
(`--hexframe-stroke`, frames.css), so it is one ladder rather than five treatments — and how deep
into the petek something is stays legible before a word is read. Level 2 is `color-mix`ed because
the palette has nothing between `--ink` and `--muted`; the flat value declared above it is the
fallback, and the ladder stays monotonic either way.

**The reader's own avatar is the page's exact centre, on every device.** The window fills the whole
of `.ist-hive-page` — Hane's middle cell, the hero square on a phone and the middle column on a
desktop — and the dock is laid *over* its foot rather than taking height from it: a dock that took
room would move the middle of the window off the middle of the page, and the one fixed point of
this drawing is the person holding the phone. Around them the grid draws a **transparent field of
further empty cells** (`hiveGhostCellHTML`) so the honeycomb reads as something that continues;
those are drawing, not interface — the only openings that do anything are the six sides of the
reader's own hexagon, because those are the only seats that are theirs to give.

**And at the outermost depth that field runs off every edge of the screen.** A honeycomb is a shape
that continues, so a comb that stops in mid-air with bare paper past it reads as the end of the
world rather than as the middle of one. Two things make it reach: the field is laid out as the
**rectangle the screen actually is** (`hiveFieldReach`) rather than as rings around the reader —
rings that reach the top of a phone reach only half as far across it at that height, so the corners
came out bare — and at that depth alone the **clip is lifted** (`html.ist-hive-all`, set by
`applyHiveLevel`; `.ist-hive` in profile-card.css and `main` / `.petek-page` in anahane.html), so
the drawing runs under the events column and past the tab bar to the screen's own edges. Nothing
about the fit changes with it: the window fitHive measures is exactly what it was, so the drawing
is scaled the same and the reader stays dead centre — only the clip is different. Nothing is left
out of the field for a name, either: a name is printed in the cell just outside its member, which
is always at ring 2 and therefore never drawn at the middle depth (the only depth that prints
names), so skipping it punched a hole in the comb beside every neighbour at exactly the depth the
shape itself is for.

**The window is the room the page has; the petek is not.** What changes as members are added is the *drawing*, never the page: `fitHive` scales the grid
into the window and, once it would have to shrink past legibility (`HIVE_MIN_SCALE`), leaves it
there and lets it be dragged instead. What has to fit is the room the drawing needs **around the
reader**, not its own box: the reader stays dead centre, so a petek grown out to one side is still
asking for that much room on both, and fitting the raw box leaves the far side clipped by a window
the arithmetic had just called roomy. The window is re-fitted on resize, since it is now a page and
pages change size.

Every cell is placed on the plane by `calc()` against `--ist-hive-step-x` / `--ist-hive-step-y`, so
the whole grid is laid out in the drawing's own units at whatever size the cells happen to be — the
JS emits coordinates, never pixels. `hivePos` and those two tokens are the only places the packing
is stated. The grid reuses the cover's own frame for every cell — same mask, same drawn ring, same
badges — so there is no second frame treatment to keep in sync.

A side is filled **hand-to-hand, by code** (`db/hive_slot_codes_v5.sql`) — and the code is the
**empty seat itself**, not the member. Tapping a free side of your own hexagon mints a code for
exactly that place, good for ten minutes and for one person; you read it out to whoever is standing
in front of you, they type it into the dock's resting field, and they land there. Then it is spent.
There is deliberately no member search, no follow button and no request-accept flow — and now
nothing to carry around either: a code that outlives the meeting is a handle on a person, and this
one dies with the meeting. It is a record of contact, not a follower list, and it is the closest
thing to a connection the site has (still no DMs — ever).

Handing over a code is an **introduction, not a note one person takes about the other**: attaching
is mutual by construction (you are neighbours or you are not), and Çıkar clears the bond both ways.
That is what keeps it from being a follow — there is no arrangement in which one member is holding
the other without being held back.

**You see the whole petek, including the parts that are not yours.** A member you are not attached
to — somebody else's neighbour, standing on the same grid — is drawn a shade back and, tapped, says
so: they are not yours to detach, and you attach to them the same way you attach to anyone, by
being handed their code. Hiding them would be a lie about the shape, and the shape is the object.

**A member is named in the paper beside their own hexagon** (`hiveNameHTML`), on whichever side of
the reader they are standing: everyone to the left of you is named to the left of their frame,
ranged right against it; everyone to the right is named to the right, ranged left — so the names
read outward from the middle and the middle of the drawing stays the people. The label is printed
only where the cell just outside it is empty: it lives in the drawing's own gaps, so a name is
never laid over somebody's frame, and a member walled in on their outer side is named by the dock
when they are tapped (which is where their district is anyway). It is absolutely placed and out of
flow — the packing is arithmetic, and nothing about it may shift because somebody's name is long —
and `fitHive` measures the names when it fits the grid, since they hang outside the plane's own box.

**Under the name is where that member stands in their own day** (`hiveStatHTML`,
`db/hive_member_status.sql`): how much of the news is still stacked in their Kütüphane
(`3+ HABER` / `2 HABER` / `1 HABER`, nothing at all when their deck is empty) and how far into the
day's games they have got (`0/3 OYUN` on a day with three, `0/1` on a day with one). It is the
app's own formula written on the drawing — a name says somebody is beside you, these two lines say
they are in the middle of the same day you are, which is the thing worth walking up to them about.
Deliberately two numbers and no titles: *what* they are reading is theirs, *that* they have three
left to read is the city's. The fraction prints whether or not they have started (`0/3` is the
point of it) and disappears only on a day with no games at all; a game the admin switched off is
on neither side of it, because it is not a step anybody has left to take.

Both come from one RPC per map, `hive_member_status(p_game_date, p_game_key)` — it takes no member
list and answers only for the caller's own map, so it is a caption on the petek and not a directory
anyone can sweep. It lands after `hive_map()` and simply re-renders; the labels are out of flow, so
nothing on the plane moves when they arrive, and a missing migration leaves members uncaptioned
rather than breaking the page. The games half is arithmetic over `game_results` and
`game_day_toggles`, which were already there. The news half needed **`news_dealt`** — until now
what a member had dealt with lived only in their own `localStorage` (`dunya_dealt_<uid>`), so
nothing outside that one browser could say how deep their deck was. It mirrors that store exactly,
stamp semantics included (what is kept is the story's `updated_at` **as thrown**, so a gelişme puts
it back in their deck and back into their count), and the deck itself is still driven by
`localStorage` — the server copy is written fire-and-forget beside it and merged back in on load,
later stamp winning. RLS lets a member read only their own rows: the petek says somebody has three
stories left, never which three.

**Both halves of the exchange are printed inside the hexagon they belong to.** There used to be a
dock along the foot of the page carrying whatever was tapped; there is no bar on this page at all
now. Pressing a free side of your own hexagon mints that seat's code and prints it **in the seat**,
with the minutes it has left ticking under it — the code *is* that empty place
(`db/hive_slot_codes_v5.sql`), so it belongs in it. Pressing **yourself** opens the field that takes
a code somebody gave you, inside your own frame, because you are the one who moves; six characters
is the whole code, so it goes the moment it is complete and there is no button to press. Every
hexagon is its own close button — pressing the open one again folds it back — which is why nothing
here carries one.

Nothing about a cell's box changes for a press: the frame is the same size open or shut, so no
neighbour ever moves — what changes happens *inside* the drawing (`.ist-hive-cell-open` inks the
ring and lifts it slightly via `transform`).

**Pressing a member names them on the bar, and pressing the bar opens them** (`pickHiveMember`,
`setBarMember`). At the outermost depth — the only one where the seats are live and the only one
that prints no names — a press turns that hexagon **red** and puts the member's name at the top of
the screen, in the place the reader's own name stands; pressing that name opens their profile, the
same member sheet every `.author-link` on the site opens. Pressing the hexagon again puts your own
name back, the way every other hexagon on this page is its own close button.

Two steps rather than one, and nothing rises over the petek in between. The drawing stays the page:
the whole of what a press changes on it is the one ring going red, which is the only red on the
page and is therefore unmistakably about the name that has just appeared at the other end of the
screen (a short red rule under that name says so from its end). The bar needed no new gesture for
the second step — *press a person, read about them* is what that bar has always done; it is simply
aimed at somebody else. And it is why the intermediate step is skipped on **desktop**, where there
is no bar at all (see `mount`): the press opens the profile straight away rather than turning a
hexagon red and leading nowhere.

The name is cleared by anything that means the reader has left them: another depth (`setHiveLevel`),
another page (`router.js` calls `clearBarMember` beside `clearSeat`), a fresh mount of Hane.

**What this page leaves behind it is unwound on the way out** (`IstProfileCard.unmountHivePage`,
called from anahane's own `unmount`). Two things about the petek outlive the swapped `#ist-content`,
and both of them showed up as the same bug — swipe away, swipe back, and the kept-events column and
the captions under everybody's names were gone. The **depth classes are on `<html>`**
(`ist-hive-mid` / `ist-hive-offmid` / `ist-hive-all`, `paintHiveDepthClasses`), which is deliberate —
anahane's CSS is what hides the events column away from the middle depth — but left behind at level 0
or 2 they hide that column on the way back in, for the length of the next mount's round trip and for
good if that mount takes an early return; so the unmount clears them and the mount asserts the middle
depth **before** its first `await`, not after. And **every in-flight fetch checks itself against
`_hive`** before drawing (`loadHive`, `reloadHiveMap`, `loadHiveStatus`, `offerHiveSlot`,
`claimHiveSlot`, plus a `_hiveMountSeq` on the mount itself): they all draw by id into whatever
`#po-hive-mount` currently is, so a call started on the last visit and answered on this one painted
its own captionless, differently-levelled petek over the live one — and, having lost the race, was
never corrected. For the same reason `_hiveMap` is re-kept when the **status** lands and not only
when the cells do: it is what the next mount starts from, and a remembered map with its captions
dropped is a petek whose neighbours go blank under their names until (or unless) the next RPC lands.

Detaching is still parked — `hive_unbond()` is untouched in the database and still refuses a bond
inside the week it was made in, but nothing calls it, and where a detach belongs on a page that is
only the drawing is an open question.

Two mechanical notes, both of which fail silently. A member cell is a `<button>` now, so
`applyHiveLevel` disables it below the outermost level like every other cell — and a disabled
button is dispatched **no pointer events at all**, which would kill a drag or a level-swipe that
happened to start on one. `.ist-hive-cell:disabled` is therefore `pointer-events: none`, so the
gesture falls through to the page it was always aimed at. And the press effect (the hexagon gives
way under the finger and springs back when released, `.ist-hive-cell-pressing`) is driven by
pointer events rather than `:active`, which sticks after a tap on iOS — the same reason Kütüphane's
cards press the way they do.

Nothing on this page scrolls, and neither does any of the three profile sets: each fits the room it
is given, the way a politician's page does. If a new block stops fitting, drop a block — do not turn
the page into a scroller.

### Another member's profile — `IstProfileCard.initMemberSheet({ sb, I18N })`

Clicking any `.author-link` / `.kefil-link` anywhere on the site opens that member's read-only
profile as the sheet above (cover + weekly grid + member since + kefil chain). One implementation,
in `profile-card.js`; each page just calls `initMemberSheet` once. Do not write a page-local
profile popup.

### The seat card — `#politician-card` (`politician-card.js` + `.css`)

Two of the three carousel pages carry one card naming who holds power over what the page is
showing: the viewer's own district's **Belediye Başkanı** on Kahvehane (one fixed seat), and on
Kütüphane a seat that **follows the map** — whichever country is touched on the phone map, resting
on the **Cumhurbaşkanı** with nothing selected. **Hane carries none**: it is the self and the
people, and it has no map for a seat to be true of (see its own section). Both print the same
markup and open the same `.politician-detail` view as THE sheet — `politician-card.js` builds both,
each page only supplies its seat and its own `openDetail`.

Every seat comes from one session-long cache, `IstPoliticianCard.seats(sb)` — the map-driven page
needs the next seat to arrive *with* the tap, and both pages read the same table. It lives in the
shared module rather than in each page for a mechanical reason too: both page scripts end up in the
one document router.js keeps, and two top-level `let`s of the same name there is a SyntaxError that
takes the second page's whole script with it.

Country seats are keyed by the same id the map's `data-country` carries and are recorded in
`political_seats.country` (`db/political_seats_v2_countries.sql`; a seat carries a neighborhood
*or* a country, never both). No row is required — a country nobody has been recorded for prints
its own name over "Henüz eklenmedi", exactly as an unassigned district does on Hane. It must not
quietly fall back to the Cumhurbaşkanı instead: a touch that leaves the bar unchanged is
indistinguishable from the feature being broken, which is precisely how it was first reported.

It is **not desktop-only**, and must not be made desktop-only again: the phone is the platform ~90%
of users are on (see Vision), and hiding it there hid the app's whole political layer from almost
everyone. On a phone the card as a card *is* hidden — there is no room for a second card beside a
full-bleed map — and the seat moves into **one end of the profile bar** instead (`#ist-pc-seat`,
"THE TOP BAR" in profile-card.css), with you at the other: the left end on Kütüphane, the right end
on Kahvehane (see the bar's own section for why it changes ends, and what moves when it does).
`render()` paints both surfaces at once and wires the same detail sheet to each; it is painted in
the bar's own classes (`.ist-pc-id` / `.ist-pc-name` / `.ist-pc-meta`), so there is one type
scale on that bar rather than a second set to keep in sync — neither end is the junior of the pair,
and nothing may scale one of them down. Which end it stands at is **not** this module's: it is the
page's, set by `IstProfileCard.setBarLayout`, and `paintBar()` only ever fills the slot.

Two things about the bar seat fail silently if forgotten. The bar lives **outside `#ist-content`**,
so the seat survives a virtual navigation that replaces everything else: `router.js` calls
`clearSeat()` the moment it swaps the content, or Kahvehane wears the Cumhurbaşkanı until its own
fetch lands (and a tap in that window opens Kütüphane's sheet). And profile-card.js rebuilds its row
whenever the profile re-renders, which empties the slot — it calls `paintBar()` afterwards to put
the seat back. The slot itself keeps its half of the row on the two pages that name a seat whether
it is painted or not, so the row does not re-flow under the reader when the seat lands a moment
after the page it belongs to.

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
    `loading-screen.js?v=2`, `sheet.js?v=2`); changing one of them means bumping its number **in
    every page at once**. All pages must spell the URL identically — `router.js`'s `loadScriptOnce` matches on
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
