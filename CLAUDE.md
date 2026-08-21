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
├── anahane.html          # MIDDLE page: home — the PETEK honeycomb itself, plus the events
├── kutuphane.html        # LEFT page (zoom out): Library — Turkey map, ALL news, articles, letters, TBMM
├── kahvehane.html        # RIGHT page (zoom in): Coffeehouse — district map, games hub, scoreboards, events
├── sozcel.html           # Turkish Wordle-style daily word game
├── tumcel.html           # Turkish quote-fragment Connections-style daily game (replaced Bağlantılar)
├── bulmaca.html          # Turkish daily mini crossword
├── admin.html            # Admin dashboard (admin-only)
├── router.js             # Shared shell: single Supabase client, swipe carousel, virtual navigation, clock
├── sheet.css/.js         # THE sheet: the one page that rises from the bottom — see "Site-wide defaults"
├── profile-card.js/.css  # Profile bar (the phone's top bar), avatar, badges — shared across pages
├── onboarding.js/.css    # New-account onboarding flow
├── game-locks.js         # Per-day game on/off enforcement + the sequence's question gates
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
> `game_results`, avatar item columns, `profile_badges` (cover badges), `politicians` +
> `political_seats` (one seat per district, the two fixed national/city ones, and one per country
> on Kütüphane's map — `db/political_seats_countries_seed.sql` fills that last set), TBMM
> seats/parties, `mahalles`, `admin_notifications`, Sözcel sözcü assignments, `coffee_prices`
> (the Kahve Endeksi — v3 adds the opening-hours and scheduled-discount columns that make it
> live), `coffee_comments` (what members say about a venue), `countries` + `country_entries`
> + `country_entry_events` + `country_stories` + `country_story_countries` (what a country on
> Kütüphane's map opens, the key-moment timeline an entry can carry, and which countries light
> and open together as one story) and `breaking_news_countries` (which countries a
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
- Once a session exists (or right after sign-in), redirects to `anahane.html` (the real home)

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
  and the two sides are where power is a fact (Kahvehane's district, Kütüphane's countries)
- **The events are the column beside it** (`#events-panel`, `events` / `event_rsvps`), back from
  Kahvehane. They belong next to the petek: the petek is who you are standing next to, an event is
  the one thing on the site that ends with you actually standing next to them. Unscoped by
  construction — there is no map here to filter by, so it is the whole city's list, each card
  kickered with its own district. Opening a card rises the page's detail sheet with the description
  and a live RSVP row
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
- **The Kahve Endeksi is a button in the top-right corner** (see below), the same door
  Kütüphane's Makaleler/Posta Kutusu boxes are. The events that held the other column went back
  to Hane, beside the petek — the people and where they will be are one page now. The band under
  the map is the day's games alone: on a phone `#main-site` is one column, and `.col-left` (the
  mayor's card, the parked comments) is `display: none` there
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
  (`margin-top: auto`), and over on the thumb side (`align-self: flex-end`, because `.game-picker`
  packs its cross axis to `flex-start` for the desktop row's sake). It keeps the cards' own width
  rather than filling the band: a deck is a hand of cards, not a panel, and it reads as one by not
  spanning everything. A game already played today is inked over the way a story you have dealt
  with is gone — *played* meaning finished (`attempts >= 1`), never merely opened: a game left
  half-done stays on top of the deck, marked, because it is exactly what the reader still has in
  front of them. Sözcel's
  wordmark is a tile's way of saying its name — in the deck it says it in the headline like every
  other card. The desktop three-square tiles are untouched
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
- The **coffee price index** (Kahve Endeksi, `coffee_prices` table) opens from **one button in
  the top-right corner** (`.corner-boxes` > `#coffee-box`) as THE sheet (`#coffee-overlay`), which
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
- **Makaleler and Posta Kutusu are two small buttons in the two top corners**, under the profile
  bar — Makaleler in the left one, Posta Kutusu (with its unread badge) in the right. They used to
  be full-width cards stacked down that column; the column is the news column now, so what is left
  of them is the smallest thing that still reads as a door. On a phone they are pinned there
  (`position: fixed`) over the map rather than being a grid track of their own, one at each end of
  the line — a corner each, because the two doors lead to different rooms. The strip between them
  is map, so it takes no taps (`pointer-events: none` on the column, `auto` on the buttons) or it
  would swallow every touch on the districts under it
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
  `db/country_entries_seed.sql` and `db/country_stories_seed.sql` hold the starting set
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
    into the band that card lies in (see Kütüphane's own section). It is still THE sheet — same
    markup, same `IstSheet.open/close` — only the way it arrives differs. (The PETEK page used
    to be the other one; it is a page of its own now, not a sheet at all.)
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
middle; Kahvehane mirrors Kütüphane — you at the left, the seat at the right. So swiping from
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

### The petek — which is Hane itself (`IstProfileCard.mountHivePage`)

The petek (`hiveGridHTML`) is **one shared honeycomb**, drawn from where the reader is standing in
it: their own cover frame in the middle, everybody else on their map placed exactly where they
actually are around it, and — at its outermost depth — a "+" on each free side of their own
hexagon. It is not six slots of your own — see the schema section above for what that means and why.

**It is the middle page**, not something opened over one. It was a page of your profile, then a
sheet grown out of a PETEK button over Hane's map; the map is gone and the honeycomb is simply
what Hane *is*. Nothing opens and nothing closes: you arrive on the middle page and you are
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

Level 0 is also the one place on this page that carries **words about the reader** — name, district,
member-since, and the way into their own personalization, which opens the profile sheet's settings
blocks via the `sections` override on `openProfileOverlay` (personalization belongs to the middle
page per the Vision section, and this is the middle page's innermost depth). The block is laid
*over* the foot of the window rather than taking room from it, so the window never changes size
between depths; `fitHive` reserves the height it measures and centres the reader in what is left.

**The petek takes the band, and the events take what is left.** On a phone Hane's hero is not the
map's square: the other two pages' hero is a drawing of a fixed size and gets a square, while this
one is a shape that grows with the reader standing in the middle of it. Pinned to the map's square,
the middle of the drawing sat in the middle of a box in the top third of the screen with dead paper
under it on any night with nothing on. So row 1 is `minmax(0, 1fr)` — whatever the events leave —
and the events' column is capped (`max-height: 46vh`) so a busy night scrolls inside its own box
instead of pushing the reader off the middle of the screen.

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

**Pressing a member does nothing, for now.** Their name is beside them and their tone says how far
into the petek they are, so the panel that used to open had only one thing in it that acted: Çıkar.
Detaching is parked — `hive_unbond()` is untouched in the database and still refuses a bond inside
the week it was made in, but nothing calls it, and where a detach belongs on a page that is only
the drawing is an open question. Member hexagons are therefore not buttons at all rather than
buttons that open nothing.

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
