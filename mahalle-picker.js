// Lightweight post-login mahalle picker.
// Independent of onboarding.js (which only ever runs once, on first login
// for brand-new accounts) so it also reaches existing users whose ilçe
// gained mahalle data after they already signed up. No-ops if the user's
// ilçe has no mahalle rows yet, or if they've already got one set.
//
// Mount from any page after auth:
//   MahallePicker.maybeRun({ sb, user })

(function (global) {
  const DISMISS_KEY = 'istanbulite_mahalle_picker_dismissed';

  function isEnglish() {
    return !!(global.I18N && global.I18N.isEnglish && global.I18N.isEnglish());
  }
  function t(tr, en) { return isEnglish() ? en : tr; }

  async function maybeRun({ sb, user }) {
    if (!sb || !user) return false;
    try { if (sessionStorage.getItem(DISMISS_KEY) === '1') return false; } catch (e) { /* ignore */ }

    const { data: profile } = await sb.from('profiles')
      .select('neighborhood, mahalle, onboarded_at')
      .eq('id', user.id)
      .maybeSingle();
    // Don't run mid first-login onboarding tour (it locks the page itself),
    // and don't run if there's nothing left to pick.
    if (!profile || !profile.onboarded_at || !profile.neighborhood || profile.mahalle) return false;

    const { data: mahalles } = await sb.from('mahalles')
      .select('id, name_tr')
      .eq('ilce_id', profile.neighborhood)
      .order('name_tr');
    if (!mahalles || mahalles.length === 0) return false; // no mahalle data for this ilçe yet

    render(sb, user, mahalles);
    return true;
  }

  function render(sb, user, mahalles) {
    const overlay = document.createElement('div');
    overlay.id = 'ist-mp-overlay';
    overlay.innerHTML = `
      <div class="ist-mp-card" role="dialog" aria-modal="true" aria-labelledby="ist-mp-title">
        <div class="ist-mp-title" id="ist-mp-title">${t('Mahalleni Seç', 'Pick your mahalle')}</div>
        <div class="ist-mp-body">${t(
          'Kahvehane’de sadece kendi mahallende yorum yapabilirsin. Hangi mahalledesin?',
          'In Kahvehane you can only comment in your own mahalle. Which one are you in?'
        )}</div>
        <select id="ist-mp-select">
          <option value="" disabled selected>${t('Seç…', 'Choose…')}</option>
          ${mahalles.map((m) => `<option value="${m.id}">${m.name_tr}</option>`).join('')}
        </select>
        <div class="ist-mp-actions">
          <button type="button" id="ist-mp-later" class="ist-mp-btn-ghost">${t('Sonra', 'Later')}</button>
          <button type="button" id="ist-mp-save" class="ist-mp-btn" disabled>${t('Kaydet', 'Save')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const select = overlay.querySelector('#ist-mp-select');
    const saveBtn = overlay.querySelector('#ist-mp-save');
    const laterBtn = overlay.querySelector('#ist-mp-later');

    select.addEventListener('change', () => { saveBtn.disabled = !select.value; });

    laterBtn.addEventListener('click', () => {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (e) { /* ignore */ }
      close();
    });

    saveBtn.addEventListener('click', async () => {
      if (!select.value) return;
      saveBtn.disabled = true;
      const savingLabel = t('Kaydediliyor…', 'Saving…');
      saveBtn.textContent = savingLabel;
      try {
        await sb.from('profiles').update({ mahalle: select.value }).eq('id', user.id);
      } catch (e) {
        console.error('mahalle picker save failed', e);
      }
      close();
    });

    function close() {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
    }
  }

  global.MahallePicker = { maybeRun };
})(window);
