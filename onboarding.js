// Onboarding flow for brand-new accounts.
// Runs on first login: locks the rest of the page behind a full-screen overlay,
// walks the user through 8 beats (welcome → language → palette+mascot → tour →
// kefil code → profile prompt), then writes onboarded_at, language_pref,
// palette_pref, and mascot to profiles.
//
// Mount from any page after auth:
//   IstOnboarding.maybeRun({ sb, user, kefilName })
// It checks profiles.onboarded_at — if null, runs the flow; otherwise no-op.

(function (global) {
  const ROOT_ID = 'ist-onb-root';

  // ── Copy ──
  // English is fixed for the first 2 screens (welcome + language pick).
  // After language is chosen, remaining beats branch into TR or EN, then
  // again into cat (mono/edgy) or dog (earth/warm) voice.
  const COPY = {
    welcome: {
      lead: 'Welcome to ISTANBULITE!',
      lines: [
        '<em class="kefil-name">{KEFIL}</em> told us great things about you! We are glad to see you become a part of the community.',
        'But remember — they vouched for you. If you were to violate the code of conduct, <em class="kefil-name">{KEFIL}</em> will be responsible.',
      ],
      tapHint: 'tap to continue',
      finalHint: 'tap to get started',
    },
    languageScreen: {
      body: 'ISTANBULITE is not a social media app; it is a network. By default, it is in Turglish. Before we get started, we would like to ask your preference. You can choose to have most things in Turkish, or most things in English — but never neither.',
      choices: [
        { value: 'default',      label: 'TÜRKÇE AĞIRLIKLI', sub: 'Turkish-heavy' },
        { value: 'more_english', label: 'ENGLISH-HEAVY',    sub: 'İngilizce ağırlıklı' },
      ],
    },
    paletteScreen: {
      tr: {
        body: 'Harika! Öyleyse Türkçe devam edelim. Merak ettiğimiz bir şey daha var: uygulaman için hangi renk paletini tercih edersin? Eğer siyah ve beyazı tercih edersen, konuşmanın geri kalanını bir kedi devralacak. Kahverengi ve beji tercih ettiğin takdirde ise bir köpek devralacak ve senin maskotun o olacak. Kararsızsan dert etme — bu ayarları istediğin zaman değiştirebilirsin.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'SİYAH & BEYAZ', sub: 'kedi' },
          { value: 'earth', mascot: 'dog', label: 'TOPRAK TONLARI', sub: 'köpek' },
        ],
      },
      en: {
        body: 'Great! Another thing we were wondering: what would you prefer the color palette of your application to be? If you go with black and white, a cat will take over from here. If you prefer earthy tones, then a dog becomes your mascot instead. You can change these settings whenever you want.',
        choices: [
          { value: 'mono',  mascot: 'cat', label: 'BLACK & WHITE', sub: 'cat' },
          { value: 'earth', mascot: 'dog', label: 'EARTHY TONES',  sub: 'dog' },
        ],
      },
    },
    // mascot-led beats: [lang][mascot] → ordered list of step bodies.
    tour: {
      tr: {
        cat: [
          'Hâlâ buradasın demek. Peki, sana etrafı göstereyim. Ayak uydurmaya çalış.',
          'Burası anasayfa. Mahallenden haberler, bu haftanın etkinlikleri. Acil bir şey yok. Yenilemen gereken bir şey yok.',
          'Harita. Bir mahalleye dokun, ne varsa oku. Her yere bakabilirsin. Sadece yaşadığın yerde konuşabilirsin.',
          'Kütüphane uzun yazıların olduğu yer. Kahvehane ise kahvehane — sohbet ve her gün değişen üç oyun: Sözcel, Tümcel, Bulmaca. Serini kaybetme.',
        ],
        dog: [
          'SELAAM!! Vay, merhaba! Burada olmana çok sevindim! Hadi, sana her şeyi göstereyim!!',
          'Burası anasayfa! Mahallenin haberleri, bu hafta neler oluyor — hepsi tek yerde! Güzel değil mi?',
          'Bak, harita! Herhangi bir mahalleye dokun, içeri bak! Her yeri okuyabilirsin ama sadece kendi mahallende konuşursun — böylesi daha gerçek!',
          'Kütüphane\'de tüm yazılar var, Kahvehane ise kahvehane — sohbetler VE her gün değişen üç oyun! Sözcel, Tümcel, Bulmaca — çok eğlenceli!',
        ],
      },
      en: {
        cat: [
          "Oh. You're still here. Fine — I'll show you around. Try to keep up.",
          'This is home. News from your district, events this week. Nothing urgent. Nothing you need to refresh.',
          'The map. Tap a district, read what\'s there. You can look anywhere. You can only speak where you live.',
          "Kütüphane is where the longer writing lives. Kahvehane is the coffeehouse — talk, and three games that change every day: Sözcel, Tümcel, Bulmaca. Don't lose your streak.",
        ],
        dog: [
          "HI!! Oh wow, hi! I'm so happy you're here! Come on, let me show you everything!!",
          "This is home! Your district's news, what's happening this week — all in one place! Isn't that nice?",
          'Look, a map! Tap any district to peek inside! You can read everywhere but you only get to talk in your own — keeps things real!',
          'Kütüphane has all the articles, and Kahvehane is the coffeehouse — chats AND three games that change every single day! Sözcel, Tümcel, Bulmaca — so fun!',
        ],
      },
    },
    kefilShare: {
      tr: {
        cat: 'Bu senin kodun. Gerçekten kefil olabileceğin birine ver. Yanlış davranırsa, sorumluluk sende. İyi seç.',
        dog: 'Ve bu da SENİN kodun! Güvendiğin birine ver — sen onun kefili olacaksın, tıpkı <em class="kefil-name">{KEFIL}</em>\'in senin kefilin olduğu gibi! Harika birini seç!',
      },
      en: {
        cat: "This is your code. Give it to someone you'd actually vouch for. If they misbehave, it's on you. Choose wisely.",
        dog: "And this is YOUR code! Share it with someone you trust — you'll be their sponsor, just like <em class=\"kefil-name\">{KEFIL}</em> is yours! Choose someone wonderful!",
      },
    },
    profilePrompt: {
      tr: {
        cat: 'Son bir şey. Profilini doldur ki diğerlerimiz kimi içeri aldığımızı bilelim. Sonra dışarı çık.',
        dog: 'Son bir şey! Profilini doldur ki herkes selam verebilsin! Sonra — dışarı çık, dünya seni bekliyor!',
      },
      en: {
        cat: 'Last thing. Fill out your profile so the rest of us know who we let in. Then go outside.',
        dog: 'One last thing! Fill out your profile so everyone can say hi! Then — go outside, the world is waiting!',
      },
    },
    finishLabel: { tr: 'BİTİR', en: 'FINISH' },
    tapToContinue: { tr: 'devam etmek için dokun', en: 'tap to continue' },
    copy: { tr: 'KOPYALA', en: 'COPY' },
    copied: { tr: 'KOPYALANDI', en: 'COPIED' },
  };

  // ── State ──
  let sb, user, kefilName, referralCode;
  let lang = 'en';     // 'en' or 'tr' for mascot-led beats
  let palette = null;  // 'mono' | 'earth'
  let mascot = null;   // 'cat' | 'dog'
  let root;            // DOM root

  // ── Helpers ──
  function fillKefil(s) {
    return (s || '').replace(/\{KEFIL\}/g, escapeHTML(kefilName || ''));
  }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }
  function mascotImgHTML() {
    const src = mascot === 'cat' ? 'assets/mascot-cat.svg' : 'assets/mascot-dog.svg';
    return `<div class="ist-onb-mascot"><img src="${src}" alt=""></div>`;
  }
  function clearStage() {
    const stage = document.getElementById('ist-onb-stage');
    stage.innerHTML = '';
  }
  function addMsg(html, opts) {
    const stage = document.getElementById('ist-onb-stage');
    const el = document.createElement('div');
    el.className = 'ist-onb-msg' + (opts?.lead ? ' lead' : '');
    el.innerHTML = html;
    stage.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    return el;
  }
  function addHint(text, onClick) {
    const stage = document.getElementById('ist-onb-stage');
    const old = stage.querySelector('.ist-onb-hint');
    if (old) old.remove();
    const hint = document.createElement('div');
    hint.className = 'ist-onb-hint';
    hint.textContent = text;
    stage.appendChild(hint);
    setTimeout(() => hint.classList.add('show'), 250);

    // Whole overlay is a tap target.
    const handler = (e) => {
      // Ignore clicks on actual interactive children (choice buttons, etc.).
      if (e.target.closest('.ist-onb-choice, .ist-onb-btn, .ist-onb-codebox button')) return;
      root.removeEventListener('click', handler);
      onClick();
    };
    root.addEventListener('click', handler);
  }
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Steps ──
  function show() {
    root.classList.add('show');
    document.body.classList.add('ist-onb-locked');
  }
  function hide() {
    root.classList.remove('show');
    document.body.classList.remove('ist-onb-locked');
  }

  async function stepWelcome() {
    clearStage();
    const w = COPY.welcome;
    addMsg(w.lead, { lead: true });
    let idx = 0;
    const lines = w.lines.map(fillKefil);
    addHint(w.tapHint, advance);
    function advance() {
      addMsg(lines[idx]);
      idx++;
      if (idx < lines.length) {
        addHint(w.tapHint, advance);
      } else {
        addHint(w.finalHint, stepLanguage);
      }
    }
  }

  function stepLanguage() {
    clearStage();
    const s = COPY.languageScreen;
    addMsg(s.body);
    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'ist-onb-choices';
    s.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ist-onb-choice';
      btn.innerHTML = `<div>${c.label}</div><small>${c.sub}</small>`;
      btn.addEventListener('click', () => {
        lang = c.value === 'more_english' ? 'en' : 'tr';
        if (global.I18N && I18N.setLang) I18N.setLang(c.value);
        stepPalette();
      });
      choicesWrap.appendChild(btn);
    });
    document.getElementById('ist-onb-stage').appendChild(choicesWrap);
    requestAnimationFrame(() => choicesWrap.querySelectorAll('.ist-onb-choice').forEach(el => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 360ms ease';
      requestAnimationFrame(() => { el.style.opacity = '1'; });
    }));
  }

  function stepPalette() {
    clearStage();
    const s = COPY.paletteScreen[lang];
    addMsg(s.body);
    const choicesWrap = document.createElement('div');
    choicesWrap.className = 'ist-onb-choices';
    s.choices.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ist-onb-choice';
      btn.innerHTML = `
        <div class="ist-onb-swatch ${c.value}"><span></span><span></span><span></span></div>
        <div>${c.label}</div>
        <small>${c.sub}</small>
      `;
      btn.addEventListener('click', () => {
        palette = c.value;
        mascot = c.mascot;
        root.setAttribute('data-palette', palette);
        stepTour(0);
      });
      choicesWrap.appendChild(btn);
    });
    document.getElementById('ist-onb-stage').appendChild(choicesWrap);
  }

  // Single combined progression for mascot reveal + 3 tour beats.
  function stepTour(idx) {
    clearStage();
    const lines = COPY.tour[lang][mascot];
    const stage = document.getElementById('ist-onb-stage');
    stage.insertAdjacentHTML('beforeend', mascotImgHTML());
    addMsg(lines[idx]);
    const next = idx + 1;
    if (next < lines.length) {
      addHint(COPY.tapToContinue[lang], () => stepTour(next));
    } else {
      addHint(COPY.tapToContinue[lang], stepKefilShare);
    }
  }

  function stepKefilShare() {
    clearStage();
    const stage = document.getElementById('ist-onb-stage');
    stage.insertAdjacentHTML('beforeend', mascotImgHTML());
    addMsg(fillKefil(COPY.kefilShare[lang][mascot]));
    const box = document.createElement('div');
    box.className = 'ist-onb-codebox';
    const codeSpan = document.createElement('span');
    codeSpan.textContent = referralCode || '—';
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = COPY.copy[lang];
    copyBtn.addEventListener('click', () => {
      if (!referralCode) return;
      navigator.clipboard?.writeText(referralCode);
      copyBtn.textContent = COPY.copied[lang];
      setTimeout(() => { copyBtn.textContent = COPY.copy[lang]; }, 1400);
    });
    box.appendChild(codeSpan);
    box.appendChild(copyBtn);
    stage.appendChild(box);
    addHint(COPY.tapToContinue[lang], stepProfilePrompt);
  }

  function stepProfilePrompt() {
    clearStage();
    const stage = document.getElementById('ist-onb-stage');
    stage.insertAdjacentHTML('beforeend', mascotImgHTML());
    addMsg(COPY.profilePrompt[lang][mascot]);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ist-onb-btn';
    btn.textContent = COPY.finishLabel[lang];
    btn.addEventListener('click', finish);
    stage.appendChild(btn);
  }

  async function finish() {
    // Persist choices + completion timestamp. The user's RLS policy lets
    // them update their own row; the protect_profile_columns trigger
    // doesn't touch these columns.
    try {
      await sb.from('profiles').update({
        onboarded_at: new Date().toISOString(),
        language_pref: lang === 'en' ? 'more_english' : 'default',
        palette_pref: palette,
        mascot: mascot,
      }).eq('id', user.id);
    } catch (e) {
      console.error('onboarding finish failed', e);
    }
    hide();
  }

  function buildRoot() {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('data-palette', 'earth');
    root.innerHTML = `
      <div class="ist-onb-tap-zone"></div>
      <div id="ist-onb-stage"></div>
    `;
    document.body.appendChild(root);
  }

  async function maybeRun(opts) {
    sb = opts.sb;
    user = opts.user;
    if (!sb || !user) return false;

    // Check whether we already onboarded.
    const { data: profile } = await sb.from('profiles')
      .select('onboarded_at, referral_code, referred_by')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || profile.onboarded_at) return false;

    referralCode = profile.referral_code || '';

    // Resolve kefil display name (referred_by → profiles).
    if (profile.referred_by) {
      const { data: kefil } = await sb.from('profiles_public')
        .select('first_name, last_name')
        .eq('id', profile.referred_by)
        .maybeSingle();
      if (kefil) {
        kefilName = [kefil.first_name, kefil.last_name].filter(Boolean).join(' ').trim();
      }
    }
    if (!kefilName) kefilName = opts.kefilName || 'your sponsor';

    if (!document.getElementById(ROOT_ID)) buildRoot();
    else root = document.getElementById(ROOT_ID);
    show();
    stepWelcome();
    return true;
  }

  global.IstOnboarding = { maybeRun };
})(window);
