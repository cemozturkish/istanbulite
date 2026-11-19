// ══════════════════════════════════════════════════════════════
// NASIL OYNANIR — one help page for all four games
// ──────────────────────────────────────────────────────────────
// Every game's "how to play" button opens the same page, and that page
// describes ALL the games: the one being played first and in full, the
// other three under it in a sentence or two each. Only two games stand
// in the lineup on any night (db/game_night_slots.sql), so this page is
// the one place a member meets every game by name.
//
// One module rather than a help popup per page, because the four
// descriptions are one set: written once here, each game's own page can
// never describe a sibling differently from the way that sibling
// describes itself.
//
// Load it with the game's key, and it does the rest:
//   <script src="game-help.js?v=1" data-game="tumcel" defer></script>
// A page that already has a #help-btn of its own (Sözcel) keeps it and
// the module wires it; any other page gets a button made for it, in the
// top-right corner of the game window, on the same line and inset as the
// back arrow in the top-left (see sozcel.html's "ONE ROW, ONE LINE, ONE
// BOX SIZE").
// ══════════════════════════════════════════════════════════════
(function (global) {
  const script = document.currentScript;
  const CURRENT = (script && script.dataset.game) || '';

  // The order the "other games" are listed in, whichever one is on top.
  const ORDER = ['sozcel', 'tumcel', 'bulmaca', 'guncel'];
  const NAMES = { sozcel: 'Sözcel', tumcel: 'Tümcel', bulmaca: 'Çengel', guncel: 'Güncel' };

  const en = () => !!(global.I18N && I18N.isEnglish && I18N.isEnglish());
  const L = (tr, eng) => (en() ? eng : tr);
  // Sözcel's long text already lives in i18n.js (sozcel.help.*), where
  // it is translated; read from there rather than keeping a second copy.
  const t = (key, fallback) => {
    if (global.I18N && I18N.t) {
      const v = I18N.t(key);
      if (v && v !== key) return v;
    }
    return fallback;
  };

  // The short line under each OTHER game's name. One or two sentences:
  // enough to know what the game is when it turns up in a slot.
  function shortText(g) {
    switch (g) {
      case 'sozcel': return L(
        'Gizli Türkçe sözcüğü altı denemede bul. Doğru yerdeki harfler kilitlenir, renkler hangi harfin sözcükte olduğunu söyler.',
        'Find the hidden Turkish word in six tries. Letters in the right place lock in, and the colours tell you which letters are in the word.');
      case 'tumcel': return L(
        'On altı parça dört alıntıdan geliyor. Aynı söze ait dört parçayı bul; dört yanlış hakkın var.',
        'Sixteen fragments come from four quotes. Find the four that belong to the same quote; you have four mistakes.');
      case 'bulmaca': return L(
        'Küçük bir çengel bulmaca. Kareyi seç, tanımı oku, harfleri yaz; bitince Kontrol Et.',
        'A small crossword. Pick a square, read the clue, type the letters, then press Check.');
      case 'guncel': return L(
        'Dokuz olaydan dördü dün oldu. Hangileri olduğunu bul; her yanlış, o olayın gerçekte ne zaman olduğunu söyler ve bir can götürür.',
        'Four of nine events happened yesterday. Find which ones; each wrong pick tells you when it really happened and costs a life.');
    }
    return '';
  }

  // The game being played, in full. HTML, written here (or in i18n.js),
  // never member input.
  function longHTML(g) {
    const p = (s) => '<p class="ui-body">' + s + '</p>';
    switch (g) {
      case 'sozcel': {
        const sw = (cls) => '<span class="gh-swatch gh-' + cls + '"></span>';
        return p(t('sozcel.help.intro', 'Gizli Türkçe sözcüğü <strong>altı denemede</strong> bulun.')) +
          p(t('sozcel.help.hints', '')) +
          p(t('sozcel.help.colors', 'Her tahminin ardından kutular renklenir:')) +
          '<p class="ui-body gh-swatches">' +
            sw('correct') + ' ' + t('sozcel.help.green2', 'Harf doğru ve doğru yerde.') + '<br>' +
            sw('present') + ' ' + t('sozcel.help.yellow2', 'Harf sözcükte var ama yanlış yerde.') + '<br>' +
            sw('absent') + ' ' + t('sozcel.help.gray2', 'Harf sözcükte yok.') +
          '</p>' +
          p(t('sozcel.help.daily', 'Her gün yeni bir sözcük gelir.'));
      }
      case 'tumcel': return [
        L('Ekrandaki <strong>16 parçanın</strong> her biri dört alıntıdan birine ait. Aynı alıntıya ait olduğunu düşündüğün <strong>4 parçayı</strong> seç ve <strong>Gönder</strong>\'e bas.',
          'Each of the <strong>16 fragments</strong> on the board belongs to one of four quotes. Pick the <strong>4</strong> you think belong to the same quote and press <strong>Submit</strong>.'),
        L('Doğruysa parçalar yerine oturur; sözün tamamı ve kimden geldiği görünür. Yanlışsa bir can gider — <strong>4 canın</strong> var. Seçtiğin dört parçadan üçü aynı alıntıdansa oyun "Bir tane uzaktasın!" der. Aynı yanlış seçimi ikinci kez denemek can götürmez.',
          'If you are right, the fragments fall into place and the whole quote appears with where it comes from. If not, you lose a life — you have <strong>4</strong>. When three of your four come from the same quote, the game says you are one away. Trying the same wrong pick twice costs nothing.'),
        L('<strong>Karıştır</strong> parçaların yerini değiştirir, <strong>Temizle</strong> seçimini sıfırlar. Her gün dört yeni alıntı gelir.',
          '<strong>Shuffle</strong> moves the fragments around, <strong>Clear</strong> empties your pick. Four new quotes arrive every day.'),
      ].map(p).join('');
      case 'bulmaca': return [
        L('Bir kareye bas: o karenin sözcüğü işaretlenir, tanımı ızgaranın altında yazar. Aynı kareye tekrar basınca yatay ile dikey arasında geçersin.',
          'Press a square: its word lights up and its clue appears under the grid. Press the same square again to switch between across and down.'),
        L('Harfleri klavyeden yaz; imleç sözcük boyunca kendiliğinden ilerler. Tanımın iki yanındaki oklar bir önceki ya da sonraki sözcüğe geçirir.',
          'Type the letters on the keyboard; the cursor moves along the word by itself. The arrows either side of the clue take you to the previous or next word.'),
        L('Hazır olunca <strong>Kontrol Et</strong>\'e bas: doğru harfler işaretlenir. Bütün ızgara doğru olduğunda bulmaca biter; ne kadar az kontrol edersen o kadar iyi. <strong>Temizle</strong> her şeyi siler.',
          'When you are ready, press <strong>Check</strong>: the right letters are marked. The puzzle is done when the whole grid is right; the fewer checks, the better. <strong>Clear</strong> wipes everything.'),
      ].map(p).join('');
      case 'guncel': return [
        L('Tahtada <strong>9 olay</strong> var. <strong>4</strong> tanesi <strong>dün</strong> oldu, gerisi daha önce — geçen hafta, geçen ay, yıllar önce.',
          'There are <strong>9 events</strong> on the board. <strong>4</strong> of them happened <strong>yesterday</strong>, the rest earlier — last week, last month, years ago.'),
        L('Dün olduğunu düşündüğün olaya bas. Doğruysa kart koyulaşır ve <strong>DÜN</strong> damgası alır. Yanlışsa kart o olayın gerçekte ne zaman olduğunu söyler ("Bu geçen yıl oldu") ve bir can gider — <strong>4 canın</strong> var.',
          'Press an event you think happened yesterday. If you are right, the card turns dark and gets a <strong>DÜN</strong> stamp. If not, the card tells you when it really happened ("This happened last year") and you lose a life — you have <strong>4</strong>.'),
        L('Canın bitmeden dünün hepsini bul. Oyun bitince bütün kartlar ne zaman olduklarını gösterir. Her gün yeni bir tahta gelir.',
          'Find all of yesterday\'s before your lives run out. When the game ends, every card shows when it happened. A new board arrives every day.'),
      ].map(p).join('');
    }
    return '';
  }

  // ── The page ──
  // Stated here once, injected, so the four games cannot drift. It fills
  // the game window the way the board does: paper, the title on the back
  // arrow's own line, and the cross exactly where the button that opened
  // it stands, so the way in and the way out are the same place.
  function injectStyles() {
    if (document.getElementById('ist-game-help-styles')) return;
    const st = document.createElement('style');
    st.id = 'ist-game-help-styles';
    st.textContent = `
      .gh-btn {
        position: fixed; top: 10px; right: 14px; z-index: 200;
        width: 38px; height: 38px; padding: 0; border: 0; background: none;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .gh-btn img { width: 30px; height: 30px; display: block; }
      .gh-btn:hover { opacity: 0.6; }
      /* The game window's own paper (--frame-bg), not --paper: the
         sheet the game stands in is --frame-bg, and so is the strip at
         its foot where the logo overhangs the bottom bar (frames.css,
         "A game embedded in project.html's game sheet"). On --paper the
         page was a shade off that strip, which read as a band across
         the bottom with the text sliced off at its edge. */
      .gh-page {
        position: fixed; inset: 0; z-index: 1000;
        background: var(--frame-bg, var(--paper)); color: var(--ink);
        font-family: var(--font-ui);
        display: flex; flex-direction: column;
      }
      .gh-page[hidden] { display: none; }
      .gh-head {
        flex: none; position: relative; height: 58px;
        display: flex; align-items: center; justify-content: center;
      }
      .gh-head .ui-label { line-height: 38px; margin-top: 10px; }
      .gh-close {
        position: absolute; top: 10px; right: 14px;
        width: 38px; height: 38px; padding: 0; border: 0; background: none;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
      .gh-close img { width: 22px; height: 22px; display: block; }
      .gh-body {
        flex: 1 1 auto; min-height: 0; overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 6px 20px 40px;
        max-width: 560px; width: 100%; margin: 0 auto; box-sizing: border-box;
        /* What runs past the foot of the window dissolves into it rather
           than being cut through a line of type; the padding above is
           what lets the last line come to rest clear of the fade. */
        -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 28px), transparent);
        mask-image: linear-gradient(to bottom, #000 calc(100% - 28px), transparent);
      }
      .gh-body .ui-body { margin: 0 0 10px; }
      .gh-body .ui-h { margin: 4px 0 12px; }
      .gh-others {
        margin-top: 22px; padding-top: 16px;
        border-top: 1px solid var(--rule, rgba(0,0,0,0.15));
      }
      .gh-others .ui-label { display: block; margin-bottom: 12px; }
      .gh-other { margin-bottom: 14px; }
      .gh-other .ui-title { margin: 0 0 3px; }
      .gh-swatches { line-height: 1.9; }
      .gh-swatch {
        display: inline-block; width: 16px; height: 16px; vertical-align: -3px;
        border: 2px solid var(--ink); margin-right: 4px;
      }
      .gh-correct { background: var(--tile-correct, var(--ink)); border-color: var(--tile-correct, var(--ink)); }
      .gh-present { background: var(--tile-present, var(--ink-red)); border-color: var(--tile-present, var(--ink-red)); }
      .gh-absent { background: transparent; border-color: var(--tile-absent-ink, var(--muted)); opacity: 0.5; }
    `;
    document.head.appendChild(st);
  }

  let page = null;
  function render() {
    if (!page) return;
    const lang = en() ? 'en' : 'tr';
    const others = ORDER.filter(g => g !== CURRENT);
    page.querySelector('.gh-head .ui-label').textContent = L('Nasıl oynanır', 'How to play');
    page.querySelector('.gh-close').setAttribute('aria-label', L('Kapat', 'Close'));
    const body = page.querySelector('.gh-body');
    body.lang = lang;
    body.innerHTML =
      (CURRENT ? '<h2 class="ui-h" lang="tr">' + NAMES[CURRENT] + '</h2>' + longHTML(CURRENT) : '') +
      '<div class="gh-others">' +
        '<span class="ui-label ui-quiet">' + L('Diğer oyunlar', 'The other games') + '</span>' +
        others.map(g =>
          '<div class="gh-other"><p class="ui-title" lang="tr">' + NAMES[g] + '</p>' +
          '<p class="ui-sub">' + shortText(g) + '</p></div>').join('') +
      '</div>';
  }

  function build() {
    if (page) return page;
    injectStyles();
    page = document.createElement('div');
    page.className = 'gh-page';
    page.hidden = true;
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.innerHTML =
      '<div class="gh-head"><span class="ui-label"></span>' +
      '<button type="button" class="gh-close"><img src="assets/cross.png" alt=""></button></div>' +
      '<div class="gh-body"></div>';
    page.querySelector('.gh-close').addEventListener('click', close);
    document.body.appendChild(page);
    return page;
  }

  function open() {
    build();
    render();
    page.hidden = false;
    page.querySelector('.gh-body').scrollTop = 0;
  }
  function close() { if (page) page.hidden = true; }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && page && !page.hidden) close();
  });
  if (global.I18N && I18N.onChange) I18N.onChange(() => { if (page && !page.hidden) render(); });

  function mount() {
    injectStyles();
    let btn = document.getElementById('help-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'help-btn';
      btn.className = 'gh-btn';
      btn.innerHTML = '<img src="assets/question-mark.png" alt="">';
      document.body.appendChild(btn);
    }
    btn.setAttribute('aria-label', L('Nasıl oynanır', 'How to play'));
    btn.title = L('Nasıl oynanır', 'How to play');
    btn.addEventListener('click', (e) => { e.preventDefault(); open(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  global.IstGameHelp = { open, close };
})(window);
