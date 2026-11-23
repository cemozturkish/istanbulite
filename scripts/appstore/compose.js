const { chromium } = require('playwright');
const path = require('path');
const S = __dirname;
const OUT = process.argv[2] || S + '/out';
const MONO = '#383838', EARTH = '#574133';
const FRAMES = [
  { n:'01-disarida', img:'kapanis-day-mono', full:1, bg:'', closer:1, h:'İstanbul\'da|hayat dışarıda.', p:'Seni ekranda tutmak için değil, sokağa çıkarmak için.' },
  { n:'02-sehir', img:'sehir-day-mono', bar:MONO, bg:'', k:'Şehir', h:'Bu hafta|İstanbul\'da ne var?', p:'Haritayı aşağı çek: haftanın akşamları, semt semt.' },
  { n:'03-plan', img:'planTam-day-mono', full:1, bg:'', k:'Planlar', h:'Peteğindekilerle|paylaş.', p:'Nereye gittiğini yaz, peteğin görsün.' },
  { n:'04-bulusma', img:'dosya-day-mono', bar:MONO, bg:'dark', k:'Buluşmalar', h:'Bu akşam|kim geliyor?', p:'Bir akşamı aç; peteğin kimin geldiğini gösterir.' },
  { n:'05-petek', img:'butunTam-day-mono', full:1, bg:'', k:'Petek', h:'Takipçi yok, DM yok.|Elden ele büyüyen|bir petek.', p:'', hs:35 },
];
(async()=>{
  require('fs').mkdirSync(OUT,{recursive:true});
  const b = await chromium.launch();
  const pg = await (await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:3})).newPage();
  for (const f of FRAMES) {
    const q = new URLSearchParams({ img:'file://'+S+'/shots/'+f.img+'.png', bar:f.bar, bg:f.bg, k:f.k||'', h:f.h, p:f.p, logo:'file://'+S+'/logo-red.png' });
    if (f.closer) q.set('closer','1');
    if (f.hs) q.set('hs', String(f.hs));
    if (f.full) { q.set('full','1'); const {execSync}=require('child_process');
      q.set('g', execSync(`python3 -c "from PIL import Image; im=Image.open('${S}/shots/${f.img}.png').convert('RGB'); print('#%02x%02x%02x'%im.getpixel((im.width//2,6)))"`).toString().trim()); }
    await pg.goto('file://'+S+'/compose.html?'+q);
    await pg.evaluate(()=>document.fonts.ready);
    await pg.waitForFunction(()=>document.getElementById('shot').complete);
    await pg.waitForTimeout(200);
    await pg.screenshot({path: OUT+'/istanbulite-'+f.n+'.png'});
    console.log(f.n);
  }
  await b.close();
})();
