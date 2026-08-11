// Kahve Endeksi — schedule evaluation for the coffee price index.
//
// The index is a live board, not a static list (see db/coffee_prices_v3_live.sql):
// a venue is only on it while it is actually open, and while a discount
// window is running it trades at the discounted price. That evaluation is
// needed in two places — kahvehane.html, which renders the board, and
// admin.html, which shows the admin what a row they are editing is doing
// right now — so it lives here rather than being copy-pasted into both
// (see the cross-cutting note in CLAUDE.md's Coding Conventions).
//
// Pure functions over a coffee_prices row plus a Date. No DOM, no
// Supabase, no i18n: callers format the result themselves.
//
//   const s = IstCoffee.evaluate(row);           // row = a coffee_prices row
//   s.open        -> boolean, is the venue serving right now
//   s.price       -> the price it is charging right now (discount applied)
//   s.basePrice   -> its undiscounted price
//   s.discounted  -> boolean, is the discount currently running
//
// Usage on a page:
//   <script src="coffee-index.js"></script>

(function (global) {

  const MIN_PER_DAY = 24 * 60;

  // "18:00" / "18:00:00" / a bare hour -> minutes since midnight.
  // Postgres hands back `time` columns as "HH:MM:SS"; the admin form's
  // <input type="time"> produces "HH:MM". Both parse here.
  function parseHM(value) {
    if (value == null || value === '') return null;
    const m = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    if (!isFinite(h) || !isFinite(min) || h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  // Minutes since midnight -> "18:00". Values past midnight (a window
  // that spans it) wrap, so 25:30 reads as 01:30.
  function formatHM(mins) {
    if (mins == null) return '';
    const m = ((mins % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  function minutesOfDay(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  // One day's window out of the `hours` object, or null when that day is
  // closed (key missing, explicitly null, or unparseable).
  function dayWindow(hours, dow) {
    if (!hours) return null;
    const entry = hours[String(dow)];
    if (!entry || typeof entry !== 'object') return null;
    const open = parseHM(entry.open);
    const close = parseHM(entry.close);
    if (open == null || close == null) return null;
    // close <= open means the window runs past midnight (20:00 -> 02:00).
    return { open, close, overnight: close <= open };
  }

  function hasAnyHours(hours) {
    return !!hours && typeof hours === 'object' && Object.keys(hours).length > 0;
  }

  // Is the venue serving at `now`, and when does that next change?
  //
  // Returns { known, open, closesAt, opensAt, opensInDays } where the
  // times are minutes-since-midnight on their own day. `known: false`
  // means no schedule was recorded — those venues stay on the board
  // permanently rather than disappearing, so rows entered before v3
  // keep behaving the way they always did.
  function openState(hours, now) {
    if (!hasAnyHours(hours)) return { known: false, open: true, closesAt: null, opensAt: null, opensInDays: 0 };

    const dow = now.getDay();
    const nowMin = minutesOfDay(now);

    // Today's own window.
    const today = dayWindow(hours, dow);
    if (today && nowMin >= today.open && (today.overnight || nowMin < today.close)) {
      return { known: true, open: true, closesAt: today.close, opensAt: null, opensInDays: 0 };
    }

    // Yesterday's window, if it ran past midnight into this morning.
    const yesterday = dayWindow(hours, (dow + 6) % 7);
    if (yesterday && yesterday.overnight && nowMin < yesterday.close) {
      return { known: true, open: true, closesAt: yesterday.close, opensAt: null, opensInDays: 0 };
    }

    // Closed: walk forward for the next opening, up to a full week.
    // Today only counts if its opening is still ahead of us — which is
    // why the loop runs to 7 inclusive: a venue open on Mondays only,
    // asked on a Monday night, next opens seven days out.
    for (let i = 0; i <= 7; i++) {
      const w = dayWindow(hours, (dow + i) % 7);
      if (!w) continue;
      if (i === 0 && w.open <= nowMin) continue;
      return { known: true, open: false, closesAt: null, opensAt: w.open, opensInDays: i };
    }
    // Recorded, but never open on any day.
    return { known: true, open: false, closesAt: null, opensAt: null, opensInDays: null };
  }

  // Is the row's discount running at `now`?
  //
  // Returns null when the row has no discount configured, otherwise
  // { active, price, start, end, label, endsAt }. A null happy_start
  // means the discount runs from midnight; null/empty happy_days means
  // every day.
  function discountState(row, now) {
    const price = row.happy_price == null ? null : Number(row.happy_price);
    const end = parseHM(row.happy_end);
    if (price == null || !isFinite(price) || end == null) return null;

    const start = parseHM(row.happy_start) ?? 0;
    const overnight = end <= start;
    const nowMin = minutesOfDay(now);
    const days = Array.isArray(row.happy_days) && row.happy_days.length
      ? row.happy_days.map(Number)
      : [0, 1, 2, 3, 4, 5, 6];

    // An overnight discount that is running right now may have started
    // yesterday, so the day it belongs to is yesterday, not today.
    const inWindow = overnight ? (nowMin >= start || nowMin < end) : (nowMin >= start && nowMin < end);
    const windowDay = (overnight && nowMin < end) ? (now.getDay() + 6) % 7 : now.getDay();

    return {
      active: inWindow && days.indexOf(windowDay) !== -1,
      price,
      start,
      end,
      endsAt: end,
      days,
      label: row.happy_label || null,
    };
  }

  // The full live state of one row. This is what the board renders from.
  function evaluate(row, now) {
    const at = now || new Date();
    const basePrice = Number(row.price);
    const open = openState(row.hours, at);
    const discount = discountState(row, at);
    const discounted = !!(discount && discount.active && open.open);

    return {
      open: open.open,
      hoursKnown: open.known,
      closesAt: open.closesAt,
      opensAt: open.opensAt,
      opensInDays: open.opensInDays,
      // Minutes until closing time, null when open-ended or closed.
      // Drives the "closing soon" marker on the board.
      minutesToClose: open.open && open.closesAt != null
        ? (((open.closesAt - minutesOfDay(at)) % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY
        : null,
      basePrice,
      price: discounted ? discount.price : basePrice,
      discounted,
      discount,
    };
  }

  global.IstCoffee = { evaluate, openState, discountState, parseHM, formatHM, dayWindow };

})(window);
