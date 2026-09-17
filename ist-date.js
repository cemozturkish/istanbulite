// ══════════════════════════════════════════════════════════════
// ist-date.js — the one place that answers "what time is it in
// Istanbul". Every daily roll-over in the app (game seeds, the used-word
// date key, game locks, coffee opening hours, weekly scoreboards) hangs
// off this, so it has to be exact on every device.
//
// It replaces the pattern that used to be copy-pasted across the site:
//
//   new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }))
//
// That formats the time as a human-readable string ("8/13/2026, 12:05:03 AM")
// and then asks the Date constructor to parse it back. Parsing of that
// format is not specified — it depends on the engine, and modern ICU even
// puts a narrow no-break space (U+202F) before AM/PM — so on some devices
// it yields an Invalid Date, whose getFullYear()/getDate() are NaN. A
// client in that state builds a garbage date key ("NaN-NaN-NaN"), fails
// to find the day's row, and quietly behaves as if the day had no data.
//
// formatToParts() hands over the same numbers without ever going through
// a parser, so there is nothing left to misread.
// ══════════════════════════════════════════════════════════════
(function (global) {
  const TZ = 'Europe/Istanbul';

  const partsFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  // Istanbul wall-clock fields for `base` (default: right now).
  function parts(base) {
    const out = {};
    for (const { type, value } of partsFmt.formatToParts(base || new Date())) {
      if (type !== 'literal') out[type] = value;
    }
    // Some ICU builds render midnight as hour 24 under the h23/h24 cycle.
    let hour = Number(out.hour);
    if (hour === 24) hour = 0;
    return {
      year: Number(out.year),
      month: Number(out.month),   // 1-12
      day: Number(out.day),
      hour,
      minute: Number(out.minute),
      second: Number(out.second),
    };
  }

  // A Date whose *local* fields read back as Istanbul's wall clock — the
  // drop-in replacement for the old parsed `ist` value, so getDay(),
  // getHours(), setDate() and comparisons against other IstDate.now()
  // values all keep working the way the calling code expects.
  function now(base) {
    const p = parts(base);
    return new Date(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  }

  // Istanbul-local calendar date as "YYYY-MM-DD", optionally offset by a
  // whole number of days. Day arithmetic runs in UTC so a device-local DST
  // jump can never shift the result onto the wrong day.
  function iso(offsetDays) {
    const p = parts();
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
    if (offsetDays) d.setUTCDate(d.getUTCDate() + Number(offsetDays));
    return d.toISOString().slice(0, 10);
  }

  // Unpadded "YYYY-M-D" — the historical key format of game_results.date
  // and the per-day localStorage keys. Kept distinct from iso() so those
  // existing rows/keys stay addressable.
  function daySeed() {
    const p = parts();
    return `${p.year}-${p.month}-${p.day}`;
  }

  // Start of the next Istanbul day, as a Date on the same wall-clock
  // footing as now() — for countdowns to the daily reset.
  function nextMidnight() {
    const t = now();
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    return t;
  }


  // ── Sunrise/sunset over Istanbul — the clock the light/dark theme runs
  // on now (see palette.js). No user picks Açık/Koyu any more: the sun
  // does, so this has to be a real calculation rather than a stored
  // preference. Standard sunrise equation (see
  // https://en.wikipedia.org/wiki/Sunrise_equation), accurate to within a
  // minute or two — plenty for a UI switch, and there is no elevation/
  // horizon correction worth adding for a latitude that never sees a
  // polar day or night.
  const SUN_LAT = 41.0082;   // Istanbul
  const SUN_LNG = 28.9784;  // east positive
  const SUN_LW = -SUN_LNG;  // the equation's own convention: longitude WEST

  function toRad(deg) { return deg * Math.PI / 180; }
  function toDeg(rad) { return rad * 180 / Math.PI; }

  // Julian Day Number for a Gregorian calendar date (proleptic formula).
  function julianDayNumber(y, m, d) {
    const a = Math.floor((14 - m) / 12);
    const yy = y + 4800 - a;
    const mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
      + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  function julianToDate(J) {
    return new Date((J - 2440587.5) * 86400000);
  }

  // Sunrise/sunset for the Istanbul calendar date `base` falls on
  // (default: now), as real Date instants — not Istanbul wall-clock
  // fields like now() returns, since these are compared straight against
  // `new Date()` elsewhere.
  function sunTimes(base) {
    const p = parts(base);
    const jdn = julianDayNumber(p.year, p.month, p.day);

    const nStar = jdn - 2451545.0009 - SUN_LW / 360;
    const n = Math.round(nStar);
    const Jstar = 2451545.0009 + SUN_LW / 360 + n;

    let M = (357.5291 + 0.98560028 * (Jstar - 2451545.0)) % 360;
    if (M < 0) M += 360;
    const Mr = toRad(M);
    const C = 1.9148 * Math.sin(Mr) + 0.0200 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);

    let lambda = (M + 102.9372 + C + 180) % 360;
    if (lambda < 0) lambda += 360;
    const lambdaR = toRad(lambda);

    const Jtransit = Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambdaR);

    const delta = Math.asin(Math.sin(lambdaR) * Math.sin(toRad(23.4397)));
    const latR = toRad(SUN_LAT);
    const cosOmega = (Math.sin(toRad(-0.833)) - Math.sin(latR) * Math.sin(delta))
      / (Math.cos(latR) * Math.cos(delta));
    const omega = toDeg(Math.acos(Math.max(-1, Math.min(1, cosOmega))));

    return {
      sunrise: julianToDate(Jtransit - omega / 360),
      sunset: julianToDate(Jtransit + omega / 360),
      solarNoon: julianToDate(Jtransit),
    };
  }

  // Whether `base` (default: now) falls between that Istanbul day's
  // sunrise and sunset. This is the whole of what decides light vs. dark
  // mode site-wide (palette.js) — there is no OS preference and no
  // member setting behind it any more.
  function isDaytime(base) {
    const b = base || new Date();
    const { sunrise, sunset } = sunTimes(b);
    return b >= sunrise && b < sunset;
  }

  // ── WHICH EDITION IS OUT ──
  // The app prints two editions a day and the sun decides which: the
  // morning paper from sunrise, the evening one from sunset. This is the
  // whole of that switch -- isDaytime() already answers it exactly, and
  // nothing else needs to know how a sunrise is computed.
  function edition(base) { return isDaytime(base) ? 'gun' : 'gece'; }

  // Istanbul calendar date for `base`, offset by whole days. Same
  // arithmetic as iso(), which is always about *now*; this one is about a
  // given instant, which is what makes an edition key testable.
  function isoAt(base, offsetDays) {
    const p = parts(base);
    const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
    if (offsetDays) d.setUTCDate(d.getUTCDate() + Number(offsetDays));
    return d.toISOString().slice(0, 10);
  }

  // An edition and the day it belongs to.
  //
  // The night edition SPANS MIDNIGHT -- in December it runs 17:37 to
  // 08:22 -- so a reader holding the paper at 01:00 is holding the one
  // that came out yesterday evening. Keying that on today's calendar date
  // would file the back half of every winter night under the wrong day,
  // and two readers on the same night would be looking at different
  // editions depending on which side of midnight they opened the app.
  // So a night is named for the day it BEGAN on.
  function editionKey(base) {
    const b = base || new Date();
    if (isDaytime(b)) return { edition: 'gun', date: isoAt(b, 0) };
    // Before this morning's sunrise = still last night's paper.
    return { edition: 'gece', date: isoAt(b, b < sunTimes(b).sunrise ? -1 : 0) };
  }

  // ── WHEN THE NEXT EDITION GOES TO PRESS ──
  // The app prints two editions a day and the sun sets both deadlines:
  // the morning paper at sunrise, the evening one at sunset. This is the
  // instant the NEXT one comes out, which edition it will be, and which
  // day it is named for -- everything an editor's countdown needs, and
  // the one place the "next sunrise or next sunset, whichever is sooner"
  // rule is written.
  //
  // It is deliberately NOT nextGameNight() generalised. That one is
  // always the next SUNSET, because the games are night-only and a
  // sunrise is nothing to them; this one is whichever of the two edges
  // comes first, because both of them put a paper out.
  //
  // The edition and its date come straight back out of editionKey() at
  // the instant itself rather than being re-derived here: a night is
  // named for the day it BEGAN on, and that rule must exist once. No
  // nudge past the boundary is needed for it to land -- isDaytime() is
  // `>= sunrise && < sunset`, so the sunrise instant already reads as
  // 'gun' and the sunset instant already reads as 'gece'.
  //
  // Real instants throughout, never now(), whose fields read as
  // Istanbul's wall clock and would offset every subtraction against it
  // by the device's own distance from Istanbul.
  function nextEdition(base) {
    const b = base || new Date();
    const today = sunTimes(b);
    let at;
    if (b < today.sunrise) {
      at = today.sunrise;            // still last night's paper; the morning one is next
    } else if (b < today.sunset) {
      at = today.sunset;             // the morning paper is out; tonight's is next
    } else {
      // Past this evening's sunset, so the next edition is tomorrow
      // morning's. Stepping a whole day off an instant that is already
      // evening lands mid-evening again, nowhere near a date boundary --
      // the same reason nextGameNight() steps the way it does.
      at = sunTimes(new Date(b.getTime() + 86400000)).sunrise;
    }
    const k = editionKey(at);
    return { edition: k.edition, date: k.date, at };
  }

  // ── WHICH NIGHT'S GAMES ARE THESE ──
  // The games are night-only now, and a night SPANS MIDNIGHT, so every key
  // a night's games write has to be the NIGHT and not the calendar date:
  // the word's used_on, the game_results row, the saved board, the admin's
  // own on/off switch, the question in each joint of the sequence. Keyed on
  // the date, a member playing at 23:50 and the same member at 00:10 are
  // two different players of two different days -- the board blanks under
  // them, the word they already solved comes back, and a second result
  // lands on the shared scoreboard.
  //
  // db/sozcel_used_answers_v7_game_night.sql moved the WORD to this key.
  // These two are the same key in the two shapes the rest of the tables are
  // written in, so nothing else is left on the old footing.
  function gameNight(base) { return editionKey(base).date; }   // 'YYYY-MM-DD'

  // The same night unpadded ('YYYY-M-D') -- the historical shape of
  // game_results.date, game_state.date and every per-day localStorage key.
  // Kept a separate function rather than a format argument because those
  // two shapes address different columns and must never be swapped.
  function gameNightSeed(base) {
    const [y, m, d] = gameNight(base).split('-').map(Number);
    return `${y}-${m}-${d}`;
  }

  // The instant the NEXT night's games open: the first sunset strictly
  // after `base`. That is the moment gameNight() changes, so it is what a
  // "new puzzle in…" countdown is actually counting down to -- midnight is
  // the middle of a night, not the end of one.
  //
  // Real instants throughout, never now()'s wall-clock-shifted Date: these
  // are compared against each other, and mixing the two silently offsets
  // the answer by the device's own distance from Istanbul.
  function nextGameNight(base) {
    const b = base || new Date();
    const tonight = sunTimes(b).sunset;
    if (tonight > b) return tonight;
    // Past this evening's sunset, so the next one is tomorrow's. Stepping a
    // whole day off an instant that is already evening lands mid-evening
    // again, nowhere near a date boundary.
    return sunTimes(new Date(b.getTime() + 86400000)).sunset;
  }

  // How long until then, already worded. Same shape as untilMidnight()
  // below, which is what every game page used to call.
  function untilNextNight(opts) {
    const b = new Date();
    const diff = Math.max(0, nextGameNight(b) - b);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return global.I18N ? global.I18N.formatCountdown(hours, minutes, opts) : '';
  }

  // ── WHERE THE LIGHT IS ──
  // The arc the sky is currently crossing, and how far across it we are:
  // sunrise → sunset by day, sunset → the next sunrise by night. It is
  // what the chain of rings under the profile bar prints (see "THE SKY
  // UNDER THE BAR" in profile-card.css) — the sun climbing out of the
  // left of the screen and setting off the right, and then the moon
  // making the same crossing.
  //
  // `phase` is edition()'s own two words rather than a third vocabulary:
  // this is the same sun that decides which paper is out and which way
  // the palette is turned, seen from a different side.
  //
  // A NIGHT SPANS MIDNIGHT, so its two ends come off two different
  // calendar days and which two depends on which side of midnight the
  // caller is standing: before this morning's sunrise the arc began at
  // YESTERDAY's sunset; after this evening's it ends at TOMORROW's
  // sunrise. Stepping a whole day off an instant that is already deep in
  // the night lands deep in another night, nowhere near a boundary,
  // which is the same reason nextGameNight() steps the way it does.
  //
  // Real instants throughout — never now(), whose fields read as
  // Istanbul's wall clock and would offset every subtraction here by the
  // device's own distance from it.
  function skyArc(base) {
    const b = base || new Date();
    const today = sunTimes(b);
    let phase, start, end;
    if (b >= today.sunrise && b < today.sunset) {
      phase = 'gun'; start = today.sunrise; end = today.sunset;
    } else if (b < today.sunrise) {
      phase = 'gece';
      start = sunTimes(new Date(b.getTime() - 86400000)).sunset;
      end = today.sunrise;
    } else {
      phase = 'gece';
      start = today.sunset;
      end = sunTimes(new Date(b.getTime() + 86400000)).sunrise;
    }
    const span = end - start;
    // A span of zero is only reachable well inside the polar circles,
    // which İstanbul is not — but a t of NaN would place the mark
    // nowhere at all, and a chart with no light on it says something
    // false about the sky rather than nothing.
    const t = span > 0 ? Math.min(1, Math.max(0, (b - start) / span)) : 0;
    return { phase, start, end, t };
  }

  // ── Two helpers the game-bearing pages each carried their own copy of ──
  // Both are about the Istanbul day, which is this file's whole subject,
  // so they belong here rather than four times over in four <script>
  // blocks (see CLAUDE.md convention 10).

  // A 'YYYY-MM-DD' key -- the shape used_on, game_date and every daily
  // key on the site are written in -- as a local Date. Returns null
  // rather than an Invalid Date for anything that is not that shape, so
  // a caller can tell "no date" from "a date that failed to parse".
  function parseYMD(s) {
    if (!s || typeof s !== 'string') return null;
    const parts = s.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  // How long until the Istanbul day rolls over, already worded. opts is
  // passed straight through to I18N.formatCountdown, which is what lets
  // Bulmaca say "Yeni bulmaca" where the others use the default.
  //
  // NOT what a game page's "new puzzle in…" should call while the games are
  // night-only -- midnight falls in the middle of a night and nothing about
  // the puzzle changes there. That is untilNextNight() above.
  function untilMidnight(opts) {
    const diff = nextMidnight() - now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return global.I18N ? global.I18N.formatCountdown(hours, minutes, opts) : '';
  }

  global.IstDate = { parts, now, iso, daySeed, nextMidnight, parseYMD, untilMidnight,
                     sunTimes, isDaytime, edition, editionKey, nextEdition, skyArc,
                     gameNight, gameNightSeed, nextGameNight, untilNextNight, TZ };
})(window);
