// ══════════════════════════════════════════════════════════════
// Admin one-shot notification popup.
//
// Fetches the most recent active row from public.admin_notifications
// and shows it as a mascot bubble in the bottom-right, dismissed with
// a tap. localStorage tracks which notification id the current user
// has already seen so each one shows only once per browser.
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
  const SEEN_KEY_PREFIX = 'admin_notif_seen_';
  let stylesInjected = false;

  function injectStyles() {
    if (stylesInjected) return;
    if (document.getElementById('sozcul-mascot-styles') || document.getElementById('admin-notif-styles')) {
      stylesInjected = true;
      return;
    }
    stylesInjected = true;
    const css = `
      #admin-notif-popup {
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
      #admin-notif-popup.anp-show { opacity: 1; transform: translateY(0); pointer-events: auto; }
      #admin-notif-popup .anp-bubble {
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
        background: var(--paper, #eddbd0);
        border: 1px solid var(--rule, #b8a08a);
        border-radius: 50%;
        padding: 4px;
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
          bottom: calc(56px + env(safe-area-inset-bottom) + 12px);
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
      .select('id, body, created_at')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
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

  function renderPopup(mascot, text) {
    injectStyles();
    const old = document.getElementById('admin-notif-popup');
    if (old) old.remove();
    const root = document.createElement('div');
    root.id = 'admin-notif-popup';
    const src = mascot === 'cat' ? 'assets/mascot-cat.svg' : 'assets/mascot-dog.svg';
    const escaped = String(text).replace(/[&<>"']/g,
      c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    root.innerHTML = `
      <div class="anp-bubble">${escaped}<button class="anp-close" type="button" aria-label="Kapat">×</button></div>
      <div class="anp-mascot-row">
        <div class="anp-mascot"><img src="${src}" alt=""></div>
      </div>
    `;
    document.body.appendChild(root);
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
    if (wasSeen(notif.id)) return null;
    const mascot = await resolveMascot(sb, session);
    const popup = renderPopup(mascot, notif.body);
    markSeen(notif.id);
    return popup;
  }

  global.IstAdminNotification = { show };
})(window);
