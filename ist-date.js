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
  function untilMidnight(opts) {
    const diff = nextMidnight() - now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return global.I18N ? global.I18N.formatCountdown(hours, minutes, opts) : '';
  }

  global.IstDate = { parts, now, iso, daySeed, nextMidnight, parseYMD, untilMidnight, sunTimes, isDaytime, TZ };
})(window);
