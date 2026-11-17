// ══════════════════════════════════════════════════════════════
// push.js — the app's half of the push notifications
// (db/push_notifications.sql, supabase/functions/send-push).
//
// Only inside the iOS app (Capacitor + @capacitor/push-notifications);
// on the web every call is a no-op. Three jobs:
//
//   IstPush.init({ sb, ask })  registers this device for the signed-in
//       member. `ask` is whether iOS may show its permission question
//       now: project.html passes false on the launch onboarding runs, so
//       a brand-new member is not asked before they have seen the app.
//       An answer already given is never asked again (iOS would not
//       show it anyway); a granted one re-registers every launch, which
//       is how a token that changed gets back to the database.
//   IstPush.unregister(sb)     before signing out: this phone stops
//       receiving the last member's pushes.
//   IstPush.onOpen(fn)         what a tapped notification opens. A tap
//       that launched the app arrives before the page is ready, so it is
//       held until fn is set.
// ══════════════════════════════════════════════════════════════
(function (global) {
  const TOKEN_KEY = 'ist_push_token';
  let wired = false;
  let opener = null;
  let heldTap = null;
  let sbRef = null;

  function plugin() {
    const C = global.Capacitor;
    if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null;
    return (C.Plugins && C.Plugins.PushNotifications) || null;
  }

  function store(k, v) {
    try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (_) {}
  }
  function read(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }

  function deliverTap(data) {
    if (opener) { try { opener(data || {}); } catch (e) { console.error('[push open]', e); } }
    else heldTap = data || {};
  }

  function wire(P) {
    if (wired) return;
    wired = true;
    P.addListener('registration', async ({ value }) => {
      if (!value || !sbRef) return;
      store(TOKEN_KEY, value);
      const { error } = await sbRef.rpc('push_register', { p_token: value, p_platform: 'ios' });
      if (error) console.error('[push register]', error.message);
    });
    P.addListener('registrationError', (e) => console.error('[push registration]', e && e.error));
    P.addListener('pushNotificationActionPerformed', (action) => {
      const n = action && action.notification;
      deliverTap((n && n.data) || {});
    });
  }

  async function init({ sb, ask }) {
    const P = plugin();
    if (!P || !sb) return;
    sbRef = sb;
    wire(P);
    try {
      let st = await P.checkPermissions();
      if (st.receive === 'prompt' || st.receive === 'prompt-with-rationale') {
        if (!ask) return;
        st = await P.requestPermissions();
      }
      if (st.receive === 'granted') await P.register();
    } catch (e) {
      console.error('[push init]', e);
    }
  }

  async function unregister(sb) {
    const token = read(TOKEN_KEY);
    if (!token || !plugin() || !sb) return;
    try { await sb.rpc('push_unregister', { p_token: token }); } catch (_) {}
    store(TOKEN_KEY, null);
  }

  function onOpen(fn) {
    opener = fn;
    if (heldTap) { const d = heldTap; heldTap = null; deliverTap(d); }
  }

  // Listen for taps from the first moment, before init: a cold-start tap
  // is retained by the plugin until somebody listens.
  const P0 = plugin();
  if (P0) wire(P0);

  global.IstPush = { init, unregister, onOpen };
})(window);
