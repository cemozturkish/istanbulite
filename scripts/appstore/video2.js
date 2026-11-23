// Deterministic App Preview capture: Chromium virtual time, one 2x screenshot per 1/30 s.
const {open}=require('./env');
const fs=require('fs');
const FPS=30, STEP=1000/FPS;
(async()=>{
  const out=__dirname+'/vid/vt'; fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
  const {browser,context,page,logs}=await open({time:'2026-11-24T11:00:00Z',scale:2,viewport:{width:430,height:932},insets:{top:59,bottom:34}});
  // touch indicator
  await page.addStyleTag({content:`.pv-dot{position:fixed;z-index:99999;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;
    background:rgba(255,255,255,.55);border:2px solid rgba(0,0,0,.35);box-shadow:0 2px 10px rgba(0,0,0,.25);pointer-events:none;
    transition:opacity .25s, transform .25s, top .55s cubic-bezier(.3,.7,.3,1), left .55s;}`});
  await page.evaluate(()=>{
    window.__dot=(x,y,mode,y2)=>{ const d=document.createElement('div'); d.className='pv-dot'; d.style.left=x+'px'; d.style.top=y+'px';
      d.style.opacity='0'; d.style.transform='scale(1.3)'; document.body.appendChild(d); d.getBoundingClientRect();
      d.style.opacity='1'; d.style.transform='scale(1)';
      if(mode==='drag'){ setTimeout(()=>{ d.style.top=y2+'px'; },120); setTimeout(()=>{ d.style.opacity='0'; },650); }
      else setTimeout(()=>{ d.style.opacity='0'; d.style.transform='scale(.8)'; },260);
      setTimeout(()=>d.remove(),1100); };
    window.__center=(el)=>{ const r=el.getBoundingClientRect(); return [r.left+r.width/2, r.top+r.height/2]; };
  });
  const cdp=await context.newCDPSession(page);
  await cdp.send('Emulation.setVirtualTimePolicy',{policy:'pause'});
  const adv=(ms)=>new Promise(res=>{ cdp.once('Emulation.virtualTimeBudgetExpired',res); cdp.send('Emulation.setVirtualTimePolicy',{policy:'advance',budget:ms}); });
  const ev=(fn,arg)=>page.evaluate(fn,arg).catch(e=>console.log('ERR',e.message.split('\n')[0]));
  const gframe=()=>page.frames().find(f=>/guncel/.test(f.url()));
  const tapSel=(sel,pred)=>ev(([sel,pred])=>{ const els=[...document.querySelectorAll(sel)]; const el=pred?els.find(x=>new RegExp(pred).test(x.textContent)):els[0];
      if(!el){ console.log('no el',sel); return; } const [x,y]=__center(el); __dot(x,y); setTimeout(()=>el.click(),180); },[sel,pred]);
  const T = [
    [1.0, ()=>ev(()=>{ __dot(215,330,'drag',560); setTimeout(()=>__fb.homeStop(-1),150); })],
    [3.6, ()=>tapSel('#fb-home-dots [data-d="beyoglu"]')],
    [6.6, ()=>tapSel('#fb-evcard button, #fb-evdrawer button','^(Gidiyorum|GİDİYORUM)')],
    [8.8, ()=>ev(()=>{ __dot(330,140); setTimeout(()=>__fb.closeHomeCard(),180); })],
    [10.2, ()=>ev(()=>{ __dot(215,560,'drag',330); setTimeout(()=>__fb.homeStop(0),150); })],
    [11.8, ()=>ev(()=>{ __dot(215,600,'drag',330); setTimeout(()=>__fb.homeStop(1),150); })],
    [14.6, ()=>tapSel('.fb-gbtn','Güncel')],
    [16.8, async()=>{ const f=gframe(); if(f) await f.evaluate(()=>{ const c=[...document.querySelectorAll('.gn-card')].find(x=>/Boğaz/.test(x.textContent)); c.click(); }).catch(()=>{}); }],
    [18.0, async()=>{ const f=gframe(); if(f) await f.evaluate(()=>{ const c=[...document.querySelectorAll('.gn-card')].find(x=>/Galata Köprüsü/.test(x.textContent)); c.click(); }).catch(()=>{}); }],
    [19.2, async()=>{ const f=gframe(); if(f) await f.evaluate(()=>{ const c=[...document.querySelectorAll('.gn-card')].find(x=>/Beyoğlu/.test(x.textContent)); c.click(); }).catch(()=>{}); }],
    [21.4, ()=>ev(()=>{ __dot(215,60); setTimeout(()=>{ const b=document.getElementById('fb-game-backdrop'); b && b.click(); },180); })],
    [22.8, ()=>ev(()=>{ __dot(215,560,'drag',330); setTimeout(()=>__fb.homeStop(0),150); })],
    [24.4, ()=>tapSel('#fb-logo-btn')],
  ];
  // per-frame tap dots inside the iframe are drawn from the parent at the card's position
  const iframeDot = async(txt)=>{ const f=gframe(); if(!f) return; const fe=await f.frameElement(); const box=await fe.boundingBox();
    const c=await f.evaluate((t)=>{ const el=[...document.querySelectorAll('.gn-card')].find(x=>new RegExp(t).test(x.textContent)); const r=el.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; },txt).catch(()=>null);
    if(c) await ev(([x,y])=>__dot(x,y),[box.x+c[0],box.y+c[1]]); };
  const DOTS=[[16.6,'Boğaz'],[17.8,'Galata Köprüsü'],[19.0,'Beyoğlu']];
  const END=27.6, N=Math.round(END*FPS);
  let ti=0, di=0; const t0=Date.now();
  for(let i=0;i<N;i++){
    const t=i/FPS;
    while(ti<T.length && T[ti][0]<=t){ await T[ti][1](); ti++; }
    while(di<DOTS.length && DOTS[di][0]<=t){ await iframeDot(DOTS[di][1]); di++; }
    await adv(STEP);
    await page.screenshot({path:`${out}/f${String(i).padStart(5,'0')}.png`});
    if(i%150===0) console.log('frame',i,'/',N, ((Date.now()-t0)/1000).toFixed(0)+'s');
  }
  console.log(logs.filter(l=>/PAGEERR/.test(l)).join('\n'));
  await browser.close();
})();
