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
    'home.filter.all':     { default: 'Tümü',                more_english: 'All' },
    'home.events.thisweek':{ default: 'Bu hafta',            more_english: 'This week' },
    'home.events.rsvp.join': { default: 'Katılıyorum',       more_english: 'RSVP' },
    'home.events.rsvp.going':{ default: 'Katılıyorsun ✓',    more_english: 'Going ✓' },
    'home.events.rsvp.count':{ default: 'kişi katılıyor',    more_english: 'attending' },

    // profile / settings card
    'profile.edit':        { default: 'Düzenle',             more_english: 'Edit' },
    'profile.customize':   { default: 'Kişiselleştir',       more_english: 'Customize' },
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
    'profile.colortheme':  { default: 'Renk',                more_english: 'Color' },
    'profile.years':       { default: 'yıl',                 more_english: 'yr' },
    'profile.days':        { default: 'gün',                 more_english: 'd' },
    'profile.hours':       { default: 'saat',                more_english: 'h' },
    'profile.minutes':     { default: 'dakika',              more_english: 'min' },
    'profile.kefil':       { default: 'KEFİL',               more_english: 'SPONSOR' },
    'profile.account':     { default: 'Hesap',               more_english: 'Account' },
    'profile.lastseen':    { default: 'Son Görülme',         more_english: 'Last Seen' },
    'profile.referralcode':{ default: 'Kefalet Kodu',        more_english: 'Sponsor Code' },
    'profile.sponsoredcount':{ default: 'Kefil Olduğu',      more_english: 'Vouched For' },
    'profile.sozculcount': { default: 'Sözcül Olduğu',       more_english: 'Sözcül Picks' },
    'profile.times':       { default: 'kez',                 more_english: 'times' },
    'profile.copy':        { default: 'Kopyala',             more_english: 'Copy' },
    'profile.copied':      { default: 'Kopyalandı',          more_english: 'Copied' },
    'profile.gamescores':  { default: 'Oyun Skorları',       more_english: 'Game Scores' },
    'profile.people':      { default: 'kişi',                more_english: 'people' },
    'profile.unnamed':     { default: 'İsimsiz Üye',         more_english: 'Unnamed Member' },
    'profile.toggle':      { default: 'Profil',              more_english: 'Profile' },
    'profile.tab.profil':  { default: 'Profil',              more_english: 'Profile' },
    'profile.tab.ayarlar': { default: 'Ayarlar',             more_english: 'Settings' },
    'profile.tab.rozetler':{ default: 'Rozetler',            more_english: 'Badges' },
    'profile.rozetler.hint':{ default: 'Doğum ilçenize ait rozetleri seçerek kapağınıza yerleştirin.', more_english: 'Pick badges tied to your birth district to pin them on your cover.' },
    'profile.email':        { default: 'E-posta',             more_english: 'Email' },
    'profile.thisweek':     { default: 'Bu Hafta',             more_english: 'This Week' },
    'profile.profileinfo':  { default: 'Profil Bilgileri',     more_english: 'Profile Info' },
    // The hane honeycomb on anahane: the six slots around your own frame,
    // filled by handing someone your weekly code (see hiveHTML in
    // profile-card.js and db/hive_slots.sql).
    'profile.hive.empty':   { default: 'Boş yer',               more_english: 'Empty slot' },
    'profile.hive.addtitle':{ default: 'Bu yere birini koy',    more_english: 'Put someone here' },
    'profile.hive.addhint': { default: 'Bu haftaki hane kodunu gir. Bir hafta boyunca burada durur.',
                              more_english: 'Enter their code for this week. They stay here for a week.' },
    'profile.hive.add':     { default: 'Ekle',                  more_english: 'Add' },
    'profile.hive.back':    { default: '← Geri',                more_english: '← Back' },
    'profile.hive.remove':  { default: 'Çıkar',                 more_english: 'Remove' },
    'profile.hive.dayleft': { default: 'gün kaldı',             more_english: 'day left' },
    'profile.hive.daysleft':{ default: 'gün kaldı',             more_english: 'days left' },
    'profile.hive.codelabel':{ default: 'BU HAFTAKİ HANE KODUN', more_english: 'YOUR CODE THIS WEEK' },
    'profile.hive.codehint':{ default: 'pazartesi yenilenir',   more_english: 'renews Monday' },
    'profile.hive.err.short':          { default: 'Kod 6 karakter.',            more_english: 'The code is 6 characters.' },
    'profile.hive.err.invalid_code':   { default: 'Bu hafta böyle bir kod yok.', more_english: 'No such code this week.' },
    'profile.hive.err.self':           { default: 'Bu senin kendi kodun.',       more_english: "That's your own code." },
    'profile.hive.err.slot_taken':     { default: 'Bu yer dolu.',                more_english: 'That slot is taken.' },
    'profile.hive.err.already_in_hive':{ default: 'Bu üye zaten hanende.',       more_english: 'They are already in your hane.' },
    'profile.hive.err.failed':         { default: 'Olmadı, tekrar dene.',        more_english: "That didn't work, try again." },

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
      default: 'Gizli Türkçe sözcüğü <strong>altı denemede</strong> bulun. Sözcük, hecelerine ayrılmış petek düzeninde gösterilir — her hece bir alt basamakta başlar. Doğru yerde bulduğun bir harf kutusuna kilitlenir ve sonraki denemelerde öyle kalır; sen sadece kalan harfleri girersin.',
      more_english: 'Guess the hidden Turkish word in <strong>six tries</strong>. The word is laid out by its syllables in a honeycomb staircase — each syllable starts one step lower. A letter you land in the right spot locks into its box and stays there for your next tries — you only type the remaining letters.',
    },
    'sozcel.help.green':   { default: 'Doğru harf, doğru yer',     more_english: 'Right letter, right spot' },
    'sozcel.help.yellow':  { default: 'Doğru harf, yanlış yer',    more_english: 'Right letter, wrong spot' },
    'sozcel.help.gray':    { default: 'Harf sözcükte yok',         more_english: 'Letter not in the word' },
    'sozcel.help.colors':  { default: 'Her tahminin ardından kutular renklenir:', more_english: 'After each guess, the tiles change color:' },
    'sozcel.help.green2':  { default: 'Harf doğru ve doğru yerde.',     more_english: 'Letter is correct and in the right spot.' },
    'sozcel.help.yellow2': { default: 'Harf sözcükte var ama yanlış yerde.', more_english: 'Letter is in the word but the wrong spot.' },
    'sozcel.help.gray2':   { default: 'Harf sözcükte yok.',              more_english: 'Letter is not in the word.' },
    'sozcel.help.daily':   { default: 'Her gün yeni bir sözcük gelir. Türkçe <strong>İ/I</strong> ayrımına dikkat edin.', more_english: 'A new word arrives every day. Mind the Turkish <strong>İ/I</strong> distinction.' },

    // kahvehane — discussion feed
    'kahvehane.allistanbul': { default: 'Tüm İstanbul',      more_english: 'All Istanbul' },

    // kahvehane — coffee price index (Kahve Endeksi), read-only: the
    // index is curated from the admin portal, not reported by users.
    // The status words below label a live board: a venue is on it only
    // while it is open, and trades at its discounted price only while
    // the discount window runs (see coffee-index.js).
    'kahve.index':   { default: 'Kahve Endeksi',            more_english: 'Coffee Index' },
    'kahve.empty':   { default: 'Henüz fiyat yok.',         more_english: 'No prices yet.' },
    'kahve.loading': { default: 'Yükleniyor...',            more_english: 'Loading...' },
    'kahve.failed':  { default: 'Endeks yüklenemedi.',      more_english: 'Could not load the index.' },
    'kahve.open':    { default: 'Açık',                     more_english: 'Open' },
    'kahve.closed':  { default: 'Kapalı',                   more_english: 'Closed' },
    'kahve.discount':{ default: 'İndirim',                  more_english: 'Discount' },
    // Prefixed to the minutes left before closing: "Son 45 dk".
    'kahve.lastcall':{ default: 'Son',                      more_english: 'Last' },
    'kahve.tomorrow':{ default: 'Yarın',                    more_english: 'Tomorrow' },
    // Venue detail panel: opened by clicking a row on the board, carries
    // the week's hours and what members say about the coffee there.
    'kahve.hours':        { default: 'Çalışma Saatleri',    more_english: 'Opening Hours' },
    'kahve.hoursunknown': { default: 'Saatler kayıtlı değil', more_english: 'Hours not recorded' },
    'kahve.comments':     { default: 'Kahve Hakkında',      more_english: 'About the Coffee' },
    'kahve.nocomments':   { default: 'Henüz yorum yok. İlk yorumu sen yaz.', more_english: 'No comments yet. Be the first.' },
    'kahve.commentph':    { default: 'Buranın kahvesi nasıl?', more_english: 'How is the coffee here?' },
    'kahve.send':         { default: 'Gönder',              more_english: 'Send' },
    'kahve.commentfailed':{ default: 'Yorum gönderilemedi.', more_english: 'Could not post the comment.' },
    'kahve.commentsfailed':{ default: 'Yorumlar yüklenemedi.', more_english: 'Could not load the comments.' },

    // anahane — breaking news detail sheet
    'news.sources':        { default: 'Kaynaklar',           more_english: 'Sources' },

    // games — shared right column (Günün Oyunları / scoreboard / neighborhood stats)
    'games.today':            { default: 'Günün Oyunları',        more_english: "Today's Games" },
    'games.weeklyscoreboard': { default: 'Haftanın Skor Tahtası', more_english: 'Weekly Scoreboard' },
    'games.todayneighborhoods': { default: 'Günün Mahalleleri',   more_english: "Today's Neighborhoods" },
    'games.congrats': { default: 'Tebrikler!', more_english: 'Congratulations!' },
    'games.share':     { default: 'Paylaş',     more_english: 'Share' },
    'tumcel.congrats':  { default: 'Tebrikler! Hepsini buldun!', more_english: 'Congratulations! You found them all!' },
    'bulmaca.congrats': { default: 'Tebrikler! Tamamladınız!',   more_english: 'Congratulations! You completed it!' },
  };

  let currentLang = readCached();
  const listeners = [];
  function onChange(cb) { if (typeof cb === 'function') listeners.push(cb); }
  function offChange(cb) {
    const i = listeners.indexOf(cb);
    if (i !== -1) listeners.splice(i, 1);
  }
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

  const TR_MONTHS = ['OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN',
    'TEMMUZ','AĞUSTOS','EYLÜL','EKİM','KASIM','ARALIK'];
  const EN_MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
    'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

  // Turkish ablative suffix ('DAN/'DEN/'TAN/'TEN) for a year, matching how the
  // year is actually pronounced (e.g. 2026 -> "altı" -> 'DAN, 2023 -> "üç" -> 'TEN).
  function turkishYearSuffix(year) {
    const ones = ['bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
    const tens = ['on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
    const n = ((year % 100) + 100) % 100;
    const onesDigit = n % 10;
    const tensDigit = Math.floor(n / 10);
    const lastWord = n === 0 ? 'bin' : (onesDigit === 0 ? tens[tensDigit - 1] : ones[onesDigit - 1]);
    const frontVowels = 'eiöü';
    const backVowels = 'aıou';
    const unvoiced = 'çkptsşhf';
    let lastVowel = null;
    for (let i = lastWord.length - 1; i >= 0; i--) {
      if (frontVowels.includes(lastWord[i]) || backVowels.includes(lastWord[i])) { lastVowel = lastWord[i]; break; }
    }
    const lastChar = lastWord[lastWord.length - 1];
    const isVowelEnd = frontVowels.includes(lastChar) || backVowels.includes(lastChar);
    const useT = !isVowelEnd && unvoiced.includes(lastChar);
    return (useT ? 'T' : 'D') + (frontVowels.includes(lastVowel) ? 'EN' : 'AN');
  }

  // "MART 2026'DAN BERİ ÜYE" / "MEMBER SINCE MARCH 2026" — used on public profile cards.
  function formatMemberSince(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const monthIdx = d.getMonth();
    if (isEnglish()) return `MEMBER SINCE ${EN_MONTHS[monthIdx]} ${year}`;
    return `${TR_MONTHS[monthIdx]} ${year}'${turkishYearSuffix(year)} BERİ ÜYE`;
  }

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

  // "KADIKÖY EN İYİLERİ" / "KADIKÖY'S BEST" — neighborhood-filtered scoreboard title.
  function formatNeighborhoodBest(name) {
    return isEnglish() ? `${name}'S BEST` : `${name} EN İYİLERİ`;
  }

  // Sözcel result-popup subtitle: "Kelimeyi 3. tahminde buldunuz. +8 puan"
  function formatFoundInGuesses(guessNum, points) {
    return isEnglish()
      ? `You found the word on guess ${guessNum}. +${points} points`
      : `Kelimeyi ${guessNum}. tahminde buldunuz. +${points} puan`;
  }
  // Same, with the first-solver bonus line. tier is 'istanbul' or 'neighborhood'.
  function formatFoundInGuessesFirst(guessNum, basePts, bonusPts, totalPts, tier) {
    const label = tier === 'neighborhood'
      ? (isEnglish() ? 'district first-solver' : 'ilçe ilk çözücü')
      : (isEnglish() ? 'first-solver' : 'ilk çözücü');
    return isEnglish()
      ? `You found the word on guess ${guessNum}.<br><strong>+${basePts} points &nbsp;+&nbsp; ${bonusPts} ${label} bonus = ${totalPts} points</strong>`
      : `Kelimeyi ${guessNum}. tahminde buldunuz.<br><strong>+${basePts} puan &nbsp;+&nbsp; ${bonusPts} ${label} bonusu = ${totalPts} puan</strong>`;
  }
  // Loss subtitle: "Bugünkü kelime: KALEM — +2 puan"
  function formatTodaysWordPoints(word, points) {
    return isEnglish() ? `Today's word: ${word} — +${points} points` : `Bugünkü kelime: ${word} — +${points} puan`;
  }
  // Result-popup title: won / first-solver ('istanbul' or 'neighborhood' tier) / lost.
  function sozcelResultTitle(tier, won) {
    if (tier === 'istanbul') return isEnglish() ? "Istanbul's First Solver!" : "İstanbul'un İlk Çözücüsü!";
    if (tier === 'neighborhood') return isEnglish() ? "Your District's First Solver!" : 'İlçenin İlk Çözücüsü!';
    if (won) return t('games.congrats');
    return isEnglish() ? 'Better Luck Tomorrow' : 'Bugünlük Bu Kadar';
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
    t, setLang, applyToDOM, isEnglish, onChange, offChange,
    formatDate, formatTime, formatWeekday, formatCountdown, formatMinutes, formatMemberSince,
    formatNeighborhoodBest,
    formatFoundInGuesses, formatFoundInGuessesFirst, formatTodaysWordPoints, sozcelResultTitle,
    syncFromSupabase,
    get lang() { return currentLang; },
  };
})(window);
