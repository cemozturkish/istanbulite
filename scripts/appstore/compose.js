const { chromium } = require('playwright');
const path = require('path');
const S = __dirname;
const OUT = process.argv[2] || S + '/out';
const MONO = '#383838', EARTH = '#574133';
const FRAMES = [
  { n:'01-sehir', img:'sehir-day-mono', bar:MONO, bg:'', k:'Şehir', h:'Bu hafta|İstanbul\'da ne var?', p:'Haritayı aşağı çek: haftanın akşamları, semt semt.' },
  { n:'02-bulusma', img:'dosya-day-mono', bar:MONO, bg:'dark', k:'Buluşmalar', h:'Bu akşam|kim geliyor?', p:'Bir akşamı aç; peteğin kimin geldiğini gösterir.' },
  { n:'03-petek', img:'petek-day-mono', bar:MONO, bg:'red', k:'Petek', h:'Yan yana|duranlar.', p:'Takipçi yok, DM yok. Elden ele büyüyen bir petek.' },
  { n:'04-ajanda', img:'ajanda-day-mono', bar:MONO, bg:'', k:'Ajanda', h:'Haftan,|tek sayfada.', p:'Gideceğin akşamlar ve kendi planların, gün gün.' },
  { n:'05-plan', img:'plan-day-mono', bar:MONO, bg:'dark', k:'Planlar', h:'Bir yere|gidiyorum.', p:'Planını yaz; kimin göreceğini sen seç.' },
  { n:'06-oyunlar', img:'oyunlar-day-mono', bar:MONO, bg:'', k:'Oyunlar', h:'Bu gece|kim ne yaptı?', p:'Yukarı it: peteğindekilerin skorları kendi altıgenlerinde.' },
  { n:'07-guncel', img:'guncel-day-mono', bar:MONO, bg:'dark', k:'Yeni oyun · Güncel', h:'Hangileri|dün oldu?', p:'Dokuz olaydan dördünü bul. Dört canın var.' },
  { n:'08-butun-petek', img:'butun-day-mono', bar:MONO, bg:'', k:'Bütün petek', h:'Logoya dokun,|hepsini gör.', p:'Peteğindeki herkes, tek ekranda.' },
  { n:'09-disarida', img:'sehir-day-mono', bar:MONO, bg:'dark', closer:1, h:'Hayat|dışarıda.', p:'Seni ekranda tutmak için değil, sokağa çıkarmak için.' },
];
(async()=>{
  require('fs').mkdirSync(OUT,{recursive:true});
  const b = await chromium.launch();
  const pg = await (await b.newContext({viewport:{width:430,height:932},deviceScaleFactor:3})).newPage();
  for (const f of FRAMES) {
    const q = new URLSearchParams({ img:'file://'+S+'/shots/'+f.img+'.png', bar:f.bar, bg:f.bg, k:f.k||'', h:f.h, p:f.p, logo:'file://'+S+'/logo-red.png' });
    if (f.closer) q.set('closer','1');
    await pg.goto('file://'+S+'/compose.html?'+q);
    await pg.evaluate(()=>document.fonts.ready);
    await pg.waitForFunction(()=>document.getElementById('shot').complete);
    await pg.waitForTimeout(200);
    await pg.screenshot({path: OUT+'/istanbulite-'+f.n+'.png'});
    console.log(f.n);
  }
  await b.close();
})();
