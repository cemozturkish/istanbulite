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

  global.IstDate = { parts, now, iso, daySeed, nextMidnight, TZ };
})(window);
