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

    let results;
    try {
      const { data, error } = await sb
        .from('game_results')
        .select('user_id, neighborhood, date, won, attempts, created_at')
        .eq('game', game)
        .gte('attempts', 1);
      if (error) throw error;
      results = data;
    } catch (e) {
      return { rows: null, error: e };
    }
    if (!results || results.length === 0) return { rows: [], error: null };

    const cutoff = weekCutoff();
    const weeklyAll = results.filter(r => {
      const d = parseYMD(r.date);
      return d && d >= cutoff;
    });

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
    if (!neighborhoodFilter) {
      try {
        const { data: sozcuRows } = await sb
          .from('sozcel_used_answers')
          .select('used_on, sozcul_id')
          .gte('used_on', isoOf(cutoff));
        const sozcuByDay = new Map();
        (sozcuRows || []).forEach(r => {
          const d = parseYMD(r.used_on);
          if (d && r.sozcul_id) sozcuByDay.set(d.getTime(), r.sozcul_id);
        });
        if (sozcuByDay.size > 0) {
          const creditedPlayerDay = new Set();
          inScope.forEach(r => {
            if (!r.user_id) return;
            const d = parseYMD(r.date);
            if (!d) return;
            const sozcuId = sozcuByDay.get(d.getTime());
            if (!sozcuId || sozcuId === r.user_id) return;
            const dedupKey = r.user_id + '|' + d.getTime();
            if (creditedPlayerDay.has(dedupKey)) return;
            creditedPlayerDay.add(dedupKey);
            const bonus = sozcuPoints(r.attempts, r.won);
            if (bonus <= 0) return;
            const prev = scores.get(sozcuId) || { score: 0, neighborhood: null, lastDate: null };
            prev.score += bonus;
            scores.set(sozcuId, prev);
          });
        }
      } catch (e) { /* Sözcü bonus is best-effort */ }
    }

    // Resolve display names from the profiles table.
    const userIds = Array.from(scores.keys());
    const nameMap = new Map();
    const nbFallbackMap = new Map();
    try {
      if (userIds.length > 0) {
        const { data: profs } = await sb
          .from('profiles')
          .select('id, first_name, neighborhood')
          .in('id', userIds);
        (profs || []).forEach(p => {
          if (p.first_name) nameMap.set(p.id, p.first_name.toLocaleUpperCase('tr-TR'));
          if (p.neighborhood) nbFallbackMap.set(p.id, p.neighborhood);
        });
      }
    } catch (e) { /* name lookup is best-effort */ }

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
