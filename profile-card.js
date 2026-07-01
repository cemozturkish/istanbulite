// ══════════════════════════════════════════════════════════════
// Shared mobile profile card widget.
// Included by anahane.html, kahvehane.html, and kutuphane.html.
//
// Renders a compact card (avatar + name + neighborhood + action button)
// at the top of the page on mobile.
//
// Page-specific behaviour (set via opts.page):
//   'anahane'   → AYARLAR button → language/theme sliders + ÇIKIŞ YAP
//   'kutuphane' → DÜZENLE button → read-only HESAP info + game scores
//   'kahvehane' → no button, no panel
//
// Usage: IstProfileCard.mount({ sb, I18N, page });
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

  // Preset avatars, shared between the desktop library-card picker and this
  // mobile widget. `requiresSozculCount` gates an option behind a lifetime
  // sözcü count.
  const AVATAR_OPTIONS = [
    { url: 'assets/avatar-long.png',  label: 'Uzun saç' },
    { url: 'assets/avatar-short.png', label: 'Kısa saç' },
    { url: 'assets/avatar-bald.png',  label: 'Saçsız' },
    { url: 'assets/avatar-sozcu.png', label: 'Sözcü', requiresSozculCount: 10 },
  ];

  const AVATAR_LOCK_SVG = '<span class="ist-avatar-lock" aria-hidden="true">'
    + '<svg viewBox="0 0 12 12" fill="currentColor">'
    + '<path d="M6 1.5a2.5 2.5 0 0 0-2.5 2.5V5.5h-.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5H8.5V4A2.5 2.5 0 0 0 6 1.5zm-1.5 4V4a1.5 1.5 0 1 1 3 0v1.5h-3z"/>'
    + '</svg></span>';

  function buildAvatarPicker(currentAvatarUrl, sozculCount, opts) {
    opts = opts || {};
    const optionClass = opts.optionClass || 'ist-avatar-option';
    return AVATAR_OPTIONS.map(o => {
      const required = o.requiresSozculCount || 0;
      const locked = required > 0 && (sozculCount || 0) < required;
      const selected = currentAvatarUrl === o.url;
      const title = locked
        ? `${o.label} — ${required} kez Sözcü olmak gerekiyor (${sozculCount || 0}/${required})`
        : o.label;
      const cls = [optionClass];
      if (selected) cls.push('selected');
      if (locked)   cls.push('locked');
      return `
        <button type="button"
          class="${cls.join(' ')}"
          data-url="${o.url}"
          ${locked ? 'aria-disabled="true"' : ''}
          title="${title}"
          aria-label="${o.label}">
          <img src="${o.url}" alt="${o.label}">
          ${locked ? AVATAR_LOCK_SVG : ''}
        </button>
      `;
    }).join('');
  }

  function lookupAvatarOption(url) {
    return AVATAR_OPTIONS.find(o => o.url === url) || null;
  }

  function lockedAvatarMessage(opt, sozculCount) {
    const need = opt.requiresSozculCount;
    return `Bu avatar kilitli — ${need} kez Sözcü olmak gerekiyor (${sozculCount || 0}/${need}).`;
  }

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
      tumcelWins: 0, tumcelPlayed: 0, tumcelStreak: 0,
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
      const winDatesByGame = { bulmaca: new Set(), sozcel: new Set(), tumcel: new Set() };
      Object.values(byGameDate).forEach(entry => {
        const g = entry.game;
        if (!(g in winDatesByGame)) return;
        agg[g + 'Played']++;
        if (entry.won) { agg[g + 'Wins']++; winDatesByGame[g].add(entry.date); }
      });
      agg.sozcelStreak = currentStreakFor(winDatesByGame.sozcel);
      agg.bulmacaStreak = currentStreakFor(winDatesByGame.bulmaca);
      agg.tumcelStreak = currentStreakFor(winDatesByGame.tumcel);
      return agg;
    } catch (e) {
      return empty;
    }
  }

  async function mount(opts) {
    const sb = opts.sb;
    const I18N = opts.I18N;
    const page = opts.page || 'anahane'; // 'anahane' | 'kahvehane' | 'kutuphane'
    const container = document.getElementById('ist-pc-mount');
    if (!container || !sb) return;

    // Only show on mobile — bail early on desktop to save Supabase calls.
    if (window.innerWidth > 768) {
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

      function istanbulTodayISO() {
        const now = new Date();
        const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
        const y = ist.getFullYear();
        const m = String(ist.getMonth() + 1).padStart(2, '0');
        const d = String(ist.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const today = istanbulTodayISO();

      const [{ data: profile }, { count: kefaletCount }, { count: sozculCount }] = await Promise.all([
        sb.from('profiles').select('*').eq('id', user.id).single(),
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('referred_by', user.id),
        sb.from('sozcel_sozcul_assignments').select('*', { count: 'exact', head: true }).eq('user_id', user.id).lte('game_date', today),
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
      let avatarUrl = profile?.avatar_url || null;

      const yasadigiDisplay = yasadigi ? (NB_NAMES[yasadigi] || yasadigi) : '—';
      const dogumDisplay = dogumYeri ? (NB_NAMES[dogumYeri] || dogumYeri) : '—';
      const joinedDate = I18N.formatDate(user.created_at, { year:'numeric', month:'long', day:'numeric' });
      const lastSeenText = formatLastSeen(user.last_sign_in_at, I18N);

      const t = (k) => (I18N && I18N.t) ? I18N.t(k) : k;

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
              <div class="ist-pc-score-game">Tümcel</div>
              <div class="ist-pc-score-value">${scores.tumcelWins || 0}</div>
              <div class="ist-pc-score-detail">${detail(scores.tumcelPlayed||0, scores.tumcelStreak||0)}</div>
            </div>
          </div>
        `;
      }

      // ── AYARLAR panel (anahane): language/theme sliders + sign out ──
      function ayarlarPanelHTML() {
        return `
          <div class="ist-pc-panel" id="ist-pc-panel">
          <div class="ist-pc-panel-inner">
            <button type="button" class="ist-pc-panel-close" id="ist-pc-panel-close" aria-label="Kapat">×</button>
            <div class="ist-pc-section-title">Ayarlar</div>

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
              <button type="button" class="ist-pc-save" id="ist-pc-save">${esc(t('profile.save'))}</button>
            </div>
            <div class="ist-pc-msg" id="ist-pc-msg"></div>

            <button type="button" class="ist-pc-signout" id="ist-pc-signout">${esc(t('profile.signout'))}</button>
          </div>
          </div>
        `;
      }

      // ── DÜZENLE panel (kutuphane): read-only account info + game scores ──
      function duzenlePanelHTML() {
        const kefilLabel = kefilOfUser
          ? esc(capitalizeName(`${kefilOfUser.first_name||''} ${kefilOfUser.last_name||''}`.trim()) || t('profile.unnamed'))
          : '';
        return `
          <div class="ist-pc-panel" id="ist-pc-panel">
          <div class="ist-pc-panel-inner">
            <button type="button" class="ist-pc-panel-close" id="ist-pc-panel-close" aria-label="Kapat">×</button>
            <div class="ist-pc-section-title">${esc(t('profile.account'))}</div>

            <div class="ist-pc-avatar-field">
              <div class="ist-pc-label">${esc(t('profile.chooseavatar'))}</div>
              <div class="ist-pc-avatar-picker" id="ist-pc-avatar-picker">${buildAvatarPicker(avatarUrl, sozculCount)}</div>
              <div class="ist-pc-avatar-msg" id="ist-pc-avatar-msg" role="status" aria-live="polite"></div>
            </div>

            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.firstname'))}</div>
              <div class="ist-pc-info-value">${esc(firstName || '—')}</div>
            </div>
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.lastname'))}</div>
              <div class="ist-pc-info-value">${esc(lastName || '—')}</div>
            </div>
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.district'))}</div>
              <div class="ist-pc-info-value">${esc(yasadigiDisplay)}</div>
            </div>
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.birthplace'))}</div>
              <div class="ist-pc-info-value">${esc(dogumDisplay)}</div>
            </div>
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
            <div class="ist-pc-info-row">
              <div class="ist-pc-info-label">${esc(t('profile.sozculcount'))}</div>
              <div class="ist-pc-info-value">${sozculCount ?? 0} ${esc(t('profile.times'))}</div>
            </div>

            <div class="ist-pc-section-title">${esc(t('profile.gamescores') || 'Oyun Skorları')}</div>
            <div id="ist-pc-scores-mount">${scoresHTML({})}</div>
          </div>
          </div>
        `;
      }

      // Button label by page
      const toggleLabel = page === 'kutuphane' ? (t('profile.edit') || 'DÜZENLE')
                        : page === 'anahane'   ? 'AYARLAR'
                        : '';

      const hasPanel = page === 'anahane' || page === 'kutuphane';

      container.innerHTML = `
        <div class="ist-pc" id="ist-pc-root">
          <div class="ist-pc-row">
            <div class="ist-pc-avatar" id="ist-pc-avatar">${avatarHTML()}</div>
            <div class="ist-pc-id">
              <div class="ist-pc-name">${esc(displayName)}</div>
              <div class="ist-pc-meta">${esc(yasadigiDisplay)}</div>
            </div>
            ${hasPanel ? `<button type="button" class="ist-pc-toggle" id="ist-pc-toggle">${esc(toggleLabel)}</button>` : ''}
          </div>
          ${page === 'anahane'   ? ayarlarPanelHTML() : ''}
          ${page === 'kutuphane' ? duzenlePanelHTML() : ''}
        </div>
      `;

      if (!hasPanel) return;

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
        toggleBtn.textContent = toggleLabel;
        document.body.style.overflow = '';
      }

      toggleBtn.addEventListener('click', () => {
        if (root.classList.contains('open')) closePanel();
        else openPanel();
      });

      document.getElementById('ist-pc-panel-close').addEventListener('click', closePanel);

      panel.addEventListener('click', (e) => {
        if (e.target === panel) closePanel();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && root.classList.contains('open')) closePanel();
      });

      if (page === 'anahane') {
        // Sliders + save (language and theme only)
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

        document.getElementById('ist-pc-save').addEventListener('click', async () => {
          const msgEl = document.getElementById('ist-pc-msg');
          const btn = document.getElementById('ist-pc-save');
          const newLang = LANG_VALUES[parseInt(document.getElementById('ist-pc-language').value, 10)] || 'default';
          const newTheme = THEME_VALUES[parseInt(document.getElementById('ist-pc-theme').value, 10)] || 'system';

          btn.textContent = t('profile.saving');
          btn.disabled = true;
          msgEl.textContent = '';

          try {
            const { data, error } = await sb
              .from('profiles')
              .update({ language_pref: newLang, theme_pref: newTheme })
              .eq('id', user.id)
              .select('id');
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Profil bulunamadı.');
            setTimeout(() => window.location.reload(), 400);
          } catch (err) {
            btn.textContent = t('profile.save');
            btn.disabled = false;
            msgEl.textContent = err.message || 'Kaydedilemedi.';
          }
        });

        document.getElementById('ist-pc-signout').addEventListener('click', async () => {
          await sb.auth.signOut();
          window.location.href = 'index.html';
        });
      }

      if (page === 'kutuphane') {
        const copyBtn = document.getElementById('ist-pc-copy');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(referralCode);
            const orig = copyBtn.textContent;
            copyBtn.textContent = t('profile.copied');
            setTimeout(() => copyBtn.textContent = orig, 1500);
          });
        }

        // Avatar picker
        let _avatarMsgTimer = null;
        function showAvatarMsg(text) {
          const el = document.getElementById('ist-pc-avatar-msg');
          if (!el) return;
          el.textContent = text;
          el.classList.add('show');
          clearTimeout(_avatarMsgTimer);
          _avatarMsgTimer = setTimeout(() => el.classList.remove('show'), 5000);
        }

        async function pickAvatar(url) {
          if (!url || url === avatarUrl) return;
          const opt = lookupAvatarOption(url);
          if (opt?.requiresSozculCount && (sozculCount || 0) < opt.requiresSozculCount) {
            showAvatarMsg(lockedAvatarMessage(opt, sozculCount));
            return;
          }
          const { data, error } = await sb
            .from('profiles')
            .update({ avatar_url: url })
            .eq('id', user.id)
            .select('id');
          if (error) {
            showAvatarMsg('Avatar kaydedilemedi: ' + error.message);
            return;
          }
          if (!data || data.length === 0) {
            showAvatarMsg('Profil kaydı bulunamadı. Yönetici ile iletişime geçin.');
            return;
          }
          avatarUrl = url;
          const av = document.getElementById('ist-pc-avatar');
          if (av) av.innerHTML = `<img src="${esc(url)}" alt="">`;
          document.querySelectorAll('#ist-pc-avatar-picker .ist-avatar-option').forEach(b => {
            b.classList.toggle('selected', b.dataset.url === url);
          });
        }

        document.querySelectorAll('#ist-pc-avatar-picker .ist-avatar-option').forEach(btn => {
          btn.addEventListener('click', () => pickAvatar(btn.dataset.url));
        });

        // Hydrate scores async
        getGameScores(sb, user.id).then(scores => {
          const m = document.getElementById('ist-pc-scores-mount');
          if (m) m.innerHTML = scoresHTML(scores);
        });
      }
    }
  }

  global.IstProfileCard = {
    mount,
    AVATAR_OPTIONS,
    AVATAR_LOCK_SVG,
    buildAvatarPicker,
    lookupAvatarOption,
    lockedAvatarMessage,
  };
}(window));
