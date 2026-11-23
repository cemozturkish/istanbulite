const { chromium } = require('playwright');
const { install, UID } = require('./harness');
const F = require('./fixtures');
const UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
function buildDb(seed, opts={}){
  const evs=[...F.events(),...F.plans()];
  const lineup = opts.lineup || ['sozcel','guncel'];
  return {
    db:{
      profiles:F.profiles(), profiles_public:F.profiles(),
      neighborhoods:Object.entries(F.NB).map(([id,name_tr])=>({id,name_tr})),
      events:evs,
      event_rsvps:['000000000002','000000000003','000000000005','000000000006','000000000102'].map(x=>({event_id:'33333333-3333-4333-8333-'+x,user_id:UID})),
      event_interest:['000000000002','000000000003','000000000005','000000000006','000000000102'].map(x=>({event_id:'33333333-3333-4333-8333-'+x,user_id:UID,verdict:'yes'})),
      game_results:F.gameResults(seed).concat(opts.myResults||[]),
      game_night_slots:lineup.map((g,i)=>({game_date:opts.night,slot:i,game:g})),
      game_day_toggles:[], app_settings:[{key:'onboarding_enabled',value:false}],
      sozcel_sozcul_assignments:[], card_title_font_sizes:[], site_palette:[], onboarding_copy:[],
      news_dealt:[], game_state:[], sozcel_used_answers:[], guncel_puzzles: require('./guncel')(opts.night),
    },
    rpc:{
      hive_map:F.hiveMap(), hive_hidden_cells:[],
      plan_reach_counts:[{petek:6,petek2:14,istanbul:18}],
      hive_event_rsvp_status:(b)=>{
        const e=(b.p_event_ids||[])[0]; const P=F.people;
        const map={'33333333-3333-4333-8333-000000000001':[0,2,5,9],'33333333-3333-4333-8333-000000000002':[0,3,4,6],'33333333-3333-4333-8333-000000000003':[2,1,10]};
        return (map[e]||[1,4]).map(i=>({member_id:P[i].id,event_id:e}));
      },
      hive_event_interest_status:(b)=>{
        const e=(b.p_event_ids||[])[0]; const P=F.people;
        return [1,7].map(i=>({member_id:P[i].id,event_id:e,verdict:'no'}));
      },
      hive_member_status:[], sozcel_pool_count:12, sozcel_daily_word:(b)=>[{word:'VAPUR',definition:'Buharla ya da motorla işleyen, yolcu taşıyan gemi.',syllables:null,sozcul_id:null,used_on:b.p_night}],
    }
  };
}
async function open({time, palette='mono', lang='tr', opts={}, video=null, scale=3, viewport={width:430,height:932}}){
  const browser=await chromium.launch({args:['--lang=tr-TR']});
  const ctxOpts={viewport,deviceScaleFactor:scale,isMobile:true,hasTouch:true,userAgent:UA,locale:'tr-TR',timezoneId:'Europe/Istanbul'};
  if(video) ctxOpts.recordVideo={dir:video.dir,size:video.size};
  const context=await browser.newContext(ctxOpts);
  const d=new Date(time); const ist=new Date(d.getTime()+3*3600e3);
  const night = ist.toISOString().slice(0,10);
  const seed = `${ist.getUTCFullYear()}-${ist.getUTCMonth()+1}-${ist.getUTCDate()}`;
  const {db,rpc}=buildDb(seed,{...opts,night});
  db.profiles[0].palette_pref=palette; db.profiles[0].language_pref=lang;
  const logs=[];
  await install(context,db,rpc,s=>logs.push(s));
  await context.addInitScript(([p,l])=>{ try{localStorage.setItem('istanbulite_palette_pref',p); localStorage.setItem('istanbulite_lang',l); localStorage.setItem('ist_lang',l);}catch(e){} },[palette,lang]);
  const page=await context.newPage();
  await page.clock.install({time:d});
  page.on('pageerror',e=>logs.push('PAGEERR '+e.message));
  page.on('console',m=>{ if(m.type()==='error') logs.push('CONSOLE '+m.text().slice(0,200)); });
  await page.goto('http://127.0.0.1:8765/project.html');
  await page.waitForFunction(()=>window.__fb&&window.__fb.ready,null,{timeout:30000});
  await page.waitForTimeout(3500);
  return {browser,context,page,logs,db};
}
module.exports={open};
