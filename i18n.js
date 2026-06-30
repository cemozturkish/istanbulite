// Shared language helper for Istanbulite.
// Reads `profiles.language_pref` (cached in localStorage for instant first paint),
// swaps marked DOM strings, and exposes date/time/countdown formatters.
//
// Usage on a page:
//   <script src="i18n.js"></script>
//   ...mark static strings: <span data-i18n="profile.edit">Düzenle</span>
//   ...in template literals: ${I18N.t('profile.edit')}
//   ...after login: I18N.syncFromSupabase(sb, user.id)
//
// Only `more_english` differs from default; `more_turkish` is identical to default for now.

(function (global) {
  const STORAGE_KEY = 'istanbulite_lang_pref';

  const STRINGS = {
    // anahane (home) — breaking news + events sidebars
    'home.breaking':       { default: 'Son Dakika',          more_english: 'Breaking News' },
    'home.events':         { default: 'Etkinlikler',         more_english: 'Events' },
    'home.events.empty':   { default: 'Yaklaşan etkinlik yok.', more_english: 'No upcoming events.' },
    'home.breaking.empty': { default: 'Aktif haber yok.',    more_english: 'No active news.' },
    'home.filter.all':     { default: 'Tümü',                more_english: 'All' },
    'home.events.thisweek':{ default: 'Bu hafta',            more_english: 'This week' },

    // profile / settings card
    'profile.edit':        { default: 'Düzenle',             more_english: 'Edit' },
    'profile.save':        { default: 'Kaydet',              more_english: 'Save' },
    'profile.saving':      { default: 'Kaydediliyor...',     more_english: 'Saving...' },
    'profile.cancel':      { default: 'İptal',               more_english: 'Cancel' },
    'profile.signout':     { default: 'Çıkış Yap',           more_english: 'Sign Out' },
    'profile.firstname':   { default: 'Ad',                  more_english: 'First Name' },
    'profile.lastname':    { default: 'Soyad',               more_english: 'Last Name' },
    'profile.district':    { default: 'Yaşadığı İlçe',       more_english: 'District' },
    'profile.birthplace':  { default: 'Doğum Yeri',          more_english: 'Birthplace' },
    'profile.membership':  { default: 'Üyelik',              more_english: 'Member Since' },
    'profile.chooseavatar':{ default: 'Avatar Seç',          more_english: 'Choose Avatar' },
    'profile.langpref':    { default: 'Dil Tercihi',         more_english: 'Language' },
    'profile.appearance':  { default: 'Görünüm',             more_english: 'Appearance' },
    'profile.years':       { default: 'yıl',                 more_english: 'yr' },
    'profile.days':        { default: 'gün',                 more_english: 'd' },
    'profile.hours':       { default: 'saat',                more_english: 'h' },
    'profile.minutes':     { default: 'dakika',              more_english: 'min' },
    'profile.kefil':       { default: 'KEFİL',               more_english: 'SPONSOR' },
    'profile.account':     { default: 'Hesap',               more_english: 'Account' },
    'profile.lastseen':    { default: 'Son Görülme',         more_english: 'Last Seen' },
    'profile.referralcode':{ default: 'Kefalet Kodu',        more_english: 'Sponsor Code' },
    'profile.sponsoredcount':{ default: 'Kefil Olduğu',      more_english: 'Sponsored' },
    'profile.sozculcount': { default: 'Sözcül Olduğu',       more_english: 'Sözcül Picks' },
    'profile.times':       { default: 'kez',                 more_english: 'times' },
    'profile.copy':        { default: 'Kopyala',             more_english: 'Copy' },
    'profile.copied':      { default: 'Kopyalandı',          more_english: 'Copied' },
    'profile.gamescores':  { default: 'Oyun Skorları',       more_english: 'Game Scores' },
    'profile.people':      { default: 'kişi',                more_english: 'people' },
    'profile.unnamed':     { default: 'İsimsiz Üye',         more_english: 'Unnamed Member' },

    // login / signup (index.html)
    'auth.email':          { default: 'E-posta',             more_english: 'Email' },
    'auth.password':       { default: 'Şifre',               more_english: 'Password' },
    'auth.signin':         { default: 'Giriş Yap',           more_english: 'Sign In' },
    'auth.signup':         { default: 'Kayıt Ol',            more_english: 'Sign Up' },
    'auth.kefilcode':      { default: 'Kefil Kodu',          more_english: 'Sponsor Code' },
    'auth.continue':       { default: 'Devam',               more_english: 'Continue' },
    'auth.back':           { default: 'Geri',                more_english: 'Back' },
    'auth.firstname':      { default: 'Ad',                  more_english: 'First Name' },
    'auth.lastname':       { default: 'Soyad',               more_english: 'Last Name' },
    'auth.phone':          { default: 'Telefon',             more_english: 'Phone' },
    'auth.livedistrict':   { default: 'Yaşadığın Mahalle',   more_english: 'Where You Live' },
    'auth.birthdistrict':  { default: 'Doğduğun Mahalle',    more_english: 'Where You Were Born' },
    'auth.kefilnote':      { default: 'Kayıt için kefil kodu', more_english: 'Sponsor code required to sign up' },

    // games (shared bits)
    'games.howto':         { default: 'Nasıl Oynanır',       more_english: 'How to Play' },
    'games.streak':        { default: 'Seri',                more_english: 'Streak' },
    'games.played':        { default: 'Oynanan',             more_english: 'Played' },
    'games.longest':       { default: 'En Uzun',              more_english: 'Longest' },
    'games.winrate':       { default: 'Kazanma',              more_english: 'Win Rate' },
    'games.personal':      { default: 'Kişisel İstatistikler',more_english: 'Personal Stats' },
    'games.distribution':  { default: 'Tahmin Dağılımı',      more_english: 'Guess Distribution' },

    // sozcel "Nasıl Oynanır" body
    'sozcel.help.intro':   {
      default: 'Gizli beş harfli Türkçe sözcüğü <strong>altı denemede</strong> bulun.',
      more_english: 'Guess the hidden five-letter Turkish word in <strong>six tries</strong>.',
    },
    'sozcel.help.green':   { default: 'Doğru harf, doğru yer',     more_english: 'Right letter, right spot' },
    'sozcel.help.yellow':  { default: 'Doğru harf, yanlış yer',    more_english: 'Right letter, wrong spot' },
    'sozcel.help.gray':    { default: 'Harf sözcükte yok',         more_english: 'Letter not in the word' },
    'sozcel.help.colors':  { default: 'Her tahminin ardından kutular renklenir:', more_english: 'After each guess, the tiles change color:' },
    'sozcel.help.green2':  { default: 'Harf doğru ve doğru yerde.',     more_english: 'Letter is correct and in the right spot.' },
    'sozcel.help.yellow2': { default: 'Harf sözcükte var ama yanlış yerde.', more_english: 'Letter is in the word but the wrong spot.' },
    'sozcel.help.gray2':   { default: 'Harf sözcükte yok.',              more_english: 'Letter is not in the word.' },
    'sozcel.help.daily':   { default: 'Her gün yeni bir sözcük gelir. Türkçe <strong>İ/I</strong> ayrımına dikkat edin.', more_english: 'A new word arrives every day. Mind the Turkish <strong>İ/I</strong> distinction.' },
  };

  let currentLang = readCached();
  const listeners = [];
  function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
  function emit() { listeners.forEach(cb => { try { cb(currentLang); } catch (e) { console.error(e); } }); }

  function readCached() {
    try { return localStorage.getItem(STORAGE_KEY) || 'default'; }
    catch (e) { return 'default'; }
  }
  function writeCached(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) { /* ignore */ }
  }

  function t(key) {
    const entry = STRINGS[key];
    if (!entry) return key;
    return entry[currentLang] || entry.default;
  }

  function applyToDOM(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const val = t(key);
      // Allow HTML for entries that contain markup (e.g. <strong>)
      if (val.indexOf('<') !== -1) el.innerHTML = val;
      else el.textContent = val;
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
    });
  }

  function setLang(v) {
    if (!v) v = 'default';
    const changed = currentLang !== v;
    currentLang = v;
    writeCached(v);
    document.documentElement.setAttribute('data-lang', v);
    if (changed) { applyToDOM(); emit(); }
    return changed;
  }

  function isEnglish() { return currentLang === 'more_english'; }

  // Date / time / countdown helpers
  function formatDate(date, opts) {
    const locale = isEnglish() ? 'en-US' : 'tr-TR';
    return new Date(date).toLocaleDateString(locale, opts);
  }
  function formatTime(date, opts) {
    const locale = isEnglish() ? 'en-US' : 'tr-TR';
    const merged = Object.assign({ hour: '2-digit', minute: '2-digit' }, opts || {});
    if (merged.hour12 == null) merged.hour12 = isEnglish();
    return new Date(date).toLocaleTimeString(locale, merged);
  }
  function formatWeekday(date, opts) {
    const locale = isEnglish() ? 'en-US' : 'tr-TR';
    return new Date(date).toLocaleDateString(locale, Object.assign({ weekday: 'long' }, opts || {}));
  }
  // "Yeni oyun 3 saat 12 dakika sonra"  /  "New puzzle in 3h 12m"
  function formatCountdown(hours, minutes, opts) {
    const o = opts || {};
    if (isEnglish()) {
      const prefix = o.prefixEn || 'New puzzle in';
      const h = hours > 0 ? `${hours}h ` : '';
      return `${prefix} ${h}${minutes}m`;
    }
    const prefix = o.prefixTr || 'Yeni sözcük';
    const h = hours > 0 ? `${hours} saat ` : '';
    return `${prefix} ${h}${minutes} dakika sonra`;
  }
  // Plain minutes countdown ("5 dakika" / "5 min")
  function formatMinutes(mins) {
    return isEnglish() ? `${mins} min` : `${mins} dakika`;
  }

  async function syncFromSupabase(sb, userId) {
    if (!sb || !userId) return;
    try {
      const { data } = await sb.from('profiles')
        .select('language_pref').eq('id', userId).maybeSingle();
      const v = (data && data.language_pref) || 'default';
      setLang(v);
    } catch (e) { /* keep cached value */ }
  }

  // Apply cached lang ASAP (before DOMContentLoaded if possible) to avoid flicker.
  document.documentElement.setAttribute('data-lang', currentLang);
  if (document.readyState !== 'loading') applyToDOM();
  else document.addEventListener('DOMContentLoaded', () => applyToDOM());

  global.I18N = {
    t, setLang, applyToDOM, isEnglish, onChange,
    formatDate, formatTime, formatWeekday, formatCountdown, formatMinutes,
    syncFromSupabase,
    get lang() { return currentLang; },
  };
})(window);
