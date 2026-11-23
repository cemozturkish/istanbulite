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
