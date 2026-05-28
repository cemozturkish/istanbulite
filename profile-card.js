// ══════════════════════════════════════════════════════════════
// Shared mobile profile card widget.
// Included by anahane.html, kahvehane.html, and kutuphane.html.
//
// Renders a compact card (avatar + name + neighborhood + DÜZENLE)
// at the top of the page on mobile. Clicking DÜZENLE expands an
// inline panel containing the edit form AND the HESAP (account
// info + game scores) section in one go.
//
// Usage: IstProfileCard.mount({ sb, I18N });
// Assumes a <div id="ist-pc-mount"> exists in the page.
// ══════════════════════════════════════════════════════════════
(function (global) {
  const NB_NAMES = {
    bakirkoy:'Bakırköy', bayrampasa:'Bayrampaşa', bahcelievler:'Bahçelievler',
    sisli:'Şişli', eyupsultan:'Eyüpsultan', gop:'Gaziosmanpaşa',
    esenler:'Esenler', bagcilar:'Bağcılar', basaksehir:'Başakşehir',
    kucukcekmece:'Küçükçekmece', sultangazi:'Sultangazi', uskudar:'Üsküdar',
    kadikoy:'Kadıköy', maltepe:'Maltepe', umraniye:'Ümraniye',
    cekmekoy:'Çekmeköy', beykoz:'Beykoz', sariyer:'Sarıyer',
    besiktas:'Beşiktaş', beyoglu:'Beyoğlu', gungoren:'Güngören',
    kagithane:'Kağıthane', atasehir:'Ataşehir', zeytinburnu:'Zeytinburnu',
    fatih:'Fatih', istanbul_disi:'İstanbul Dışı'
  };

  const LANG_VALUES = ['more_english', 'default', 'more_turkish'];
  const THEME_VALUES = ['light', 'system', 'dark'];
  const ADMIN_EMAIL = 'cemwozturk@gmail.com';

  function capitalizeName(s) {
    if (!s) return '';
    return s.trim().split(/\s+/).map(w =>
      w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR') : ''
    ).join(' ');
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function formatLastSeen(dateStr, I18N) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    const en = I18N && I18N.isEnglish && I18N.isEnglish();
    if (diffMins < 1) return en ? 'Online now' : 'Şimdi çevrimiçi';
    if (diffMins < 60) return en ? `${diffMins}m ago` : `${diffMins} dk önce`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return en ? `${diffHours}h ago` : `${diffHours} saat önce`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return en ? `${diffDays}d ago` : `${diffDays} gün önce`;
    return I18N.formatDate(d, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Read game scores from Supabase, aggregated per game.
  async function getGameScores(sb, userId) {
    function currentStreakFor(winDates) {
      function seedForOffset(off) {
        const now = new Date();
        const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        ist.setDate(ist.getDate() - off);
        return `${ist.getFullYear()}-${ist.getMonth() + 1}-${ist.getDate()}`;
      }
      let streak = 0;
      let offset = winDates.has(seedForOffset(0)) ? 0 : 1;
      while (winDates.has(seedForOffset(offset))) { streak++; offset++; }
      return streak;
    }
    const empty = {
      bulmacaWins: 0, bulmacaPlayed: 0, bulmacaStreak: 0,
      sozcelWins: 0, sozcelPlayed: 0, sozcelStreak: 0,
      baglantilarWins: 0, baglantilarPlayed: 0, baglantilarStreak: 0,
    };
    try {
      const { data, error } = await sb
        .from('game_results')
        .select('game, won, date')
        .eq('user_id', userId);
      if (error) throw error;
      const byGameDate = {};
      (data || []).forEach(r => {
        const key = r.game + '|' + r.date;
        if (!byGameDate[key]) byGameDate[key] = { game: r.game, date: r.date, won: false };
        if (r.won) byGameDate[key].won = true;
      });
      const agg = { ...empty };
      const winDatesByGame = { bulmaca: new Set(), sozcel: new Set(), baglantilar: new Set() };
      Object.values(byGameDate).forEach(entry => {
        const g = entry.game;
        if (!(g in winDatesByGame)) return;
        agg[g + 'Played']++;
        if (entry.won) { agg[g + 'Wins']++; winDatesByGame[g].add(entry.date); }
      });
      agg.sozcelStreak = currentStreakFor(winDatesByGame.sozcel);
      agg.bulmacaStreak = currentStreakFor(winDatesByGame.bulmaca);
      agg.baglantilarStreak = currentStreakFor(winDatesByGame.baglantilar);
      return agg;
    } catch (e) {
      return empty;
    }
  }

  async function mount(opts) {
    const sb = opts.sb;
    const I18N = opts.I18N;
    const container = document.getElementById('ist-pc-mount');
    if (!container || !sb) return;

    // Only show on mobile — bail early on desktop to save Supabase calls.
    if (window.innerWidth > 768) {
      // Listen for resize: if user rotates / resizes into mobile, mount then.
      let mounted = false;
      const onResize = () => {
        if (!mounted && window.innerWidth <= 768) {
          mounted = true;
          window.removeEventListener('resize', onResize);
          doMount();
        }
      };
      window.addEventListener('resize', onResize);
      return;
    }
    doMount();

    async function doMount() {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      const user = session.user;
      container.innerHTML = `<div class="ist-pc"><div class="ist-pc-loading"><span>Yükleniyor…</span></div></div>`;

      const [{ data: profile }, { count: kefaletCount }] = await Promise.all([
        sb.from('profiles').select('*').eq('id', user.id).single(),
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id),
      ]);

      let kefilOfUser = null;
      if (profile && profile.referred_by) {
        const { data: kp } = await sb
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('id', profile.referred_by)
          .maybeSingle();
        if (kp) kefilOfUser = kp;
      }

      const firstName = profile?.first_name || '';
      const lastName = profile?.last_name || '';
      const displayName = `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
      const yasadigi = profile?.neighborhood || '';
      const dogumYeri = profile?.birth_place || '';
      const phone = profile?.phone || '';
      const referralCode = profile?.referral_code || '';
      const languagePref = profile?.language_pref || 'default';
      const themePref = profile?.theme_pref || 'system';
      const avatarUrl = profile?.avatar_url || null;
      const isAdmin = user.email === ADMIN_EMAIL;

      const yasadigiDisplay = yasadigi ? (NB_NAMES[yasadigi] || yasadigi) : '—';
      const dogumDisplay = dogumYeri ? (NB_NAMES[dogumYeri] || dogumYeri) : '—';
      const joinedDate = I18N.formatDate(user.created_at, { year:'numeric', month:'long', day:'numeric' });
      const lastSeenText = formatLastSeen(user.last_sign_in_at, I18N);

      const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;

      const districtOptions = Object.entries(NB_NAMES)
        .filter(([id]) => id !== 'istanbul_disi')
        .sort((a, b) => a[1].localeCompare(b[1], 'tr'))
        .map(([id, name]) => `<option value="${id}"${id === yasadigi ? ' selected' : ''}>${esc(name)}</option>`)
        .join('');

      function avatarHTML() {
        return avatarUrl
          ? `<img src="${esc(avatarUrl)}" alt="">`
          : esc(displayName.charAt(0).toUpperCase());
      }

      function scoresHTML(scores) {
        function detail(played, streak) {
          if (played === 0) return 'Henüz oynanmadı';
          if (streak && streak > 0) return streak + ' seri';
          return played + ' oyun';
        }
        return `
          <div class="ist-pc-scores">
            <div class="ist-pc-score-card">
              <div class="ist-pc-score-game">Bulmaca</div>
              <div class="ist-pc-score-value">${scores.bulmacaWins || 0}</div>
              <div class="ist-pc-score-detail">${detail(scores.bulmacaPlayed||0, scores.bulmacaStreak||0)}</div>
            </div>
            <div class="ist-pc-score-card">
              <div class="ist-pc-score-game">Sözcel</div>
              <div class="ist-pc-score-value">${scores.sozcelWins || 0}</div>
              <div class="ist-pc-score-detail">${detail(scores.sozcelPlayed||0, scores.sozcelStreak||0)}</div>
            </div>
            <div class="ist-pc-score-card">
              <div class="ist-pc-score-game">Bağlantılar</div>
              <div class="ist-pc-score-value">${scores.baglantilarWins || 0}</div>
              <div class="ist-pc-score-detail">${detail(scores.baglantilarPlayed||0, scores.baglantilarStreak||0)}</div>
            </div>
          </div>
        `;
      }

      function panelHTML() {
        const kefilLabel = kefilOfUser
          ? esc(capitalizeName(`${kefilOfUser.first_name||''} ${kefilOfUser.last_name||''}`.trim()) || t('profile.unnamed'))
          : '';
        return `
          <div class="ist-pc-panel" id="ist-pc-panel">
          <div class="ist-pc-panel-inner">
            <button type="button" class="ist-pc-panel-close" id="ist-pc-panel-close" aria-label="${esc(t('profile.cancel'))}">×</button>
            <div class="ist-pc-section-title">${esc(t('profile.edit') || 'Düzenle')}</div>

            <div class="ist-pc-field">
              <button type="button" class="ist-pc-avatar-btn" id="ist-pc-avatar-btn">${esc(t('profile.changephoto'))}</button>
              <input type="file" id="ist-pc-avatar-input" accept="image/*" style="display:none;">
            </div>

            <div class="ist-pc-field">
              <div class="ist-pc-label">${esc(t('profile.firstname'))}</div>
              <input class="ist-pc-input" id="ist-pc-firstname" type="text" value="${esc(firstName)}">
            </div>
            <div class="ist-pc-field">
              <div class="ist-pc-label">${esc(t('profile.lastname'))}</div>
              <input class="ist-pc-input" id="ist-pc-lastname" type="text" value="${esc(lastName)}">
            </div>
            <div class="ist-pc-field">
              <div class="ist-pc-label">${esc(t('profile.district'))}</div>
              ${isAdmin
                ? `<select class="ist-pc-select" id="ist-pc-yasadigi">${districtOptions}</select>`
                : `<div class="ist-pc-display">${esc(yasadigiDisplay)}</div>`}
            </div>
            <div class="ist-pc-field">
              <div class="ist-pc-label">${esc(t('profile.birthplace'))}</div>
              <div class="ist-pc-display">${esc(dogumDisplay)}</div>
            </div>
            <div class="ist-pc-field">
              <div class="ist-pc-label">${esc(t('profile.langpref'))}</div>
              <input class="ist-pc-slider" id="ist-pc-language" type="range" min="0" max="2" step="1" value="${LANG_VALUES.indexOf(languagePref)}">
              <div class="ist-pc-ticks" id="ist-pc-language-ticks">
                <span data-idx="0">Daha İngilizce</span>
                <span data-idx="1">Olduğu Gibi</span>
                <span data-idx="2">Daha Türkçe</span>
              </div>
            </div>
            <div class="ist-pc-field">
              <div class="ist-pc-label">${esc(t('profile.appearance'))}</div>
              <input class="ist-pc-slider" id="ist-pc-theme" type="range" min="0" max="2" step="1" value="${THEME_VALUES.indexOf(themePref)}">
              <div class="ist-pc-ticks" id="ist-pc-theme-ticks">
                <span data-idx="0">Açık</span>
                <span data-idx="1">Sistem</span>
                <span data-idx="2">Koyu</span>
              </div>
            </div>

            <div class="ist-pc-actions">
              <button type="button" class="ist-pc-cancel" id="ist-pc-cancel">${esc(t('profile.cancel'))}</button>
              <button type="button" class="ist-pc-save" id="ist-pc-save">${esc(t('profile.save'))}</button>
            </div>
            <div class="ist-pc-msg" id="ist-pc-msg"></div>

            <div class="ist-pc-section-title">${esc(t('profile.account'))}</div>
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.email'))}</div>
              <div class="ist-pc-info-value">${esc(user.email)}</div>
            </div>
            ${phone ? `
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.phone') || 'Telefon')}</div>
              <div class="ist-pc-info-value">${esc(phone)}</div>
            </div>` : ''}
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.membership'))}</div>
              <div class="ist-pc-info-value">${esc(joinedDate)}</div>
            </div>
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.lastseen'))}</div>
              <div class="ist-pc-info-value">${esc(lastSeenText)}</div>
            </div>
            ${kefilOfUser ? `
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.kefil'))}</div>
              <div class="ist-pc-info-value">${kefilLabel}</div>
            </div>` : ''}
            ${referralCode ? `
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.referralcode'))}</div>
              <div class="ist-pc-info-value">
                <span class="ist-pc-code">${esc(referralCode)}</span>
                <button type="button" class="ist-pc-copy" id="ist-pc-copy">${esc(t('profile.copy'))}</button>
              </div>
            </div>` : ''}
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.sponsoredcount'))}</div>
              <div class="ist-pc-info-value">${kefaletCount ?? 0} ${esc(t('profile.people'))}</div>
            </div>

            <div class="ist-pc-section-title">${esc(t('profile.gamescores') || 'Oyun Skorları')}</div>
            <div id="ist-pc-scores-mount">${scoresHTML({})}</div>

            <button type="button" class="ist-pc-signout" id="ist-pc-signout">${esc(t('profile.signout'))}</button>
          </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="ist-pc" id="ist-pc-root">
          <div class="ist-pc-row">
            <div class="ist-pc-avatar" id="ist-pc-avatar">${avatarHTML()}</div>
            <div class="ist-pc-id">
              <div class="ist-pc-name">${esc(displayName)}</div>
              <div class="ist-pc-meta">${esc(yasadigiDisplay)}</div>
            </div>
            <button type="button" class="ist-pc-toggle" id="ist-pc-toggle">${esc(t('profile.edit'))}</button>
          </div>
          ${panelHTML()}
        </div>
      `;

      const root = document.getElementById('ist-pc-root');
      const toggleBtn = document.getElementById('ist-pc-toggle');
      const panel = document.getElementById('ist-pc-panel');

      function openPanel() {
        root.classList.add('open');
        toggleBtn.textContent = t('profile.cancel');
        document.body.style.overflow = 'hidden';
      }
      function closePanel() {
        root.classList.remove('open');
        toggleBtn.textContent = t('profile.edit');
        document.body.style.overflow = '';
      }

      toggleBtn.addEventListener('click', () => {
        if (root.classList.contains('open')) closePanel();
        else openPanel();
      });

      document.getElementById('ist-pc-cancel').addEventListener('click', closePanel);
      document.getElementById('ist-pc-panel-close').addEventListener('click', closePanel);

      // Click on the backdrop (outside the inner panel) closes the modal.
      panel.addEventListener('click', (e) => {
        if (e.target === panel) closePanel();
      });

      // Escape key closes the modal.
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root.classList.contains('open')) closePanel();
      });

      document.getElementById('ist-pc-signout').addEventListener('click', async () => {
        await sb.auth.signOut();
        window.location.href = 'index.html';
      });

      const copyBtn = document.getElementById('ist-pc-copy');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(referralCode);
          const orig = copyBtn.textContent;
          copyBtn.textContent = t('profile.copied');
          setTimeout(() => copyBtn.textContent = orig, 1500);
        });
      }

      // Sliders: highlight active tick + click-to-set
      function syncTicks(sliderId, ticksId) {
        const slider = document.getElementById(sliderId);
        const ticks = document.getElementById(ticksId);
        if (!slider || !ticks) return;
        const update = () => {
          const v = parseInt(slider.value, 10);
          ticks.querySelectorAll('span').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.idx, 10) === v);
          });
        };
        slider.addEventListener('input', update);
        ticks.querySelectorAll('span').forEach(s => {
          s.addEventListener('click', () => {
            slider.value = s.dataset.idx;
            slider.dispatchEvent(new Event('input'));
          });
        });
        update();
      }
      syncTicks('ist-pc-language', 'ist-pc-language-ticks');
      syncTicks('ist-pc-theme', 'ist-pc-theme-ticks');

      // Avatar upload
      const avatarBtn = document.getElementById('ist-pc-avatar-btn');
      const avatarInput = document.getElementById('ist-pc-avatar-input');
      avatarBtn.addEventListener('click', () => avatarInput.click());
      avatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 200 * 1024) {
          alert("Fotoğraf 200KB'den küçük olmalı.");
          return;
        }
        const reader = new FileReader();
        reader.onload = async (evt) => {
          const base64 = evt.target.result;
          const { data, error } = await sb
            .from('profiles')
            .update({ avatar_url: base64 })
            .eq('id', user.id)
            .select('id');
          if (error || !data || data.length === 0) {
            alert('Fotoğraf kaydedilemedi.');
            return;
          }
          document.getElementById('ist-pc-avatar').innerHTML = `<img src="${esc(base64)}" alt="">`;
        };
        reader.readAsDataURL(file);
      });

      // Save handler
      document.getElementById('ist-pc-save').addEventListener('click', async () => {
        const msgEl = document.getElementById('ist-pc-msg');
        const btn = document.getElementById('ist-pc-save');
        const newFirst = capitalizeName(document.getElementById('ist-pc-firstname').value.trim());
        const newLast = capitalizeName(document.getElementById('ist-pc-lastname').value.trim());
        const newLang = LANG_VALUES[parseInt(document.getElementById('ist-pc-language').value, 10)] || 'default';
        const newTheme = THEME_VALUES[parseInt(document.getElementById('ist-pc-theme').value, 10)] || 'system';

        btn.textContent = t('profile.saving');
        btn.disabled = true;
        msgEl.textContent = '';

        try {
          const payload = {
            first_name: newFirst,
            last_name: newLast,
            language_pref: newLang,
            theme_pref: newTheme,
          };
          if (isAdmin) {
            const yEl = document.getElementById('ist-pc-yasadigi');
            if (yEl && yEl.value) payload.neighborhood = yEl.value;
          }
          const { data, error } = await sb
            .from('profiles')
            .update(payload)
            .eq('id', user.id)
            .select('id');
          if (error) throw error;
          if (!data || data.length === 0) {
            throw new Error('Profil bulunamadı.');
          }
          setTimeout(() => window.location.reload(), 400);
        } catch (err) {
          btn.textContent = t('profile.save');
          btn.disabled = false;
          msgEl.textContent = err.message || 'Kaydedilemedi.';
        }
      });

      // Hydrate scores async
      getGameScores(sb, user.id).then(scores => {
        const m = document.getElementById('ist-pc-scores-mount');
        if (m) m.innerHTML = scoresHTML(scores);
      });
    }
  }

  global.IstProfileCard = { mount };
}(window));
