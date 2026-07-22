// ══════════════════════════════════════════════════════════════
// Admin one-shot notification popup.
//
// Fetches the most recent active row from public.admin_notifications
// and shows it as a mascot bubble in the bottom-right, dismissed with
// a tap. Seen state is stored in public.admin_notification_reads so a
// user who dismissed a notification on their phone doesn't see it
// again on their laptop. localStorage is kept as a fast-path cache to
// avoid a round-trip on repeat visits from the same browser.
//
// Usage on any authenticated page:
//   <script src="admin-notification.js" defer></script>
//   IstAdminNotification.show({ sb });
//
// Reuses the same visual language as sozcul-mascot.js so the bubble
// looks native on every page.
// ══════════════════════════════════════════════════════════════
(function (global) {
  const TABLE = 'admin_notifications';
  const READS_TABLE = 'admin_notification_reads';
  const SEEN_KEY_PREFIX = 'admin_notif_seen_';
  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('admin-notif-styles')) {
      stylesInjected = true;
      return;
    }
    stylesInjected = true;
    const css = `
      #admin-notif-popup {
        position: fixed;
        left: 18px;
        bottom: 18px;
        z-index: 100000;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        max-width: min(380px, calc(100vw - 36px));
        font-family: 'Source Serif 4', Georgia, serif;
        opacity: 0;
        transform: translateY(14px);
        transition: opacity 280ms ease, transform 280ms ease;
        pointer-events: none;
      }
      #admin-notif-popup.anp-show { opacity: 1; transform: translateY(0); pointer-events: auto; }
      #admin-notif-popup .anp-bubble {
        position: relative;
        background: var(--paper, #eddbd0);
        color: var(--ink, #4C382A);
        border: 1px solid var(--rule, #b8a08a);
        padding: 14px 38px 14px 16px;
        font-size: 1rem;
        line-height: 1.45;
        border-radius: 12px 12px 12px 4px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.22);
        max-width: 100%;
        cursor: pointer;
        white-space: pre-wrap;
      }
      #admin-notif-popup .anp-close {
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
      #admin-notif-popup .anp-close:hover { color: var(--ink, #4C382A); }
      #admin-notif-popup .anp-mascot-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      #admin-notif-popup .anp-mascot {
        width: 84px;
        height: 84px;
        flex-shrink: 0;
        cursor: pointer;
      }
      #admin-notif-popup .anp-mascot img {
        width: 100%; height: 100%; object-fit: contain;
      }
      @media (max-width: 768px) {
        #admin-notif-popup {
          left: 12px;
          right: 12px;
          bottom: calc(52px + env(safe-area-inset-bottom) + 12px);
          max-width: none;
          align-items: stretch;
        }
        #admin-notif-popup .anp-mascot { width: 64px; height: 64px; }
        #admin-notif-popup .anp-bubble { font-size: 0.95rem; }
      }
    `;
    const style = document.createElement('style');
    style.id = 'admin-notif-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function seenKey(id) { return SEEN_KEY_PREFIX + id; }

  function wasSeen(id) {
    try { return localStorage.getItem(seenKey(id)) === '1'; }
    catch (_) { return false; }
  }

  function markSeen(id) {
    try { localStorage.setItem(seenKey(id), '1'); } catch (_) {}
  }

  async function fetchLatest(sb) {
    const { data, error } = await sb
      .from(TABLE)
      .select('id, body, body_en, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  }

  // Server-side "has the current user already seen this notification?" —
  // authoritative across devices. Returns true when a read row exists.
  async function wasSeenServer(sb, userId, notificationId) {
    const { data, error } = await sb
      .from(READS_TABLE)
      .select('notification_id')
      .eq('user_id', userId)
      .eq('notification_id', notificationId)
      .limit(1);
    if (error) return false;
    return !!(data && data.length);
  }

  // Record that the user has seen a notification. Idempotent — the
  // composite primary key means a duplicate is silently ignored.
  async function markSeenServer(sb, userId, notificationId) {
    try {
      await sb.from(READS_TABLE).insert(
        [{ user_id: userId, notification_id: notificationId }],
        { returning: 'minimal' },
      );
    } catch (_) { /* best effort */ }
  }

  // English-heavy users see body_en when the admin filled one in; everyone
  // else (and English users when body_en is empty) sees the Turkish body.
  function pickBody(notif) {
    const isEnglish = (global.I18N && typeof global.I18N.isEnglish === 'function' && global.I18N.isEnglish()) ||
                      (document.documentElement.getAttribute('data-lang') === 'more_english');
    if (isEnglish && notif.body_en && notif.body_en.trim()) return notif.body_en;
    return notif.body;
  }

  async function resolveMascot(sb, session) {
    // Prefer the profile mascot the user picked at onboarding; default to dog.
    try {
      const { data } = await sb
        .from('profiles')
        .select('mascot')
        .eq('id', session.user.id)
        .maybeSingle();
      return (data && data.mascot) || 'dog';
    } catch (_) {
      return 'dog';
    }
  }

  // On desktop, the left column (news/discussion) sits flush against the
  // viewport's left edge -- the popup's default fixed left:18px lands
  // right on top of it. Nudge the popup right of that column instead, so
  // it appears beside the content rather than over it. Mobile keeps its
  // own full-width bar (see media query above) so this only applies
  // above the mobile breakpoint.
  function clearSidebar(root) {
    if (window.innerWidth <= 768) return;
    const sidebar = document.querySelector('.col-left');
    if (!sidebar) return;
    const rect = sidebar.getBoundingClientRect();
    if (!rect.width) return;
    root.style.left = `${Math.round(rect.right + 18)}px`;
  }

  function renderPopup(mascot, text) {
    injectStyles();
    const old = document.getElementById('admin-notif-popup');
    if (old) old.remove();
    const root = document.createElement('div');
    root.id = 'admin-notif-popup';
    // TEMP: dog art isn't uploaded yet — use the cat PNG for dog mascots too
    // so the popup doesn't show a broken image. Restore the dog branch once
    // assets/mascot-dog-left.png exists.
    const src = 'assets/mascot-cat-left.png';
    const escaped = String(text).replace(/[&<>"']/g,
      c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    root.innerHTML = `
      <div class="anp-bubble">${escaped}<button class="anp-close" type="button" aria-label="Kapat">×</button></div>
      <div class="anp-mascot-row">
        <div class="anp-mascot"><img src="${src}" alt=""></div>
      </div>
    `;
    document.body.appendChild(root);
    clearSidebar(root);
    requestAnimationFrame(() => root.classList.add('anp-show'));

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      root.classList.remove('anp-show');
      setTimeout(() => { try { root.remove(); } catch (_) {} }, 280);
    };
    root.querySelector('.anp-close').addEventListener('click', e => { e.stopPropagation(); dismiss(); });
    root.querySelector('.anp-bubble').addEventListener('click', e => {
      if (e.target.closest('.anp-close')) return;
      dismiss();
    });
    root.querySelector('.anp-mascot').addEventListener('click', dismiss);
    return { dismiss };
  }

  // Public entrypoint. Call after the user's session is confirmed.
  //   IstAdminNotification.show({ sb });
  async function show({ sb }) {
    if (!sb) return null;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const notif = await fetchLatest(sb);
    if (!notif) return null;
    // Fast-path: this browser has already shown this notification.
    if (wasSeen(notif.id)) return null;
    // Cross-device gate: another browser may have shown it to this user.
    if (await wasSeenServer(sb, session.user.id, notif.id)) {
      markSeen(notif.id);
      return null;
    }
    const mascot = await resolveMascot(sb, session);
    const popup = renderPopup(mascot, pickBody(notif));
    markSeen(notif.id);
    markSeenServer(sb, session.user.id, notif.id);
    return popup;
  }

  global.IstAdminNotification = { show };
})(window);
