const {open}=require('./env');
const W=430, H=932, INSETS={top:59,bottom:34};
const DAY='2026-11-24T11:00:00Z', NIGHT='2026-11-24T17:40:00Z';
const HEAD='#fb-evdrawer .fbl-head, #fb-evdrawer header, #fb-evdrawer [class*=head]';
const SCENES = {
  sehir: async(p)=>{ await p.evaluate(()=>__fb.homeStop(-1)); await p.waitForTimeout(2000); },
  petek: async(p)=>{ await p.waitForTimeout(500); },
  dosya: async(p)=>{ await p.evaluate(()=>__fb.homeStop(-1)); await p.waitForTimeout(1500);
    await p.evaluate(()=>document.querySelector('#fb-home-dots [data-d="beyoglu"]').click()); await p.waitForTimeout(3500); },
  ajanda: async(p)=>{ await p.evaluate(()=>__fb.homeStop(-1)); await p.waitForTimeout(1500);
    await p.click(HEAD); await p.waitForTimeout(2000); },
  plan: async(p)=>{ await p.evaluate(()=>__fb.homeStop(-1)); await p.waitForTimeout(1500);
    await p.click(HEAD); await p.waitForTimeout(1500);
    await p.click('#fb-evadd'); await p.waitForTimeout(1500);
    const ov = '#fb-plan-overlay';
    const inputs = await p.$$(ov+' input[type=text], '+ov+' input:not([type])');
    if (inputs[0]) await inputs[0].fill("Moda'da çay, belki tavla");
    if (inputs[1]) await inputs[1].fill('Moda Çay Bahçesi');
    await p.evaluate((ov)=>{
      const c=[...document.querySelectorAll(ov+' .ui-chip')].find(x=>/YARIN|Yarın/i.test(x.textContent)); c&&c.click();
      const t=document.querySelector(ov+' input[type=time]'); if(t){t.value='17:30'; t.dispatchEvent(new Event('input',{bubbles:true})); t.dispatchEvent(new Event('change',{bubbles:true})); t.type='text'; t.value='17:30';}
      document.activeElement && document.activeElement.blur();
    }, ov);
    await p.waitForTimeout(600); },
  oyunlar: async(p)=>{ await p.evaluate(()=>__fb.homeStop(1)); await p.waitForTimeout(3500); },
  guncel: async(p)=>{ await p.evaluate(()=>__fb.homeStop(1)); await p.waitForTimeout(2500);
    await p.evaluate(()=>[...document.querySelectorAll('.fb-gbtn')].find(x=>/Güncel/.test(x.textContent)).click());
    await p.waitForTimeout(4000);
    const f=p.frames().find(f=>/guncel/.test(f.url()));
    for (const t of ['Boğaz','Galata Köprüsü','Kapalıçarşı','Beyoğlu']) { await f.locator('.gn-card',{hasText:t}).click(); await p.waitForTimeout(1300); }
    await p.waitForTimeout(1500); },
  sozcel: async(p)=>{ await p.evaluate(()=>__fb.homeStop(1)); await p.waitForTimeout(2500);
    await p.evaluate(()=>[...document.querySelectorAll('.fb-gbtn')].find(x=>/Sözcel/.test(x.textContent)).click());
    await p.waitForTimeout(5000);
    const f=p.frames().find(f=>/sozcel/.test(f.url()));
    const key=async(t)=>{ await f.evaluate((t)=>{ const b=[...document.querySelectorAll('button.key')].find(x=>x.textContent.trim()===t); b&&b.click(); }, t); await p.waitForTimeout(140); };
    for (const w of ['KURAL','SAPAN']) { for (const ch of w) await key(ch); await key('GİR'); await p.waitForTimeout(2800); }
    await p.waitForTimeout(1500); },
  // Full-bleed, no chrome: the city with its two shores apart (the petek
  // stop's pose) and the week's drawer up from the bottom (the city stop's).
  kapanis: async(p)=>{
    await p.evaluate(()=>__fb.homeStop(0)); await p.waitForTimeout(1500);
    const pose = await p.evaluate(()=>({
      shores:[...document.querySelectorAll('.fbv-shore')].map(e=>e.style.transform),
      dots:[...document.querySelectorAll('#fb-home-dots > *')].map(e=>e.style.cssText) }));
    await p.evaluate(()=>__fb.homeStop(-1)); await p.waitForTimeout(1800);
    await p.evaluate((pose)=>{
      document.querySelectorAll('.fbv-shore').forEach((e,i)=>{ e.style.transition='none'; e.style.transform=pose.shores[i]; });
      document.querySelectorAll('#fb-home-dots > *').forEach((e,i)=>{ if (pose.dots[i]!=null) e.style.cssText=pose.dots[i]; });
      const st=document.createElement('style'); st.textContent=`
        #ist-pc-mount, #fb-levels, .section-rule > header, #fb-nav, #fb-home-games, #fb-planbtn { visibility: hidden !important; }
        #fb-petek { opacity: 0 !important; }
        /* room at the top for the title: the city and its marks step down */
        #fb-vmap, #fb-home-dots { translate: 0 235px; }`;
      document.head.appendChild(st);
      // only the drawer's head and tonight's evenings show
      const ev=document.getElementById('fb-evdrawer'); ev.style.translate='0 205px';
    }, pose);
    await p.waitForTimeout(600); },
  // The whole petek (the logo's), filling the screen with no bars.
  butunTam: async(p)=>{
    await p.evaluate(()=>{ const st=document.createElement('style'); st.textContent=`
        #ist-pc-mount, #fb-levels, .section-rule > header, #fb-nav { visibility: hidden !important; }
      `; document.head.appendChild(st); document.getElementById('fb-logo-btn').click(); });
    await p.waitForTimeout(3000);
    // Opened in its own window first (so the reader stays where the home
    // screen had them), then the window is let out to the screen's edges.
    await p.evaluate(()=>{ const st=document.createElement('style'); st.textContent='html .fb.fb-home-on #fb-map { top: 0 !important; bottom: 0 !important; }'; document.head.appendChild(st); window.dispatchEvent(new Event('resize')); });
    await p.waitForTimeout(2500);
    // room at the top for the title
    await p.evaluate(()=>{ const st=document.createElement('style'); st.textContent='#fb-map > .fb-petek { translate: 0 40px; }'; document.head.appendChild(st); });
    await p.waitForTimeout(300); },

  // Full-bleed: the city, and the "Nereye gidiyorsun?" sheet rising from
  // the bottom over it, part way up.
  planTam: async(p)=>{
    await p.evaluate(()=>__fb.homeStop(-1)); await p.waitForTimeout(1800);
    await p.evaluate(()=>{ const st=document.createElement('style'); st.textContent=
        '#ist-pc-mount, #fb-levels, .section-rule > header, #fb-nav, #fb-home-games { visibility: hidden !important; }' +
        '#fb-evdrawer { visibility: hidden !important; }' +
        '#fb-vmap, #fb-home-dots { translate: 0 120px; }' +
        '#fb-plan-overlay .ist-sheet-backdrop { opacity: 0 !important; }' +
        '#fb-plan-overlay .ist-sheet { translate: 0 var(--pt-drop, 400px); }';
      document.head.appendChild(st);
      document.getElementById('fb-evadd').click(); });
    await p.waitForTimeout(1500);
    const ov = '#fb-plan-overlay';
    const inputs = await p.$$(ov+' input[type=text], '+ov+' input:not([type])');
    if (inputs[0]) await inputs[0].fill("Moda'da çay, belki tavla");
    if (inputs[1]) await inputs[1].fill('Moda Çay Bahçesi');
    await p.evaluate((ov)=>{
      const c=[...document.querySelectorAll(ov+' .ui-chip')].find(x=>/YARIN|Yarın/i.test(x.textContent)); c&&c.click();
      const t=document.querySelector(ov+' input[type=time]'); if(t){t.value='17:30'; t.dispatchEvent(new Event('input',{bubbles:true})); t.type='text'; t.value='17:30';}
      document.activeElement && document.activeElement.blur();
      // stand the sheet's top a little under the middle of the screen
      const sh=document.querySelector(ov+' .ist-sheet');
      const cur=parseFloat((getComputedStyle(sh).translate||'0 0').split(' ')[1])||0;
      const top=sh.getBoundingClientRect().top - cur;
      document.documentElement.style.setProperty('--pt-drop', Math.round(430 - top)+'px');
    }, ov);
    await p.waitForTimeout(900); },

  butun: async(p)=>{ await p.click('#fb-logo-btn'); await p.waitForTimeout(3500); },
};
async function shoot(name, when, out, scale=3, palette='mono'){
  const time = when==='night'?NIGHT:DAY;
  const {browser,page,logs}=await open({time,scale,palette,viewport:{width:W,height:H},insets:INSETS});
  try { await SCENES[name](page); await page.screenshot({path:out}); }
  catch(e){ console.log('FAIL',name,when,e.message.split('\n')[0]); }
  const errs=logs.filter(l=>/PAGEERR/.test(l)); if(errs.length) console.log(name, errs.join('\n'));
  await browser.close();
}
module.exports={shoot,SCENES,W,H};
if (require.main===module) (async()=>{
  const [,,names='all',when='day',scale='1',pal='mono']=process.argv;
  const list = names==='all'?Object.keys(SCENES):names.split(',');
  await Promise.all(list.map(async n=>{ await shoot(n, when, `shots/${n}-${when}-${pal}.png`, +scale, pal); console.log('done',n); }));
})();
