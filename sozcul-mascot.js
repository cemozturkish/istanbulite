// ══════════════════════════════════════════════════════════════
// Sözcül-of-the-day helper.
//
// Resolves whether the signed-in user has been picked as today's
// Sözcül (or an upcoming Sözcül who still owes a word) and surfaces
// a one-time mascot popup announcing it.
//
// Used by kahvehane.html (announce + glow the Sözcel tile) and
// sozcel.html (in-game greeting before the word-entry form).
// ══════════════════════════════════════════════════════════════
(function (global) {
  const ASSIGNMENT_TABLE = 'sozcel_sozcul_assignments';
  const ANSWERS_TABLE = 'sozcel_used_answers';
  let cachedStatus = null;
  let cachedAt = 0;
  let cachedProfile = null;
  let stylesInjected = false;

  function istanbulDateISO(offsetDays = 0) {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
    ist.setDate(ist.getDate() + offsetDays);
    const y = ist.getFullYear();
    const m = String(ist.getMonth() + 1).padStart(2, '0');
    const d = String(ist.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Returns either null (no session) or
  //   { session, today, isTodaySozcul, hasSubmittedToday,
  //     pendingDates, nextPendingDate, assignedDates, allSubmittedAhead }
  async function getStatus(sb) {
    if (cachedStatus && Date.now() - cachedAt < 30 * 1000) return cachedStatus;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const today = istanbulDateISO();
    const { data: assignments } = await sb
      .from(ASSIGNMENT_TABLE)
      .select('game_date')
      .eq('user_id', session.user.id)
      .gte('game_date', today)
      .order('game_date', { ascending: true });
    const assignedDates = (assignments || []).map(a => a.game_date);
    let submitted = new Set();
    if (assignedDates.length) {
      const { data: words } = await sb
        .from(ANSWERS_TABLE)
        .select('used_on, word')
        .in('used_on', assignedDates);
      submitted = new Set((words || []).filter(w => w.word).map(w => w.used_on));
    }
    const pending = assignedDates.filter(d => !submitted.has(d));
    cachedStatus = {
      session,
      today,
      isTodaySozcul: assignedDates.includes(today),
      hasSubmittedToday: submitted.has(today),
      assignedDates,
      pendingDates: pending,
      nextPendingDate: pending[0] || null,
      // Future-only sözcül whose pending word still needs to be entered.
      hasPendingFuture: pending.some(d => d !== today),
    };
    cachedAt = Date.now();
    return cachedStatus;
  }

  function invalidate() { cachedStatus = null; cachedAt = 0; }

  async function getMascot(sb, userId) {
    if (cachedProfile) return cachedProfile;
    try {
      const { data } = await sb
        .from('profiles')
        .select('mascot')
        .eq('id', userId)
        .maybeSingle();
      cachedProfile = (data && data.mascot) || 'dog';
    } catch (_) {
      cachedProfile = 'dog';
    }
    return cachedProfile;
  }

  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const css = `
      #sozcul-mascot-popup {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 100000;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        max-width: min(380px, calc(100vw - 36px));
        font-family: 'Source Serif 4', Georgia, serif;
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 280ms ease, transform 280ms ease;
        pointer-events: none;
      }
      #sozcul-mascot-popup.szm-show { opacity: 1; transform: translateY(0); pointer-events: auto; }
      #sozcul-mascot-popup .szm-bubble {
        position: relative;
        background: var(--paper, #eddbd0);
        color: var(--ink, #4C382A);
        border: 1px solid var(--rule, #b8a08a);
        padding: 14px 38px 14px 16px;
        font-size: 1rem;
        line-height: 1.45;
        border-radius: 12px 12px 4px 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        max-width: 100%;
      }
      #sozcul-mascot-popup .szm-bubble strong { color: var(--ink-red, #a4322b); }
      #sozcul-mascot-popup .szm-close {
        position: absolute;
        top: 6px;
        right: 8px;
        background: transparent;
        border: none;
        color: var(--muted, #867264);
        font-size: 1.4rem;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
      }
      #sozcul-mascot-popup .szm-close:hover { color: var(--ink, #4C382A); }
      #sozcul-mascot-popup .szm-mascot-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      #sozcul-mascot-popup .szm-mascot {
        width: 84px;
        height: 84px;
        background: var(--paper, #eddbd0);
        border: 1px solid var(--rule, #b8a08a);
        border-radius: 50%;
        padding: 4px;
        flex-shrink: 0;
      }
      #sozcul-mascot-popup .szm-mascot img {
        width: 100%; height: 100%; object-fit: contain;
      }
      @media (max-width: 768px) {
        #sozcul-mascot-popup {
          left: 12px;
          right: 12px;
          bottom: calc(56px + env(safe-area-inset-bottom) + 12px);
          max-width: none;
          align-items: stretch;
        }
        #sozcul-mascot-popup .szm-mascot { width: 64px; height: 64px; }
        #sozcul-mascot-popup .szm-bubble { font-size: 0.95rem; }
      }
      /* Glow used by the Kahvehane game-link tile when the user is the
         picked Sözcül and still owes a word. */
      .game-link.picked-sozcul {
        animation: sozcul-glow 2200ms ease-in-out infinite;
      }
      @keyframes sozcul-glow {
        0%, 100% {
          box-shadow:
            0 0 0 0 rgba(164, 50, 43, 0.0),
            0 0 18px 4px rgba(164, 50, 43, 0.0);
        }
        50% {
          box-shadow:
            0 0 0 2px rgba(164, 50, 43, 0.55),
            0 0 22px 6px rgba(164, 50, 43, 0.35);
        }
      }
    `;
    const style = document.createElement('style');
    style.id = 'sozcul-mascot-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // On desktop, the right column (game links + scoreboard) sits flush
  // against the viewport's right edge -- the popup's default fixed
  // right:18px lands right on top of it. Nudge the popup left of that
  // column instead, so it appears beside the scoreboard rather than
  // over it. Mobile keeps its own full-width bar (see media query above)
  // so this only applies above the mobile breakpoint.
  function clearSidebar(root) {
    if (window.innerWidth <= 768) return;
    const sidebar = document.querySelector('.col-right');
    if (!sidebar) return;
    const rect = sidebar.getBoundingClientRect();
    if (!rect.width) return;
    root.style.right = `${Math.round(window.innerWidth - rect.left + 18)}px`;
  }

  // Show the mascot popup. The bubble + mascot fade in, the user can
  // close with the X or by clicking the bubble/mascot.
  function showPopup({ mascot, html, onDismiss }) {
    injectStyles();
    const old = document.getElementById('sozcul-mascot-popup');
    if (old) old.remove();
    const root = document.createElement('div');
    root.id = 'sozcul-mascot-popup';
    // TEMP: dog art isn't uploaded yet — use the cat PNG for dog mascots too
    // so the popup doesn't show a broken image. Restore the dog branch once
    // assets/mascot-dog-right.png exists.
    const src = 'assets/mascot-cat-right.png';
    root.innerHTML = `
      <div class="szm-bubble">
        ${html}
        <button class="szm-close" type="button" aria-label="Kapat">×</button>
      </div>
      <div class="szm-mascot-row">
        <div class="szm-mascot"><img src="${src}" alt=""></div>
      </div>
    `;
    document.body.appendChild(root);
    clearSidebar(root);
    requestAnimationFrame(() => root.classList.add('szm-show'));
    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      root.classList.remove('szm-show');
      setTimeout(() => { try { root.remove(); } catch (_) {} if (onDismiss) onDismiss(); }, 280);
    };
    root.querySelector('.szm-close').addEventListener('click', e => { e.stopPropagation(); dismiss(); });
    root.querySelector('.szm-bubble').addEventListener('click', e => {
      if (e.target.closest('.szm-close')) return;
      dismiss();
    });
    root.querySelector('.szm-mascot').addEventListener('click', dismiss);
    return { dismiss };
  }

  function notifiedKey(page, date) {
    return `sozcul_mascot_seen_${page}_${date}`;
  }
  function markNotified(page, date) {
    try { localStorage.setItem(notifiedKey(page, date), '1'); } catch (_) {}
  }
  function wasNotified(page, date) {
    try { return localStorage.getItem(notifiedKey(page, date)) === '1'; }
    catch (_) { return false; }
  }

  // Default copy keyed off the active language (read from <html data-lang>
  // when i18n.js is on the page). Each page can override by passing copy.
  function isEnglish() {
    return (global.I18N && global.I18N.isEnglish && global.I18N.isEnglish()) ||
           (document.documentElement.getAttribute('data-lang') === 'more_english');
  }

  const DEFAULT_COPY = {
    kahvehane: {
      tr: 'Tebrikler — bugün <strong>Sözcül</strong> sen seçildin! Bugünün kelimesini ve sözlük bilgisini girmek için <strong>Sözcel</strong>e geç.',
      en: 'Congrats — you have been picked as today\'s <strong>Sözcül</strong>! Head into <strong>Sözcel</strong> to enter the word and its dictionary info.',
    },
    sozcelEntry: {
      tr: 'Bugünün <strong>Sözcülü</strong> sensin. Kendi oyununu oynayamazsın — bunun yerine kelimeyi ve sözlük bilgisini sen seç. Diğer İstanbullular bu kelimeyi tahmin edecek.',
      en: 'You are today\'s <strong>Sözcül</strong>. You can\'t play your own game — instead, pick the word and its dictionary entry. The rest of Istanbul will guess it.',
    },
    kahvehaneFuture: {
      tr: 'Yaklaşan bir gün için <strong>Sözcül</strong> sen seçildin. Kelimeyi girmek için <strong>Sözcel</strong>e bak.',
      en: 'You have been picked as an upcoming <strong>Sözcül</strong>. Check <strong>Sözcel</strong> to enter the word.',
    },
  };

  // Public entrypoint for any page that wants to greet the picked Sözcül.
  //   await IstSozcul.greet({ sb, page, copy?, onlyOnce? })
  // Returns the same status object as getStatus() (plus { popup } if shown).
  async function greet({ sb, page, copy, onlyOnce = true }) {
    const status = await getStatus(sb);
    if (!status || !status.session) return null;
    if (status.pendingDates.length === 0) return status;

    // Pick the right copy for this page.
    const lang = isEnglish() ? 'en' : 'tr';
    let key = null;
    let dateForFlag = status.today;
    if (page === 'sozcel') {
      // Greet anytime the takeover is showing — either today's locked-in
      // sözcül or a future pending assignment that's still open.
      if (status.pendingDates.length > 0) {
        key = 'sozcelEntry';
        dateForFlag = status.nextPendingDate;
      } else if (status.isTodaySozcul) {
        key = 'sozcelEntry';
      } else {
        return status;
      }
    } else {
      // Kahvehane (or any other page): greet for today first, fall back to future.
      if (status.isTodaySozcul && !status.hasSubmittedToday) key = 'kahvehane';
      else if (status.hasPendingFuture) {
        key = 'kahvehaneFuture';
        dateForFlag = status.nextPendingDate;
      } else return status;
    }
    const msgRef = (copy && copy[key]) || DEFAULT_COPY[key];
    const html = (msgRef && (msgRef[lang] || msgRef.tr)) || '';
    if (!html) return status;
    if (onlyOnce && wasNotified(page, dateForFlag)) return status;

    const mascot = await getMascot(sb, status.session.user.id);
    const popup = showPopup({ mascot, html, onDismiss: () => markNotified(page, dateForFlag) });
    return Object.assign({ popup }, status);
  }

  // Glow the Sözcel game-link tile inside the right-column nav when the
  // current user is the picked sözcül with a pending word.
  async function glowGameLink(sb) {
    injectStyles();
    const status = await getStatus(sb);
    if (!status || !status.pendingDates.length) return;
    document.querySelectorAll('.game-link[data-game="sozcel"]').forEach(el => {
      el.classList.add('picked-sozcul');
    });
  }

  global.IstSozcul = {
    getStatus, invalidate, getMascot, showPopup, greet, glowGameLink,
    istanbulDateISO,
  };
})(window);
