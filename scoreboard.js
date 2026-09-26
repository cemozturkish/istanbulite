// ══════════════════════════════════════════════════════════════
// The weekly scoreboard — one board, one set of numbers
// ──────────────────────────────────────────────────────────────
// loadScoreboard existed four times over, in three versions, and the
// versions did not agree about what a point IS:
//
//   kahvehane + sozcel   the week from Monday 00:00 Istanbul; a win is
//                        worth 20/12/8/6/4/2 by attempts, a loss that was
//                        played is worth 1, plus first-solver bonuses and
//                        the Sözcü's own credit
//   tumcel + bulmaca     a rolling 7 days; every win is worth exactly 1,
//                        no bonuses, losses ignored
//
// So the same board, under the same title, showed a member a different
// score depending on which page they opened it from. tumcel and bulmaca
// do not even define gamePoints/firstSolverBonus/sozcuPoints, which is
// why their copy fell back to counting wins -- it looks like the version
// that predates the points model and never caught up.
//
// This is that points model, once. What stays with each page is where the
// board is put and how it arrives: Kahvehane filters by district, carries
// a title and a week-progress countdown and animates the swap; Sözcel
// writes into two lists; the other two write into one. Those are real
// differences between the pages, and folding them into an options bag
// here would be inventing an abstraction to hide them.
// ══════════════════════════════════════════════════════════════
(function (global) {
  const TOP_N = 5;
  // The first-solver bonuses. They lived as top-level consts in sozcel.html,
  // which is a global lexical binding -- so scoreboard.js could see them on
  // that page and only that page, and firstSolverBonus threw
  // "ISTANBUL_FIRST_BONUS is not defined" on the other three. A shared
  // module cannot reach back into one page for its constants.
  const ISTANBUL_FIRST_BONUS = 10;
  const NEIGHBORHOOD_FIRST_BONUS = 5;

  // ── What a day of play is worth ──
  function gamePoints(attempts, won) {
    if (won) {
      const pts = [20, 12, 8, 6, 4, 2];
      return pts[attempts - 1] ?? 2;
    }
    return attempts >= 1 ? 1 : 0;
  }

  function firstSolverBonus(tier) {
    return tier === 'istanbul' ? ISTANBUL_FIRST_BONUS : tier === 'neighborhood' ? NEIGHBORHOOD_FIRST_BONUS : 0;
  }

  function sozcuPoints(attempts, won) {
    if (!won) return 0;
    const pts = [5, 1, 2, 3, 2, 1];
    return pts[attempts - 1] ?? 0;
  }

  // Monday 00:00 of the current Istanbul week. Deliberately not a rolling
  // seven days: "Haftanın Skor Tahtası" is a week that everybody starts
  // together and that ends for everybody at once, which a window that
  // slides with each reader is not.
  function weekCutoff() {
    const now = global.IstDate.now();
    const dow = now.getDay();                       // 0 = Sunday
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  }

  function isoOf(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Fetch every page by a unique key, even when the API caps responses
  // below our requested size. A short page is not proof of exhaustion.
  async function readPages(query, key) {
    key = key || 'id';
    const rows = [];
    let cursor = null;
    for (;;) {
      let page = query().order(key, { ascending: true }).limit(250);
      if (cursor !== null) page = page.gt(key, cursor);
      const { data, error } = await page;
      if (error) throw error;
      if (!data || data.length === 0) return rows;
      const next = data[data.length - 1][key];
      if (next == null || (cursor !== null && next <= cursor)) {
        throw new Error('Scoreboard pagination did not advance');
      }
      rows.push(...data);
      cursor = next;
    }
  }

  // Explicit dates avoid lexical comparisons on historical Y-M-D text.
  // Include both spellings for older/imported rows, but never future days.
  function weekDates(cutoff) {
    const today = global.IstDate.now();
    const dates = [];
    for (const d = new Date(cutoff); d <= today; d.setDate(d.getDate() + 1)) {
      dates.push(isoOf(d));
    }
    return dates;
  }

  // ── The ranked board, as data ──
  // Returns { rows, error }. rows is at most TOP_N of
  // { uid, score, neighborhood, name }, already sorted. An empty week is
  // an empty array, not an error -- the two mean different things to the
  // reader and each page words them itself.
  async function weekly(sb, opts) {
    opts = opts || {};
    const neighborhoodFilter = opts.neighborhoodFilter || null;
    // The weekly board is a SÖZCEL board. Both of the implementations that
    // carried the full points model filtered .eq('game', 'sozcel'), and the
    // model is Sözcel-shaped anyway -- attempts 1..6, and a bonus for the
    // member who set that day's word. Tumcel and Bulmaca's copies had no
    // such filter, so they were counting every game's rows through a
    // one-point-per-win rule: wrong twice over, in opposite directions.
    const game = opts.game || 'sozcel';
    const parseYMD = global.IstDate.parseYMD;

    const cutoff = weekCutoff();
    const dates = weekDates(cutoff);
    const keys = [...new Set(dates.flatMap(d => [d, d.split('-').map(Number).join('-')]))];
    let results;
    try {
      results = await readPages(() => sb
        .from('game_results')
        .select('id, user_id, neighborhood, date, won, attempts, created_at')
        .eq('game', game)
        .in('date', keys)
        .gte('attempts', 1));
    } catch (e) {
      return { rows: null, error: e };
    }
    if (results.length === 0) return { rows: [], error: null };
    // A padded and unpadded date represent the same player/day.
    const weeklyAll = results.map(r => ({ ...r, date: isoOf(parseYMD(r.date)) }));

    // Find the first winner per date, both Istanbul-wide and per-district
    // (earliest created_at among won=true rows). Always computed from the
    // full weekly set -- not the neighborhood-filtered one below -- since
    // "Istanbul's first solver" must be judged against every district, not
    // just the one being viewed. Istanbul's first solver is necessarily also
    // their district's first solver, so the district bonus only ever applies
    // to someone who isn't the Istanbul winner.
  const istanbulFirstByDate = new Map();
  const districtFirstByDate = new Map(); // date -> Map(neighborhood -> { user_id, created_at })
  weeklyAll.filter(r => r.won).forEach(r => {
    const existing = istanbulFirstByDate.get(r.date);
    if (!existing || r.created_at < existing.created_at) {
      istanbulFirstByDate.set(r.date, { user_id: r.user_id, created_at: r.created_at });
    }
    if (r.neighborhood) {
      if (!districtFirstByDate.has(r.date)) districtFirstByDate.set(r.date, new Map());
      const nbMap = districtFirstByDate.get(r.date);
      const nbExisting = nbMap.get(r.neighborhood);
      if (!nbExisting || r.created_at < nbExisting.created_at) {
        nbMap.set(r.neighborhood, { user_id: r.user_id, created_at: r.created_at });
      }
    }
  });
  function firstTierFor(r) {
    if (istanbulFirstByDate.get(r.date)?.user_id === r.user_id) return 'istanbul';
    const nbMap = districtFirstByDate.get(r.date);
    if (r.neighborhood && nbMap?.get(r.neighborhood)?.user_id === r.user_id) return 'neighborhood';
    return null;
  }

    const inScope = neighborhoodFilter
      ? weeklyAll.filter(r => r.neighborhood === neighborhoodFilter)
      : weeklyAll;
    if (inScope.length === 0) return { rows: [], error: null };

    // Deduplicate per (user, date): keep the best (highest-scoring) result per day.
    const byUserDate = new Map();
    inScope.forEach(r => {
      if (!r.user_id) return;
      const key = r.user_id + '|' + r.date;
      const pts = gamePoints(r.attempts, r.won) + firstSolverBonus(firstTierFor(r));
      const existing = byUserDate.get(key);
      if (!existing || pts > existing.pts) {
        byUserDate.set(key, { user_id: r.user_id, neighborhood: r.neighborhood, date: r.date, pts });
      }
    });

    const scores = new Map();
    byUserDate.forEach(entry => {
      const prev = scores.get(entry.user_id) || { score: 0, neighborhood: null, lastDate: null };
      prev.score += entry.pts;
      const d = parseYMD(entry.date);
      if (entry.neighborhood && (!prev.lastDate || (d && d >= prev.lastDate))) {
        prev.neighborhood = entry.neighborhood;
        prev.lastDate = d;
      }
      scores.set(entry.user_id, prev);
    });

    // Sözcü bonus: credit each day's word-setter with the points every
    // solver earned off their word (sozcuPoints), so picking a word people
    // enjoy pays off on the same weekly board as playing does. Skipped for
    // the per-neighborhood filtered view -- that list is about who solved
    // the puzzle from that neighborhood, not who set the word.
    if (!neighborhoodFilter && game === 'sozcel') {
      try {
        const sozcuRows = await readPages(() => sb
          .from('sozcel_used_answers')
          .select('used_on, sozcul_id')
          .in('used_on', dates), 'used_on');
        const sozcuByDay = new Map();
        (sozcuRows || []).forEach(r => {
          const d = parseYMD(r.used_on);
          if (d && r.sozcul_id) sozcuByDay.set(d.getTime(), r.sozcul_id);
        });
        if (sozcuByDay.size > 0) {
          const creditedPlayerDay = new Map();
          inScope.forEach(r => {
            if (!r.user_id || !r.won) return;
            const d = parseYMD(r.date);
            if (!d) return;
            const sozcuId = sozcuByDay.get(d.getTime());
            if (!sozcuId || sozcuId === r.user_id) return;
            const dedupKey = r.user_id + '|' + d.getTime();
            const existing = creditedPlayerDay.get(dedupKey);
            if (!existing || gamePoints(r.attempts, true) > gamePoints(existing.attempts, true)) {
              creditedPlayerDay.set(dedupKey, { sozcuId, attempts: r.attempts });
            }
          });
          creditedPlayerDay.forEach(({ sozcuId, attempts }) => {
            const bonus = sozcuPoints(attempts, true);
            const prev = scores.get(sozcuId) || { score: 0, neighborhood: null, lastDate: null };
            prev.score += bonus;
            scores.set(sozcuId, prev);
          });
        }
      } catch (e) { return { rows: null, error: e }; }
    }

    // Resolve display names from the profiles table.
    const userIds = Array.from(scores.keys());
    const nameMap = new Map();
    const nbFallbackMap = new Map();
    try {
      for (let offset = 0; offset < userIds.length; offset += 100) {
        const batch = userIds.slice(offset, offset + 100);
        const profs = await readPages(() => sb
          .from('profiles')
          .select('id, first_name, neighborhood')
          .in('id', batch));
        (profs || []).forEach(p => {
          if (p.first_name) nameMap.set(p.id, p.first_name.toLocaleUpperCase('tr-TR'));
          if (p.neighborhood) nbFallbackMap.set(p.id, p.neighborhood);
        });
      }
    } catch (e) { return { rows: null, error: e }; }

    const rows = Array.from(scores.entries())
      .map(([uid, v]) => ({
        uid,
        score: v.score,
        neighborhood: v.neighborhood || nbFallbackMap.get(uid) || null,
        name: nameMap.get(uid) || 'Anonim'
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'tr'))
      .slice(0, TOP_N);

    return { rows, error: null };
  }

  // ── The board, as markup ──
  // districtNames is each page's own neighborhoodNames map. Pass
  // withDistrict: false for a view that is already about one district,
  // where naming it on every row is noise.
  function rowsHTML(rows, opts) {
    opts = opts || {};
    const names = opts.districtNames || {};
    const withDistrict = opts.withDistrict !== false;
    const I18N = global.I18N;
    const esc = I18N.escapeHtml;
    return (rows || []).map((p, i) => {
      let label = esc(p.name);
      if (withDistrict) {
        const nb = (names[p.neighborhood] || p.neighborhood || '').toLocaleUpperCase('tr-TR');
        if (nb) {
          label = I18N.isEnglish()
            ? `${esc(p.name)} FROM ${nb}`
            : `${nb}${I18N.ablative(nb).toLocaleUpperCase('tr-TR')} ${esc(p.name)}`;
        }
      }
      return `<li class="scoreboard-item r${i + 1} author-link" data-user-id="${esc(p.uid)}">` +
        `<span class="scoreboard-rank">${i + 1}.</span>` +
        `<span class="scoreboard-player">` +
          `<span class="scoreboard-name">${label}</span>` +
        `</span>` +
        `<span class="scoreboard-score">${p.score}</span>` +
      `</li>`;
    }).join('');
  }

  global.IstScoreboard = { weekly, rowsHTML, weekCutoff, gamePoints, firstSolverBonus, sozcuPoints,
                           TOP_N, ISTANBUL_FIRST_BONUS, NEIGHBORHOOD_FIRST_BONUS };
})(window);

